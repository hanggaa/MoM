from datetime import datetime, timezone
from typing import Dict
from sqlmodel import Session, select
from app.models.schemas import AppSettings
from app.core.config import (
    KEY_STT_MODEL_SIZE,
    KEY_STT_CUSTOM_VOCAB,
    KEY_DEFAULT_LANGUAGE,
    KEY_DEFAULT_STYLE,
)


def get_stt_settings(session: Session) -> Dict[str, str]:
    """Retrieve STT accuracy model, vocabulary biasing hints, and synthesis defaults."""
    keys = [
        KEY_STT_MODEL_SIZE,
        KEY_STT_CUSTOM_VOCAB,
        KEY_DEFAULT_LANGUAGE,
        KEY_DEFAULT_STYLE,
    ]
    settings = (
        session.exec(select(AppSettings).where(AppSettings.key_name.in_(keys))).all()
    )
    mapping = {s.key_name: s.key_value for s in settings}
    return {
        "model_size": mapping.get(KEY_STT_MODEL_SIZE, "large-v3-turbo"),
        "custom_vocabulary": mapping.get(KEY_STT_CUSTOM_VOCAB, ""),
        "default_language": mapping.get(KEY_DEFAULT_LANGUAGE, "English"),
        "default_style": mapping.get(KEY_DEFAULT_STYLE, "General Executive MoM"),
    }


def save_stt_settings(
    session: Session,
    model_size: str,
    custom_vocabulary: str,
    default_language: str,
    default_style: str,
) -> None:
    """Save or update STT and MoM synthesis configuration in SQLite."""
    updates = {
        KEY_STT_MODEL_SIZE: model_size,
        KEY_STT_CUSTOM_VOCAB: custom_vocabulary or "",
        KEY_DEFAULT_LANGUAGE: default_language or "English",
        KEY_DEFAULT_STYLE: default_style or "General Executive MoM",
    }
    for k, v in updates.items():
        setting = (
            session.exec(select(AppSettings).where(AppSettings.key_name == k)).first()
        )
        if not setting:
            setting = AppSettings(key_name=k, key_value=str(v))
            session.add(setting)
        else:
            setting.key_value = str(v)
            setting.updated_at = datetime.now(timezone.utc)
    session.commit()
