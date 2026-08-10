import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select, desc, col

from app.models.database import get_session
from app.models.schemas import (
    HealthResponse, BYOKSettingsRequest, BYOKSettingsResponse,
    ChunkUploadResponse, Task, TaskResponse, Meeting, MeetingResponse,
    STTSettingsRequest, STTSettingsResponse, ActionResponse,
    ChatRequest, ChatResponse
)
from app.services.nim_client import get_byok_key, save_byok_key, mask_api_key, verify_nvidia_nim_connection, get_hf_token, save_hf_token
from app.services.upload_service import save_chunk_and_try_assemble
from app.services.stt_worker import run_stt_task
from app.services.mom_synthesizer import synthesize_mom_async
from app.services.settings_service import get_stt_settings, save_stt_settings
from app.services.vector_db import search_meetings
from openai import AsyncOpenAI
from app.core.config import NVIDIA_NIM_BASE_URL, DEFAULT_NIM_MODEL
api_router = APIRouter(prefix="/api")

@api_router.get("/settings/stt", response_model=STTSettingsResponse)
def read_stt_settings(session: Session = Depends(get_session)):
    """Retrieve current local CPU STT resolution preferences and vocabulary biasing hints."""
    opts = get_stt_settings(session)
    return STTSettingsResponse(**opts, message="STT settings retrieved successfully.")

@api_router.post("/settings/stt", response_model=STTSettingsResponse)
def update_stt_settings(payload: STTSettingsRequest, session: Session = Depends(get_session)):
    """Update STT resolution model and custom vocabulary biasing hints."""
    save_stt_settings(
        session=session,
        model_size=payload.model_size,
        custom_vocabulary=payload.custom_vocabulary or "",
        default_language=payload.default_language or "English",
        default_style=payload.default_style or "General Executive MoM"
    )
    opts = get_stt_settings(session)
    return STTSettingsResponse(**opts, message="STT accuracy and vocabulary settings saved successfully.")

@api_router.get("/health", response_model=HealthResponse)
def get_health_status():
    """Service readiness and liveliness probe endpoint."""
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc))


@api_router.get("/settings/byok", response_model=BYOKSettingsResponse)
def check_byok_status(session: Session = Depends(get_session)):
    """Check if a BYOK API key and HF token have been securely registered on the server."""
    key = get_byok_key(session)
    hf_token = get_hf_token(session)
    
    return BYOKSettingsResponse(
        is_set=bool(key),
        preview=mask_api_key(key) if key else None,
        hf_is_set=bool(hf_token),
        hf_preview=mask_api_key(hf_token) if hf_token else None,
        message="Settings retrieved successfully."
    )

@api_router.post("/settings/byok", response_model=BYOKSettingsResponse)
async def update_byok_token(
    payload: BYOKSettingsRequest,
    session: Session = Depends(get_session)
):
    """Validate and securely register a new NVIDIA NIM BYOK API token and/or HF token into server SQLite storage."""
    api_key = payload.api_key.strip() if payload.api_key else None
    hf_token = payload.hf_token.strip() if payload.hf_token else None
    
    # Test valid connection before committing to persistent DB
    if api_key:
        await verify_nvidia_nim_connection(api_key)
        save_byok_key(session, api_key)
        
    if hf_token:
        save_hf_token(session, hf_token)
        
    current_key = get_byok_key(session)
    current_hf = get_hf_token(session)
    
    return BYOKSettingsResponse(
        is_set=bool(current_key),
        preview=mask_api_key(current_key) if current_key else None,
        hf_is_set=bool(current_hf),
        hf_preview=mask_api_key(current_hf) if current_hf else None,
        message="Tokens saved securely."
    )

@api_router.post("/upload/chunk", response_model=ChunkUploadResponse)
async def upload_audio_chunk(
    background_tasks: BackgroundTasks,
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    title: str = Form(None),
    output_language: str = Form("English"),
    meeting_style: str = Form("General Executive MoM"),
    file_chunk: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Receive a slice of an audio file and reassemble upon receipt of the final chunk."""
    try:
        content_bytes = await file_chunk.read()
        status_code, progress, meeting_id, msg = await save_chunk_and_try_assemble(
            db=session,
            upload_id=upload_id,
            chunk_index=chunk_index,
            total_chunks=total_chunks,
            filename=filename,
            file_bytes=content_bytes,
            title=title,
            output_language=output_language,
            meeting_style=meeting_style
        )
        
        task_id = None
        if status_code == "complete" and meeting_id is not None:
            # Initialize async STT worker task in background to avoid Nginx 504 Gateway Timeout
            task_id = str(uuid.uuid4())
            new_task = Task(id=task_id, meeting_id=meeting_id, status="QUEUED", progress_percent=0)
            session.add(new_task)
            session.commit()
            
            background_tasks.add_task(run_stt_task, task_id, meeting_id)
            msg = "Audio reassembled successfully. STT background worker initialized."

        return ChunkUploadResponse(
            status=status_code,
            progress_percent=progress,
            meeting_id=meeting_id,
            task_id=task_id,
            message=msg
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chunk processing failed: {str(e)}")

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task_status(task_id: str, session: Session = Depends(get_session)):
    """Poll asynchronous background task progress and status without gateway timeouts."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task ID '{task_id}' not found.")
    return TaskResponse(
        task_id=task.id,
        meeting_id=task.meeting_id,
        progress_percent=task.progress_percent,
        status=task.status,
        error_message=task.error_message
    )

@api_router.get("/meetings", response_model=List[MeetingResponse])
def list_meetings(search: Optional[str] = Query(None), session: Session = Depends(get_session)):
    """Retrieve all processed meetings with optional real-time keyword search across titles and MoM summaries."""
    query = select(Meeting).order_by(desc(Meeting.created_at))
    meetings = session.exec(query).all()
    
    results = []
    search_term = (search.strip().lower()) if search else ""
    
    for meeting in meetings:
        # If keyword search is specified, filter matching titles or MoM text
        if search_term:
            title_match = search_term in (meeting.title or "").lower()
            mom_match = search_term in (meeting.mom_data or "").lower()
            if not (title_match or mom_match):
                continue
                
        results.append(MeetingResponse(
            id=meeting.id,
            title=meeting.title,
            status=meeting.status,
            audio_file_path=meeting.audio_file_path,
            transcript_text=None,  # keep list payload lightweight
            mom_data=meeting.mom_data,
            output_language=getattr(meeting, "output_language", "English") or "English",
            meeting_style=getattr(meeting, "meeting_style", "General Executive MoM") or "General Executive MoM",
            is_audio_archived=getattr(meeting, "is_audio_archived", False) or False,
            created_at=meeting.created_at
        ))
    return results

@api_router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
def get_meeting_details(meeting_id: int, session: Session = Depends(get_session)):
    """Retrieve full meeting details, transcript text, and generated MoM markdown."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    transcript_content = None
    if meeting.transcript_file_path and os.path.exists(meeting.transcript_file_path):
        try:
            with open(meeting.transcript_file_path, "r", encoding="utf-8") as f:
                transcript_content = f.read()
        except Exception as e:
            transcript_content = f"[Error reading transcript file: {str(e)}]"
            
    return MeetingResponse(
        id=meeting.id,
        title=meeting.title,
        status=meeting.status,
        audio_file_path=meeting.audio_file_path,
        transcript_text=transcript_content,
        mom_data=meeting.mom_data,
        output_language=getattr(meeting, "output_language", "English") or "English",
        meeting_style=getattr(meeting, "meeting_style", "General Executive MoM") or "General Executive MoM",
        is_audio_archived=getattr(meeting, "is_audio_archived", False) or False,
        created_at=meeting.created_at
    )

@api_router.post("/meetings/{meeting_id}/synthesize", response_model=MeetingResponse)
async def trigger_mom_synthesis(
    meeting_id: int, 
    background_tasks: BackgroundTasks,
    style: Optional[str] = Query(None, description="Optional style override for synthesis"), 
    session: Session = Depends(get_session)
):
    """Manually trigger or retry NVIDIA Nemotron-3 executive MoM synthesis with an optional style in the background."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    # Override meeting style for this synthesis if provided
    if style:
        meeting.meeting_style = style
    
    meeting.status = "SYNTHESIZING"
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    
    async def background_synthesis_task(m_id: int):
        from app.models.database import engine
        from sqlmodel import Session
        import logging
        
        with Session(engine) as db:
            bg_meeting = db.get(Meeting, m_id)
            if not bg_meeting: return
            try:
                await synthesize_mom_async(db, bg_meeting)
                if bg_meeting.status == "SYNTHESIZING":
                    bg_meeting.status = "DONE"
                    db.add(bg_meeting)
                    db.commit()
            except Exception as e:
                logging.error(f"Background Synthesis Error: {e}")
                bg_meeting.status = "ERROR"
                db.add(bg_meeting)
                db.commit()
                
    background_tasks.add_task(background_synthesis_task, meeting.id)
    return get_meeting_details(meeting_id, session)

@api_router.get("/meetings/{meeting_id}/audio", response_class=FileResponse)
def stream_meeting_audio(meeting_id: int, session: Session = Depends(get_session)):
    """Stream the locally processed meeting audio file for PM playback review."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    if not meeting.audio_file_path or not os.path.exists(meeting.audio_file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file has been purged or is not found on server storage.")
        
    return FileResponse(
        path=meeting.audio_file_path,
        filename=os.path.basename(meeting.audio_file_path),
        media_type="audio/mpeg"
    )

@api_router.delete("/meetings/{meeting_id}/audio_only", response_model=ActionResponse)
def purge_meeting_audio(meeting_id: int, session: Session = Depends(get_session)):
    """Smart Archive: Delete heavy raw audio file from disk to conserve server storage while preserving MoM text."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    if meeting.audio_file_path and os.path.exists(meeting.audio_file_path):
        try:
            os.remove(meeting.audio_file_path)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not remove audio file: {str(e)}")
            
    meeting.is_audio_archived = True
    meeting.audio_file_path = None
    session.add(meeting)
    session.commit()
    
    return ActionResponse(success=True, message="Audio file purged successfully. Disk space reclaimed!")

@api_router.delete("/meetings/{meeting_id}", response_model=ActionResponse)
def delete_entire_meeting(meeting_id: int, session: Session = Depends(get_session)):
    """Permanently remove a meeting record and all associated disk files (audio and transcript)."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    if meeting.audio_file_path and os.path.exists(meeting.audio_file_path):
        try:
            os.remove(meeting.audio_file_path)
        except Exception:
            pass
            
    if meeting.transcript_file_path and os.path.exists(meeting.transcript_file_path):
        try:
            os.remove(meeting.transcript_file_path)
        except Exception:
            pass
            
    # Remove associated tasks to keep DB clean
    tasks = session.exec(select(Task).where(Task.meeting_id == meeting_id)).all()
    for t in tasks:
        session.delete(t)
        
    session.delete(meeting)
    session.commit()
    
    return ActionResponse(success=True, message="Meeting record and all associated files deleted completely.")

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_meetings(request: ChatRequest, session: Session = Depends(get_session)):
    """RAG Chat endpoint: search vector db and synthesize an answer."""
    byok_key = get_byok_key(session)
    if not byok_key:
        raise HTTPException(status_code=403, detail="NVIDIA NIM API key is not configured.")
        
    chunks = search_meetings(request.query, top_k=5, meeting_id=request.meeting_id)
    
    if not chunks:
        return ChatResponse(
            answer="Saya tidak menemukan informasi relevan dalam riwayat rapat untuk menjawab pertanyaan ini.",
            context_chunks_used=0
        )
        
    context_text = "\n\n".join([f"[Source: {c['metadata'].get('type', 'unknown')}] {c['document']}" for c in chunks])
    
    system_prompt = (
        "You are an AI assistant for a Product Manager. Answer the user's question based strictly on the provided meeting excerpts context. "
        "If the answer is not in the context, explicitly say you do not know. "
        "Answer in formal, professional Bahasa Indonesia unless requested otherwise. "
        "Use markdown formatting. Cite the source if helpful."
    )
    
    try:
        client = AsyncOpenAI(api_key=byok_key, base_url=NVIDIA_NIM_BASE_URL)
        response = await client.chat.completions.create(
            model=DEFAULT_NIM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {request.query}"}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        answer = response.choices[0].message.content.strip()
        return ChatResponse(answer=answer, context_chunks_used=len(chunks))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")
