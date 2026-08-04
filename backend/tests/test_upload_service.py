import os
import shutil
import pytest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.models.database import get_session
from app.models import schemas # Import all models so SQLModel.metadata knows about them
from app.core.config import STORAGE_DIR

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

def get_test_session():
    with Session(test_engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture():
    app.dependency_overrides[get_session] = get_test_session
    SQLModel.metadata.create_all(test_engine)
    with TestClient(app) as client:
        yield client
    SQLModel.metadata.drop_all(test_engine)
    app.dependency_overrides.clear()
    # Clean up test audio files in storage
    storage_root = STORAGE_DIR
    if storage_root.exists():
        for f in storage_root.glob("audio_*_test_*.flac"):
            try:
                f.unlink()
            except Exception:
                pass
        staging_root = storage_root / "chunks"
        if staging_root.exists():
            for d in staging_root.glob("unit_test_upload_*"):
                shutil.rmtree(d, ignore_errors=True)
            for d in staging_root.glob("test_inv_*"):
                shutil.rmtree(d, ignore_errors=True)

def test_invalid_extension_upload(client: TestClient):
    response = client.post(
        "/api/upload/chunk",
        data={
            "upload_id": "test_inv_123",
            "chunk_index": 0,
            "total_chunks": 1,
            "filename": "malicious_payload.exe",
            "title": "Bad File Test"
        },
        files={"file_chunk": ("malicious_payload.exe", b"fake binary exe content", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

def test_chunked_upload_reassembly(client: TestClient):
    upload_id = "unit_test_upload_999"
    total_chunks = 3
    filename = "test_audio.flac"
    
    chunk_1 = b"FLAC_AUDIO_HEADER_DATA_SLICE_1_"
    chunk_2 = b"MIDDLE_AUDIO_CONTENT_DATA_SLICE_2_"
    chunk_3 = b"FINAL_AUDIO_FOOTER_SLICE_3"
    expected_full_audio = chunk_1 + chunk_2 + chunk_3
    
    # Upload Chunk 0 (Index 0 of 3)
    res_0 = client.post(
        "/api/upload/chunk",
        data={
            "upload_id": upload_id,
            "chunk_index": 0,
            "total_chunks": total_chunks,
            "filename": filename,
            "title": "Weekly Product Sync"
        },
        files={"file_chunk": ("chunk_0", chunk_1, "application/octet-stream")}
    )
    assert res_0.status_code == 200
    data_0 = res_0.json()
    assert data_0["status"] == "uploading"
    assert data_0["meeting_id"] is None
    assert data_0["progress_percent"] == int((1 / 3) * 100)
    
    # Upload Chunk 1 (Index 1 of 3)
    res_1 = client.post(
        "/api/upload/chunk",
        data={
            "upload_id": upload_id,
            "chunk_index": 1,
            "total_chunks": total_chunks,
            "filename": filename,
            "title": "Weekly Product Sync"
        },
        files={"file_chunk": ("chunk_1", chunk_2, "application/octet-stream")}
    )
    assert res_1.status_code == 200
    data_1 = res_1.json()
    assert data_1["status"] == "uploading"
    assert data_1["progress_percent"] == int((2 / 3) * 100)

    # Upload Chunk 2 (Index 2 of 3) -> Triggers assembly
    with patch("app.api.router.run_stt_task") as mock_stt:
        res_2 = client.post(
            "/api/upload/chunk",
            data={
                "upload_id": upload_id,
                "chunk_index": 2,
                "total_chunks": total_chunks,
                "filename": filename,
                "title": "Weekly Product Sync"
            },
            files={"file_chunk": ("chunk_2", chunk_3, "application/octet-stream")}
        )
    assert res_2.status_code == 200
    data_2 = res_2.json()
    assert data_2["status"] == "complete"
    assert data_2["progress_percent"] == 100
    
    meeting_id = data_2["meeting_id"]
    assert meeting_id is not None
    assert isinstance(meeting_id, int)
    
    task_id = data_2["task_id"]
    assert task_id is not None
    assert mock_stt.called
    
    # Check that task status endpoint correctly returns QUEUED state
    res_task = client.get(f"/api/tasks/{task_id}")
    assert res_task.status_code == 200
    t_data = res_task.json()
    assert t_data["task_id"] == task_id
    assert t_data["meeting_id"] == meeting_id
    assert t_data["status"] == "QUEUED"
    assert t_data["progress_percent"] == 0
    
    # Verify file content reassembled perfectly on disk
    expected_path = STORAGE_DIR / f"audio_{meeting_id}_{filename}"
    assert expected_path.exists()
    
    with open(expected_path, "rb") as f:
        actual_content = f.read()
    assert actual_content == expected_full_audio
    
    # Test audio streaming endpoint
    res_audio = client.get(f"/api/meetings/{meeting_id}/audio")
    assert res_audio.status_code == 200
    assert res_audio.content == expected_full_audio
    
    # Verify staging chunk directory was cleaned up
    staging_dir = STORAGE_DIR / "chunks" / upload_id
    assert not staging_dir.exists()
