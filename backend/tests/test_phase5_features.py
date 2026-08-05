import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.models.database import get_session
from app.models.schemas import Meeting

sqlite_file_name = "sqlite://"
test_engine = create_engine(
    sqlite_file_name,
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

def test_stt_settings_crud(client: TestClient):
    # Test default values
    res = client.get("/api/settings/stt")
    assert res.status_code == 200
    data = res.json()
    assert data["model_size"] == "large-v3-turbo"
    assert data["custom_vocabulary"] == ""
    assert data["default_language"] == "English"
    
    # Update settings
    update_payload = {
        "model_size": "base",
        "custom_vocabulary": "Kubernetes, Cloudflare, INT8, Nemotron-3",
        "default_language": "Bahasa Indonesia",
        "default_style": "Agile Sprint Retrospective"
    }
    post_res = client.post("/api/settings/stt", json=update_payload)
    assert post_res.status_code == 200
    updated_data = post_res.json()
    assert updated_data["model_size"] == "base"
    assert updated_data["custom_vocabulary"] == "Kubernetes, Cloudflare, INT8, Nemotron-3"
    assert updated_data["default_language"] == "Bahasa Indonesia"
    assert updated_data["default_style"] == "Agile Sprint Retrospective"

def test_meetings_list_with_keyword_search_and_archive(client: TestClient, tmp_path):
    # Create mock audio file on filesystem
    dummy_audio = tmp_path / "test_recording_phase5.mp3"
    dummy_audio.write_bytes(b"MOCK_AUDIO_BYTES_FOR_ARCHIVE")
    
    with Session(test_engine) as session:
        m1 = Meeting(
            title="Q4 Commercials Strategy Sync",
            status="DONE",
            mom_data="Discussed pricing margins and client SLAs.",
            audio_file_path=str(dummy_audio),
            output_language="English",
            meeting_style="Sales & Commercials",
            is_audio_archived=False
        )
        m2 = Meeting(
            title="Sprint 12 Agile Retrospective",
            status="DONE",
            mom_data="Velocity impediments addressed in corporate Bahasa Indonesia.",
            output_language="Bahasa Indonesia",
            meeting_style="Agile Sprint Retrospective",
            is_audio_archived=False
        )
        session.add(m1)
        session.add(m2)
        session.commit()
        m1_id = m1.id
        m2_id = m2.id

    # Test list without search
    res = client.get("/api/meetings")
    assert res.status_code == 200
    meetings_list = res.json()
    assert len(meetings_list) == 2
    
    # Test keyword search matching title
    res_search1 = client.get("/api/meetings?search=Commercials")
    assert res_search1.status_code == 200
    s1_data = res_search1.json()
    assert len(s1_data) == 1
    assert s1_data[0]["title"] == "Q4 Commercials Strategy Sync"
    
    # Test keyword search matching MoM content
    res_search2 = client.get("/api/meetings?search=Velocity")
    assert res_search2.status_code == 200
    s2_data = res_search2.json()
    assert len(s2_data) == 1
    assert s2_data[0]["title"] == "Sprint 12 Agile Retrospective"
    
    # Test Smart Archive (delete audio_only on m1)
    assert os.path.exists(str(dummy_audio)) is True
    res_purge = client.delete(f"/api/meetings/{m1_id}/audio_only")
    assert res_purge.status_code == 200
    assert res_purge.json()["success"] is True
    assert os.path.exists(str(dummy_audio)) is False  # Audio file purged from disk!
    
    # Check details after purge
    res_m1 = client.get(f"/api/meetings/{m1_id}")
    assert res_m1.status_code == 200
    m1_details = res_m1.json()
    assert m1_details["is_audio_archived"] is True
    assert m1_details["audio_file_path"] is None
    assert m1_details["mom_data"] == "Discussed pricing margins and client SLAs."  # MoM intact
    
    # Test full meeting deletion on m2
    res_del = client.delete(f"/api/meetings/{m2_id}")
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True
    
    # Verify m2 is gone
    res_m2 = client.get(f"/api/meetings/{m2_id}")
    assert res_m2.status_code == 404
