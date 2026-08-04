import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.models.database import get_session
from app.models.schemas import HealthResponse, BYOKSettingsRequest, BYOKSettingsResponse, ChunkUploadResponse, Task, TaskResponse, Meeting, MeetingResponse
from app.services.nim_client import get_byok_key, save_byok_key, mask_api_key, verify_nvidia_nim_connection
from app.services.upload_service import save_chunk_and_try_assemble
from app.services.stt_worker import run_stt_task
from app.services.mom_synthesizer import synthesize_mom_async

api_router = APIRouter(prefix="/api")

@api_router.get("/health", response_model=HealthResponse)
def get_health_status():
    """Service readiness and liveliness probe endpoint."""
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc))


@api_router.get("/settings/byok", response_model=BYOKSettingsResponse)
def check_byok_status(session: Session = Depends(get_session)):
    """Check if a BYOK API key has been securely registered on the server."""
    key = get_byok_key(session)
    if key:
        return BYOKSettingsResponse(
            is_set=True,
            preview=mask_api_key(key),
            message="NVIDIA NIM BYOK token is actively registered."
        )
    return BYOKSettingsResponse(
        is_set=False,
        preview=None,
        message="No BYOK key configured. Please input your NVIDIA NIM API token."
    )

@api_router.post("/settings/byok", response_model=BYOKSettingsResponse)
async def update_byok_token(
    payload: BYOKSettingsRequest,
    session: Session = Depends(get_session)
):
    """Validate and securely register a new NVIDIA NIM BYOK API token into server SQLite storage."""
    api_key = payload.api_key.strip()
    
    # Test valid connection before committing to persistent DB
    await verify_nvidia_nim_connection(api_key)
    
    # Save securely
    save_byok_key(session, api_key)
    
    return BYOKSettingsResponse(
        is_set=True,
        preview=mask_api_key(api_key),
        message="NVIDIA NIM token verified and saved securely."
    )

@api_router.post("/upload/chunk", response_model=ChunkUploadResponse)
async def upload_audio_chunk(
    background_tasks: BackgroundTasks,
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    title: str = Form(None),
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
            title=title
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
        created_at=meeting.created_at
    )

@api_router.post("/meetings/{meeting_id}/synthesize", response_model=MeetingResponse)
async def trigger_mom_synthesis(meeting_id: int, session: Session = Depends(get_session)):
    """Manually trigger or retry NVIDIA Nemotron-3 executive MoM synthesis."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    try:
        await synthesize_mom_async(session, meeting)
        session.refresh(meeting)
        return get_meeting_details(meeting_id, session)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Synthesis failed: {str(e)}")

@api_router.get("/meetings/{meeting_id}/audio", response_class=FileResponse)
def stream_meeting_audio(meeting_id: int, session: Session = Depends(get_session)):
    """Stream the locally processed meeting audio file for PM playback review."""
    meeting = session.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Meeting #{meeting_id} not found.")
        
    if not meeting.audio_file_path or not os.path.exists(meeting.audio_file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found on server storage.")
        
    return FileResponse(
        path=meeting.audio_file_path,
        filename=os.path.basename(meeting.audio_file_path),
        media_type="audio/mpeg"
    )
