from sqlmodel import create_engine, SQLModel, Session
from app.core.config import DATABASE_URL
# Ensure schemas are imported so SQLModel registers them before create_all is called
import app.models.schemas  # noqa: F401

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}  # Needed for SQLite with FastAPI multi-threading
)

from sqlalchemy import text

def init_db():
    """Create database tables if they don't already exist and perform lightweight schema updates."""
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE meeting ADD COLUMN transcript_file_path VARCHAR"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE meeting ADD COLUMN mom_data VARCHAR"))
        except Exception:
            pass

def get_session():
    """FastAPI dependency yielding database sessions."""
    with Session(engine) as session:
        yield session
