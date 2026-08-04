import os
import shutil
import re
from pathlib import Path
from typing import Optional, Tuple
from sqlmodel import Session
from app.models.schemas import Meeting
from app.core.config import STORAGE_DIR

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".webm", ".ogg", ".flac"}

STORAGE_ROOT = STORAGE_DIR
CHUNKS_ROOT = STORAGE_ROOT / "chunks"


def get_safe_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and handle invalid chars."""
    base_name = os.path.basename(filename)
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    if not safe_name:
        safe_name = "audio_recording"
    return safe_name


def validate_extension(filename: str) -> bool:
    """Ensure the file has an approved audio extension."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


async def save_chunk_and_try_assemble(
    db: Session,
    upload_id: str,
    chunk_index: int,
    total_chunks: int,
    filename: str,
    file_bytes: bytes,
    title: Optional[str] = None
) -> Tuple[str, int, Optional[int], str]:
    """
    Saves an incoming audio chunk. When the final chunk arrives, reassembles the original
    audio file, stores a Meeting entry in SQLite, and purges temporary chunk storage.
    
    Returns: (status, progress_percent, meeting_id, message)
    """
    if not validate_extension(filename):
        raise ValueError(
            f"Invalid file type for '{filename}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Secure clean names and folders
    safe_upload_id = re.sub(r"[^a-zA-Z0-9_-]", "", upload_id)
    if not safe_upload_id:
        raise ValueError("Invalid upload ID format.")
        
    chunk_dir = CHUNKS_ROOT / safe_upload_id
    chunk_dir.mkdir(parents=True, exist_ok=True)
    
    # Write current slice
    chunk_path = chunk_dir / f"chunk_{chunk_index}"
    with open(chunk_path, "wb") as f:
        f.write(file_bytes)
        
    # Check if all chunks have been received
    received_chunks = len([p for p in chunk_dir.iterdir() if p.name.startswith("chunk_")])
    progress = int((received_chunks / total_chunks) * 100)
    
    if received_chunks < total_chunks:
        return "uploading", progress, None, f"Chunk {chunk_index + 1}/{total_chunks} stored successfully."
    
    # All chunks received! Reassemble sequential slices
    safe_name = get_safe_filename(filename)
    
    # Create preliminary meeting record to acquire ID
    meeting_title = title if title and title.strip() else f"Meeting ({safe_name})"
    meeting = Meeting(title=meeting_title, status="QUEUED")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    final_audio_path = STORAGE_ROOT / f"audio_{meeting.id}_{safe_name}"
    
    try:
        with open(final_audio_path, "wb") as out_file:
            for i in range(total_chunks):
                expected_slice = chunk_dir / f"chunk_{i}"
                if not expected_slice.exists():
                    raise FileNotFoundError(f"Missing slice chunk_{i} during reassembly.")
                with open(expected_slice, "rb") as in_slice:
                    shutil.copyfileobj(in_slice, out_file)
        
        # Update meeting record with reassembled audio path
        meeting.audio_file_path = str(final_audio_path)
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
    finally:
        # Guarantee cleanup of chunk staging folder
        if chunk_dir.exists():
            shutil.rmtree(chunk_dir, ignore_errors=True)
            
    return "complete", 100, meeting.id, "Audio file reassembled successfully and queued for processing."
