import os
import sys
import types
from contextlib import contextmanager
from typing import Iterator

import pytest
from pathlib import Path
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.models import schemas  # ensure metadata loads tables
from app.models.schemas import Meeting, Task
from app.services.stt_worker import run_stt_task
from app.services import stt_worker
from app.core.config import STORAGE_DIR

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

class FakeSegment:
    def __init__(self, start, end, text):
        self.start = start
        self.end = end
        self.text = text

class FakeInfo:
    duration = 100.0

class FakeWhisperModel:
    def transcribe(self, path, beam_size=5, **kwargs):
        segments = [
            FakeSegment(1.0, 30.0, "Hello PMs, welcome to the weekly sprint sync."),
            FakeSegment(30.0, 80.0, "Action item: Deploy Phase 2B async STT pipeline immediately."),
            FakeSegment(80.0, 95.0, "Meeting adjourned, thanks everyone.")
        ]
        return segments, FakeInfo()

class FakeMessage:
    content = "# 📋 Executive Summary\n\nSprint sync concluded successfully.\n\n# ⚡ Action Items & Ownership\n\n| Action Item & Deliverable | PIC | Due Date | Priority |\n|---|---|---|---|\n| Deploy Phase 2C pipeline | Lead PM | Immediate | High |"

class FakeChoice:
    message = FakeMessage()

class FakeCompletionResponse:
    choices = [FakeChoice()]

class FakeNimClient:
    def __init__(self):
        class FakeChat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return FakeCompletionResponse()
        self.chat = FakeChat()

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    SQLModel.metadata.create_all(test_engine)
    yield
    SQLModel.metadata.drop_all(test_engine)
    # Cleanup any generated transcript files
    storage_root = STORAGE_DIR
    if storage_root.exists():
        for f in storage_root.glob("transcript_*_test.txt"):
            try:
                f.unlink()
            except Exception:
                pass

def test_stt_worker_success_flow(tmp_path):
    # Step 1: Prepare dummy audio file on filesystem
    dummy_audio = tmp_path / "test_recording.flac"
    dummy_audio.write_bytes(b"FAKE_FLAC_STREAM_AUDIO_FOR_TESTING")
    
    # Step 2: Seed SQLite DB with Meeting and Task in QUEUED state
    with Session(test_engine) as db:
        meeting = Meeting(title="Sprint Sync", audio_file_path=str(dummy_audio), status="QUEUED")
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        task_id = "test-uuid-stt-001"
        task = Task(id=task_id, meeting_id=meeting.id, status="QUEUED", progress_percent=0)
        db.add(task)
        db.commit()
        
        meeting_id = meeting.id

    # Step 3: Run STT background worker synchronously with mock model & custom test engine
    run_stt_task(
        task_id=task_id,
        meeting_id=meeting_id,
        db_engine=test_engine,
        mock_model=FakeWhisperModel(),
        mock_nim_client=FakeNimClient()
    )
    
    # Step 4: Verify results in database & filesystem
    with Session(test_engine) as db:
        updated_task = db.get(Task, task_id)
        updated_meeting = db.get(Meeting, meeting_id)
        
        assert updated_task.status == "DONE"
        assert updated_task.progress_percent == 100
        assert updated_task.error_message is None
        
        assert updated_meeting.status == "DONE"
        assert updated_meeting.transcript_file_path is not None
        assert updated_meeting.mom_data is not None
        assert "Sprint sync concluded successfully" in updated_meeting.mom_data
        
        transcript_path = Path(updated_meeting.transcript_file_path)
        assert transcript_path.exists()
        content = transcript_path.read_text(encoding="utf-8")
        assert "Action item: Deploy Phase 2B async STT pipeline immediately." in content

def test_stt_worker_missing_audio_file():
    # Test fallback error handling when audio file path points to nonexistent location
    with Session(test_engine) as db:
        meeting = Meeting(title="Missing Audio Meeting", audio_file_path="/nonexistent/path/audio.wav", status="QUEUED")
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        task_id = "test-uuid-stt-error-002"
        task = Task(id=task_id, meeting_id=meeting.id, status="QUEUED", progress_percent=0)
        db.add(task)
        db.commit()
        meeting_id = meeting.id

    run_stt_task(
        task_id=task_id,
        meeting_id=meeting_id,
        db_engine=test_engine,
        mock_model=FakeWhisperModel()
    )
    
    with Session(test_engine) as db:
        errored_task = db.get(Task, task_id)
        errored_meeting = db.get(Meeting, meeting_id)
        
        assert errored_task.status == "ERROR"
        assert "Audio recording file missing" in errored_task.error_message
        assert errored_meeting.status == "ERROR"


def test_stt_worker_uses_temporary_flac_only_for_diarization(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original_audio = tmp_path / "meeting.mp3"
    original_audio.write_bytes(b"compressed-audio")
    normalized_audio = tmp_path / "diarization-test.flac"
    transcribed_paths: list[str] = []
    diarized_paths: list[str] = []

    class FakeRuntimeWhisperModel:
        def __init__(self, **kwargs: object) -> None:
            pass

        def transcribe(
            self, path: str, **kwargs: object
        ) -> tuple[list[FakeSegment], FakeInfo]:
            transcribed_paths.append(path)
            return FakeWhisperModel().transcribe(path, **kwargs)

    class FakeDiarization:
        def itertracks(
            self, yield_label: bool = False
        ) -> Iterator[tuple[object, object, str]]:
            return iter(())

    class FakePipeline:
        @classmethod
        def from_pretrained(cls, model_name: str) -> "FakePipeline":
            return cls()

        def to(self, device: object) -> None:
            return None

        def __call__(self, path: str) -> FakeDiarization:
            diarized_paths.append(path)
            assert Path(path).exists()
            return FakeDiarization()

    @contextmanager
    def fake_normalized_audio(
        source_path: str | Path, output_dir: str | Path
    ) -> Iterator[Path]:
        normalized_audio.write_bytes(b"normalized-flac")
        try:
            yield normalized_audio
        finally:
            normalized_audio.unlink(missing_ok=True)

    faster_whisper_module = types.ModuleType("faster_whisper")
    faster_whisper_module.WhisperModel = FakeRuntimeWhisperModel
    pyannote_module = types.ModuleType("pyannote")
    pyannote_module.__path__ = []
    pyannote_audio_module = types.ModuleType("pyannote.audio")
    pyannote_audio_module.Pipeline = FakePipeline

    monkeypatch.setitem(sys.modules, "faster_whisper", faster_whisper_module)
    monkeypatch.setitem(sys.modules, "pyannote", pyannote_module)
    monkeypatch.setitem(sys.modules, "pyannote.audio", pyannote_audio_module)
    monkeypatch.setattr(stt_worker, "STORAGE_DIR", tmp_path)
    monkeypatch.setattr(stt_worker, "get_hf_token", lambda db: "hf-token")
    monkeypatch.setattr(
        stt_worker,
        "synthesize_mom_sync",
        lambda db, meeting, mock_client=None: None,
    )
    monkeypatch.setattr(
        stt_worker,
        "normalized_audio_for_diarization",
        fake_normalized_audio,
        raising=False,
    )
    monkeypatch.setattr(
        "app.services.pyannote_compat.apply_pyannote_compat_patches",
        lambda cache_dir: None,
    )

    with Session(test_engine) as db:
        meeting = Meeting(
            title="Diarization Regression",
            audio_file_path=str(original_audio),
            status="QUEUED",
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        task_id = "test-uuid-diarization-003"
        task = Task(
            id=task_id,
            meeting_id=meeting.id,
            status="QUEUED",
            progress_percent=0,
        )
        db.add(task)
        db.commit()
        meeting_id = meeting.id

    run_stt_task(
        task_id=task_id,
        meeting_id=meeting_id,
        db_engine=test_engine,
        mock_nim_client=FakeNimClient(),
    )

    assert transcribed_paths == [str(original_audio)]
    assert diarized_paths == [str(normalized_audio)]
    assert not normalized_audio.exists()
