import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.models.database import get_session
from app.models.schemas import AppSettings
from app.core.config import KEY_NVIDIA_API_KEY

# In-memory SQLite engine for test isolation
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


def test_health_check_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_get_byok_default_status(client: TestClient):
    response = client.get("/api/settings/byok")
    assert response.status_code == 200
    data = response.json()
    assert data["is_set"] is False
    assert data["preview"] is None


@patch("app.api.router.verify_nvidia_nim_connection", return_value=True)
def test_post_byok_key_saving(mock_verify, client: TestClient):
    fake_key = "nvapi-test1234567890abcdefghijklmnopqrstuvwxyz"
    response = client.post("/api/settings/byok", json={"api_key": fake_key})
    assert response.status_code == 200
    data = response.json()
    assert data["is_set"] is True
    # Verify masking
    assert "preview" in data
    assert fake_key not in data["preview"]
    assert data["preview"].startswith("nvapi-")
    
    # Second fetch should now report True
    get_res = client.get("/api/settings/byok")
    assert get_res.status_code == 200
    assert get_res.json()["is_set"] is True
