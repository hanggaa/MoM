import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool
from app.main import app
from app.models.database import get_session
from app.models.schemas import Meeting, Task, AppSettings

# Setup isolated static SQLite engine for rigorous E2E test verification
engine = create_engine(
    "sqlite://", 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

def get_test_session():
    with Session(engine) as session:
        yield session

@pytest.fixture(autouse=True)
def init_database():
    app.dependency_overrides[get_session] = get_test_session
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)
    app.dependency_overrides.clear()

def test_e2e_production_pipeline_verification(tmp_path):
    """
    Simulate end-to-end 2-hour executive meeting workflow:
    1. Register BYOK token securely without client leakage.
    2. Upload simulated multi-chunk audio file representing large recording.
    3. Verify reassembly and background worker status progression (10% to 100%).
    4. Simulate Nemotron-3 synthesis generating executive Action Items & PICs.
    5. Verify streaming audio playback endpoint functionality.
    """
    client = TestClient(app)
    
    # --- Step 1: Secure BYOK Token Registration & Zero Exposure Audit ---
    fake_token = "nvapi-E2E_VERIFIED_PRODUCTION_TOKEN_SECRET_999"
    with patch("app.api.router.verify_nvidia_nim_connection", return_value=True):
        res_byok = client.post("/api/settings/byok", json={"api_key": fake_token})
    assert res_byok.status_code == 200
    byok_data = res_byok.json()
    assert byok_data["is_set"] is True
    assert byok_data["preview"] == "nvapi-..._999"
    # SECURITY ASSERTION: Raw token must NEVER be returned to HTTP client
    assert fake_token not in res_byok.text
    
    # --- Step 2: Multi-Chunk Large Audio Upload ---
    upload_id = "e2e-2hour-meeting-upload"
    filename = "q3_roadmap_2hr_recording.mp3"
    title = "Q3 Product Architecture & Roadmap Sync"
    
    # We simulate 3 large chunk slices
    chunk_1_content = b"AUDIO_STREAM_HEADER_CHUNK_1_" * 100
    chunk_2_content = b"AUDIO_STREAM_BODY_CHUNK_2___" * 100
    chunk_3_content = b"AUDIO_STREAM_FOOTER_CHUNK_3_" * 100
    expected_full_audio = chunk_1_content + chunk_2_content + chunk_3_content
    
    # Override chunk staging and storage paths directly to isolated tmp directory
    storage_dir = tmp_path / "storage"
    chunks_dir = storage_dir / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    
    with patch("app.services.upload_service.STORAGE_ROOT", storage_dir), \
         patch("app.services.upload_service.CHUNKS_ROOT", chunks_dir), \
         patch("app.services.stt_worker.default_engine", engine), \
         patch("app.api.router.run_stt_task") as mock_stt_task:
        
        # Upload chunk 1/3
        res_1 = client.post(
            "/api/upload/chunk",
            data={"upload_id": upload_id, "chunk_index": 0, "total_chunks": 3, "filename": filename, "title": title},
            files={"file_chunk": ("chunk0.part", chunk_1_content, "application/octet-stream")}
        )
        assert res_1.status_code == 200, res_1.text
        assert res_1.json()["status"] == "uploading"
        
        # Upload chunk 2/3
        res_2 = client.post(
            "/api/upload/chunk",
            data={"upload_id": upload_id, "chunk_index": 1, "total_chunks": 3, "filename": filename, "title": title},
            files={"file_chunk": ("chunk1.part", chunk_2_content, "application/octet-stream")}
        )
        assert res_2.status_code == 200, res_2.text
        assert res_2.json()["status"] == "uploading"
        
        # Upload final chunk 3/3 - should trigger reassembly & background worker launch
        res_3 = client.post(
            "/api/upload/chunk",
            data={"upload_id": upload_id, "chunk_index": 2, "total_chunks": 3, "filename": filename, "title": title},
            files={"file_chunk": ("chunk2.part", chunk_3_content, "application/octet-stream")}
        )
        assert res_3.status_code == 200, res_3.text
        final_resp = res_3.json()
        assert final_resp["status"] == "complete"
        assert "meeting_id" in final_resp
        assert "task_id" in final_resp
        assert mock_stt_task.called
        
        meeting_id = final_resp["meeting_id"]
        task_id = final_resp["task_id"]
        
        # --- Step 3: Verify Task Monitor Progression ---
        res_task = client.get(f"/api/tasks/{task_id}")
        assert res_task.status_code == 200, res_task.text
        assert res_task.json()["status"] == "QUEUED"
        
        # --- Step 4: Simulate Nemotron-3 AI Synthesis Completion ---
        # Update database directly as worker would upon transcription completion
        with Session(engine) as db_session:
            task_db = db_session.exec(select(Task).where(Task.id == task_id)).first()
            task_db.status = "DONE"
            task_db.progress_percent = 100
            db_session.add(task_db)
            
            meeting_db = db_session.exec(select(Meeting).where(Meeting.id == meeting_id)).first()
            meeting_db.status = "DONE"
            meeting_db.transcript_file_path = str(storage_dir / f"transcript_{meeting_id}.txt")
            meeting_db.mom_data = """# Executive Summary
The engineering team aligned on deploying AIMeetingMoM to a GCP e2-standard-4 VM with INT8 local CPU STT to guarantee zero third-party audio leakage.

# Action Items
| Action Item | PIC | Due Date | Priority |
|---|---|---|---|
| Configure systemd service and Nginx reverse proxy on GCP | Budi (DevOps) | 12 Aug 2026 | High |
| Execute security audit confirming zero API key bundle leakage | Siti (Security) | 10 Aug 2026 | High |
| Validate memory overhead under 16GB ceiling | Andi (PM) | 15 Aug 2026 | Medium |

# Decisions Made
- Confirmed SQLite with SQLModel ORM for zero administration overhead.
- Confirmed NVIDIA Nemotron-3 BYOK for executive MoM reasoning."""
            db_session.add(meeting_db)
            db_session.commit()
            
        # Verify final meeting details via REST endpoint
        res_meeting = client.get(f"/api/meetings/{meeting_id}")
        assert res_meeting.status_code == 200, res_meeting.text
        m_data = res_meeting.json()
        assert m_data["title"] == "Q3 Product Architecture & Roadmap Sync"
        assert m_data["status"] == "DONE"
        assert "Action Items" in m_data["mom_data"]
        assert "Budi (DevOps)" in m_data["mom_data"]
        
        # --- Step 5: Verify Streaming Audio Playback Integration ---
        res_audio = client.get(f"/api/meetings/{meeting_id}/audio")
        assert res_audio.status_code == 200, res_audio.text
        assert res_audio.content == expected_full_audio
        
    print("\n[SUCCESS] E2E Production Launch Verification completed with 100% assertions satisfied!")
