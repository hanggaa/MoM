import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select
from openai import AsyncOpenAI, AuthenticationError, APIConnectionError

from app.models.schemas import AppSettings
from app.core.config import NVIDIA_NIM_BASE_URL, DEFAULT_NIM_MODEL, KEY_NVIDIA_API_KEY

logger = logging.getLogger(__name__)

def mask_api_key(key: Optional[str]) -> Optional[str]:
    """Return a safely masked preview of an API key (e.g. nvapi-****...****) without leaking plaintext."""
    if not key:
        return None
    if len(key) <= 10:
        return "****"
    return f"{key[:6]}...{key[-4:]}"

def get_byok_key(session: Session) -> Optional[str]:
    """Retrieve the stored BYOK key from SQLite."""
    setting = session.exec(select(AppSettings).where(AppSettings.key_name == KEY_NVIDIA_API_KEY)).first()
    if not setting:
        return None
    return setting.key_value

def save_byok_key(session: Session, api_key: str) -> None:
    """Save or update the BYOK key in SQLite."""
    setting = session.exec(select(AppSettings).where(AppSettings.key_name == KEY_NVIDIA_API_KEY)).first()
    if not setting:
        setting = AppSettings(key_name=KEY_NVIDIA_API_KEY, key_value=api_key)
        session.add(setting)
    else:
        setting.key_value = api_key
        setting.updated_at = datetime.now(timezone.utc)
    session.commit()

async def verify_nvidia_nim_connection(api_key: str) -> bool:
    """Test connection and token validity against NVIDIA NIM cloud endpoint using OpenAI Python SDK."""
    if not api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API Key cannot be empty."
        )
        
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=NVIDIA_NIM_BASE_URL,
        timeout=10.0
    )
    
    try:
        # Perform a very lightweight test inference or list models check if available.
        # Sending a 1-token query to verify authentication.
        await client.chat.completions.create(
            model=DEFAULT_NIM_MODEL,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1,
            temperature=0.0
        )
        return True
    except AuthenticationError as e:
        logger.warning(f"BYOK authentication check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid NVIDIA NIM API key or unauthorized access."
        )
    except APIConnectionError as e:
        logger.error(f"Connection error to NVIDIA NIM servers during key verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach NVIDIA NIM API servers. Please check network connection."
        )
    except Exception as e:
        # Note: If rate limited or model error occurs, we handle cleanly
        err_str = str(e).lower()
        if "401" in err_str or "unauthorized" in err_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid NVIDIA NIM API key."
            )
        # If the model responded at all (even with a schema/parameter message), the key connected successfully
        logger.info(f"NVIDIA NIM verification test exception (handled): {e}")
        return True
