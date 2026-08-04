import os
import logging
from pathlib import Path
from typing import Optional, Any
from sqlmodel import Session
from app.models.database import engine as default_engine
from app.models.schemas import Task, Meeting
from app.services.mom_synthesizer import synthesize_mom_sync
from app.core.config import STORAGE_DIR

logger = logging.getLogger(__name__)

def run_stt_task(
    task_id: str,
    meeting_id: int,
    db_engine: Optional[Any] = None,
    mock_model: Optional[Any] = None,
    mock_nim_client: Optional[Any] = None
) -> None:
    """
    Background worker that runs faster-whisper INT8 transcription without blocking HTTP requests.
    Updates SQLite DB progress in real-time to avoid Nginx/Cloudflare 504 Gateway Timeouts.
    """
    engine_to_use = db_engine or default_engine
    
    with Session(engine_to_use) as db:
        task = db.get(Task, task_id)
        meeting = db.get(Meeting, meeting_id)
        
        if not task or not meeting:
            logger.error(f"STT Worker aborted: missing task {task_id} or meeting {meeting_id}")
            return

        try:
            # Step 1: Update status to active STT processing
            task.status = "PROCESSING"
            task.progress_percent = 10
            meeting.status = "TRANSCRIBING"
            db.add(task)
            db.add(meeting)
            db.commit()
            
            if not meeting.audio_file_path or not os.path.exists(meeting.audio_file_path):
                raise FileNotFoundError(f"Audio recording file missing at: {meeting.audio_file_path}")
            
            # Step 2: Run faster-whisper INT8 local STT engine
            logger.info(f"Starting local INT8 transcription for meeting {meeting_id} ({meeting.audio_file_path})")
            
            if mock_model:
                segments, info = mock_model.transcribe(meeting.audio_file_path, beam_size=5)
            else:
                from faster_whisper import WhisperModel
                # INT8 quantization on CPU ensures total data privacy and keeps RAM usage well under 16GB
                model = WhisperModel(model_size_or_path="base", device="cpu", compute_type="int8")
                segments, info = model.transcribe(meeting.audio_file_path, beam_size=5)
                
            total_duration = getattr(info, "duration", 0) or 1
            transcript_lines = []
            last_reported_progress = 10
            
            for segment in segments:
                text = segment.text.strip()
                if text:
                    transcript_lines.append(f"[{segment.start:.1f}s - {segment.end:.1f}s] {text}")
                
                # Calculate progress scaling between 10% and 90% during STT segment looping
                if total_duration > 0:
                    prog = int((segment.end / total_duration) * 80) + 10
                    prog = min(90, max(10, prog))
                    if prog >= last_reported_progress + 10:
                        task.progress_percent = prog
                        db.add(task)
                        db.commit()
                        last_reported_progress = prog
                        
            # Step 3: Save generated transcript text to storage disk
            full_transcript = "\n".join(transcript_lines) if transcript_lines else "[No clear speech detected in audio recording.]"
            storage_dir = STORAGE_DIR
            storage_dir.mkdir(parents=True, exist_ok=True)
            
            transcript_path = storage_dir / f"transcript_{meeting_id}.txt"
            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(full_transcript)
                
            meeting.transcript_file_path = str(transcript_path)
            
            # Step 4: Invoke Nemotron-3 MoM synthesis before marking DONE
            task.progress_percent = 90
            task.status = "SYNTHESIZING"
            meeting.status = "SYNTHESIZING"
            db.add(task)
            db.add(meeting)
            db.commit()
            
            try:
                synthesize_mom_sync(db, meeting, mock_client=mock_nim_client)
                task.progress_percent = 100
                task.status = "DONE"
                meeting.status = "DONE"
            except Exception as synth_err:
                logger.error(f"MoM synthesis failed during background pipeline: {synth_err}")
                task.status = "ERROR"
                task.error_message = f"STT completed, but AI synthesis failed: {str(synth_err)}"
                meeting.status = "ERROR"
            
            db.add(task)
            db.add(meeting)
            db.commit()
            logger.info(f"STT worker successfully completed task {task_id} for meeting {meeting_id}")

        except Exception as e:
            logger.exception(f"STT worker failed for task {task_id}: {str(e)}")
            task.status = "ERROR"
            task.error_message = str(e)
            meeting.status = "ERROR"
            db.add(task)
            db.add(meeting)
            try:
                db.commit()
            except Exception:
                db.rollback()
