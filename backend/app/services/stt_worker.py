import os
import logging
from pathlib import Path
from typing import Optional, Any
from sqlmodel import Session
from app.models.database import engine as default_engine
from app.models.schemas import Task, Meeting
from app.services.mom_synthesizer import synthesize_mom_sync
from app.services.nim_client import get_hf_token
from app.core.config import STORAGE_DIR

logger = logging.getLogger(__name__)

def align_speakers(whisper_segments, pyannote_diarization):
    aligned_lines = []
    for seg in whisper_segments:
        start = seg["start"]
        end = seg["end"]
        text = seg["text"]
        
        speaker_overlaps = {}
        for turn, _, speaker in pyannote_diarization.itertracks(yield_label=True):
            overlap = max(0, min(end, turn.end) - max(start, turn.start))
            if overlap > 0:
                speaker_overlaps[speaker] = speaker_overlaps.get(speaker, 0) + overlap
                
        dominant_speaker = "Speaker"
        if speaker_overlaps:
            dominant_speaker = max(speaker_overlaps.items(), key=lambda x: x[1])[0]
            
        aligned_lines.append(f"[{start:.1f}s - {end:.1f}s] {dominant_speaker}: {text}")
    return aligned_lines

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
            
            # Step 2: Run faster-whisper INT8 local STT engine with dynamic accuracy selector and vocabulary biasing
            from app.services.settings_service import get_stt_settings
            stt_opts = get_stt_settings(db)
            chosen_model = stt_opts.get("model_size", "large-v3-turbo")
            vocab_hint = stt_opts.get("custom_vocabulary", "").strip()
            
            initial_prompt_str = (
                f"Berikut adalah rekaman rapat bisnis Product Manager dengan daftar istilah teknis dan kosakata kunci: {vocab_hint}."
                if vocab_hint else None
            )
            logger.info(f"Starting local INT8 transcription for meeting {meeting_id} using model '{chosen_model}' ({meeting.audio_file_path})")
            
            if mock_model:
                segments, info = mock_model.transcribe(meeting.audio_file_path, beam_size=5, initial_prompt=initial_prompt_str)
            else:
                from faster_whisper import WhisperModel
                # INT8 quantization on CPU ensures total data privacy and keeps RAM usage well under 16GB limit
                model = WhisperModel(model_size_or_path=chosen_model, device="cpu", compute_type="int8")
                segments, info = model.transcribe(meeting.audio_file_path, beam_size=5, initial_prompt=initial_prompt_str)
                
            total_duration = getattr(info, "duration", 0) or 1
            raw_segments = []
            last_reported_progress = 10
            
            for segment in segments:
                text = segment.text.strip()
                if text:
                    raw_segments.append({"start": segment.start, "end": segment.end, "text": text})
                
                # Calculate progress scaling between 10% and 60% during STT segment looping
                if total_duration > 0:
                    prog = int((segment.end / total_duration) * 50) + 10
                    prog = min(60, max(10, prog))
                    if prog >= last_reported_progress + 5:
                        task.progress_percent = prog
                        db.add(task)
                        db.commit()
                        last_reported_progress = prog
                        
            transcript_lines = []
            
            # Step 2.5: Optional Speaker Diarization with pyannote
            hf_token = get_hf_token(db)
            if hf_token and raw_segments and not mock_model:
                try:
                    logger.info("Running Pyannote Speaker Diarization...")
                    task.status = "DIARIZING"
                    task.progress_percent = 70
                    db.add(task)
                    db.commit()
                    
                    from pyannote.audio import Pipeline
                    try:
                        pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
                    except TypeError:
                        pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", token=hf_token)
                    
                    # Convert device mapping safely (pyannote might prefer cpu)
                    import torch
                    pipeline.to(torch.device("cpu"))
                    
                    diarization = pipeline(meeting.audio_file_path)
                    transcript_lines = align_speakers(raw_segments, diarization)
                except Exception as py_err:
                    import traceback
                    err_trace = traceback.format_exc()
                    logger.error(f"Pyannote diarization failed, falling back to raw: {py_err}")
                    transcript_lines = [
                        "⚠️ [SYSTEM NOTICE: Speaker Diarization Failed. Falling back to raw STT.]",
                        f"⚠️ [DEBUG TRACE]:\n{err_trace}\n",
                        "--------------------------------------------------\n"
                    ]
                    transcript_lines.extend([f"[{s['start']:.1f}s - {s['end']:.1f}s] {s['text']}" for s in raw_segments])
            else:
                transcript_lines = [f"[{s['start']:.1f}s - {s['end']:.1f}s] {s['text']}" for s in raw_segments]
                
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
