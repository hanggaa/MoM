from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from pydantic import BaseModel

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

# ==================== Database Models (SQLModel) ====================

class AppSettings(SQLModel, table=True):
    """Store sensitive application configuration like BYOK NVIDIA API tokens server-side."""
    key_name: str = Field(primary_key=True)
    key_value: str
    updated_at: datetime = Field(default_factory=get_utc_now)

class Meeting(SQLModel, table=True):
    """Store meeting recording metadata and transcription status."""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    audio_file_path: Optional[str] = None
    transcript_file_path: Optional[str] = None
    mom_data: Optional[str] = None
    status: str = Field(default="QUEUED")  # QUEUED, PROCESSING, TRANSCRIBING, DONE, ERROR
    created_at: datetime = Field(default_factory=get_utc_now)


class Task(SQLModel, table=True):
    """Track asynchronous STT and AI processing tasks to prevent gateway timeout."""
    id: str = Field(primary_key=True)  # UUID string
    meeting_id: Optional[int] = Field(default=None, foreign_key="meeting.id")
    progress_percent: int = Field(default=0)
    status: str = Field(default="QUEUED")
    error_message: Optional[str] = None


# ==================== API DTOs (Pydantic) ====================

class BYOKSettingsRequest(BaseModel):
    """Input payload for setting or testing the NVIDIA NIM API key."""
    api_key: str

class BYOKSettingsResponse(BaseModel):
    """Output response for checking key presence without exposing raw token."""
    is_set: bool
    preview: Optional[str] = None
    message: str

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime

class ChunkUploadResponse(BaseModel):
    """Response returned when an audio chunk is uploaded and processed."""
    status: str  # "uploading" or "complete"
    progress_percent: int
    meeting_id: Optional[int] = None
    task_id: Optional[str] = None
    message: str

class TaskResponse(BaseModel):
    """Output status payload for asynchronous background workers."""
    task_id: str
    meeting_id: Optional[int] = None
    progress_percent: int
    status: str
    error_message: Optional[str] = None

class MeetingResponse(BaseModel):
    """Payload representing meeting recording details, transcript text, and generated MoM markdown."""
    id: int
    title: str
    status: str
    audio_file_path: Optional[str] = None
    transcript_text: Optional[str] = None
    mom_data: Optional[str] = None
    created_at: datetime
