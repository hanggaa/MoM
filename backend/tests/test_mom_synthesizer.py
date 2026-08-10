import os
import pytest
from pathlib import Path
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient

from app.models import schemas
from app.models.schemas import Meeting, AppSettings
from app.services.mom_synthesizer import synthesize_mom_sync
from app.main import app
from app.models.database import get_session

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

class FakeNimClient:
    def __init__(self, return_text="# 📋 Executive Summary\n\nExecutive PM sync MoM."):
        class FakeChat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    class Choice:
                        class message:
                            content = return_text
                    class Response:
                        choices = [Choice()]
                    return Response()
        self.chat = FakeChat()

def test_synthesize_mom_sync_success(tmp_path, client):
    transcript_file = tmp_path / "transcript_test.txt"
    transcript_file.write_text("[0.0s - 10.0s] We decided to migrate database indexes.", encoding="utf-8")
    
    with Session(test_engine) as db:
        meeting = Meeting(title="Architecture Sync", audio_file_path="dummy.mp3", transcript_file_path=str(transcript_file), status="SYNTHESIZING")
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        result_mom = synthesize_mom_sync(db, meeting, mock_client=FakeNimClient())
        assert "# 📋 Executive Summary" in result_mom
        import json
        saved_data = json.loads(meeting.mom_data)
        assert saved_data["General Executive MoM"] == result_mom

def test_get_meeting_details_endpoint(tmp_path, client):
    transcript_file = tmp_path / "transcript_api.txt"
    transcript_file.write_text("[0.0s - 5.0s] API testing dialogue.", encoding="utf-8")
    
    with Session(test_engine) as db:
        meeting = Meeting(
            title="API Sync", 
            audio_file_path="test.mp3", 
            transcript_file_path=str(transcript_file), 
            mom_data="# 📋 Executive Summary\n\nAll goals achieved.",
            status="DONE"
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        meeting_id = meeting.id

    res = client.get(f"/api/meetings/{meeting_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == meeting_id
    assert data["title"] == "API Sync"
    assert data["status"] == "DONE"
    assert data["transcript_text"] == "[0.0s - 5.0s] API testing dialogue."
    assert "# 📋 Executive Summary" in data["mom_data"]

def test_get_meeting_details_not_found(client):
    res = client.get("/api/meetings/999999")
    assert res.status_code == 404

class FlakyNimClient:
    def __init__(self, fail_times=2, return_text="# 📋 Executive Summary\n\nRecovered after retries."):
        self.attempts = 0
        self.fail_times = fail_times
        self.return_text = return_text
        self.chat = self.FakeChat(self)

    class FakeChat:
        def __init__(self, parent):
            self.completions = parent.FakeCompletions(parent)

    class FakeCompletions:
        def __init__(self, parent):
            self.parent = parent
            
        def create(self, **kwargs):
            self.parent.attempts += 1
            if self.parent.attempts <= self.parent.fail_times:
                raise ConnectionError("Simulated temporary NIM rate limit or network error")
            class Choice:
                class message:
                    content = self.parent.return_text
            class Response:
                choices = [Choice()]
            return Response()

def test_synthesize_mom_sync_retry_success(tmp_path, client):
    transcript_file = tmp_path / "transcript_retry.txt"
    transcript_file.write_text("[0.0s - 10.0s] Retry network discussion.", encoding="utf-8")
    
    with Session(test_engine) as db:
        meeting = Meeting(title="Retry Sync", audio_file_path="dummy.mp3", transcript_file_path=str(transcript_file), status="SYNTHESIZING")
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        flaky_client = FlakyNimClient(fail_times=2)
        result_mom = synthesize_mom_sync(
            db, 
            meeting, 
            mock_client=flaky_client, 
            max_retries=3, 
            retry_delay_sec=0.01
        )
        assert flaky_client.attempts == 3
        assert "Recovered after retries." in result_mom
        import json
        saved_data = json.loads(meeting.mom_data)
        assert saved_data["General Executive MoM"] == result_mom

def test_synthesize_mom_sync_retry_failure(tmp_path, client):
    transcript_file = tmp_path / "transcript_fail.txt"
    transcript_file.write_text("[0.0s - 10.0s] Failing network discussion.", encoding="utf-8")
    
    with Session(test_engine) as db:
        meeting = Meeting(title="Fail Sync", audio_file_path="dummy.mp3", transcript_file_path=str(transcript_file), status="SYNTHESIZING")
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        
        always_fail_client = FlakyNimClient(fail_times=10)
        with pytest.raises(RuntimeError) as exc_info:
            synthesize_mom_sync(
                db, 
                meeting, 
                mock_client=always_fail_client, 
                max_retries=3, 
                retry_delay_sec=0.01
            )
        assert always_fail_client.attempts == 3
        assert "NVIDIA NIM Synthesis Error after 3 attempts" in str(exc_info.value)
