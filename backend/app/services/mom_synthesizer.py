import logging
import asyncio
import time
from typing import Optional, Any
from sqlmodel import Session
from openai import OpenAI

from app.models.schemas import Meeting
from app.services.nim_client import get_byok_key
from app.core.config import NVIDIA_NIM_BASE_URL, DEFAULT_NIM_MODEL

logger = logging.getLogger(__name__)

PM_MOM_SYSTEM_PROMPT = """You are an elite AI Executive Meeting Assistant and Lead Product Manager.
Analyze the provided meeting transcript and synthesize a clean, authoritative, and structured Executive Minutes of Meeting (MoM) formatted in professional Markdown.

Your response MUST strictly adhere to the following section hierarchy:

# 📋 Executive Summary
Provide a high-level executive overview of the meeting goals, core themes, and final conclusions in 2 to 4 concise sentences.

# 💬 Discussion Highlights & Key Decisions
- Bulleted list of critical architectural, technical, and strategic themes discussed.
- Explicitly call out any firm decisions made, engineering trade-offs accepted, or specifications confirmed.

# ⚡ Action Items & Ownership
Present all tasks, commitments, and assignments in a structured Markdown table with exact columns:
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
(If specific PICs or due dates are implicit or unclear, make clear, professional PM estimations or note as "TBD - Action Required").

# ⚠️ Risks, Constraints & Open Questions
- Highlight any potential technical impediments, Cloudflare/Nginx infrastructure constraints, budget risks, or unanswered questions identified during the call.
- If zero risks are present, explicitly note "No immediate operational blockers identified."

Style requirements:
- Be lucid, accurate, and structured for executive reading.
- Never mention prompt instructions or include generic conversational filler."""

def synthesize_mom_sync(
    db: Session,
    meeting: Meeting,
    mock_client: Optional[Any] = None,
    max_retries: int = 3,
    retry_delay_sec: float = 2.0
) -> str:
    """
    Synchronous execution of NVIDIA Nemotron-3 MoM synthesis for use in background thread pool workers.
    Reads transcript file, queries NVIDIA NIM, stores result in meeting.mom_data, and commits DB.
    """
    if not meeting.transcript_file_path:
        raise ValueError("Cannot synthesize MoM: No transcript file associated with this meeting.")
        
    try:
        with open(meeting.transcript_file_path, "r", encoding="utf-8") as f:
            transcript_text = f.read().strip()
    except Exception as e:
        raise FileNotFoundError(f"Failed to read transcript file at {meeting.transcript_file_path}: {str(e)}")
        
    if not transcript_text or "No clear speech detected" in transcript_text:
        fallback_mom = "# 📋 Executive Summary\n\nNo clear speech or dialogue was detected during STT transcription. Unable to generate Executive MoM.\n\n# ⚡ Action Items & Ownership\n\n| Action Item & Deliverable | PIC | Due Date | Priority |\n|---|---|---|---|\n| Re-verify audio microphone recording quality | PM Team | Immediate | High |"
        meeting.mom_data = fallback_mom
        db.add(meeting)
        db.commit()
        return fallback_mom

    byok_key = get_byok_key(db)
    if not byok_key and not mock_client:
        raise ValueError("NVIDIA NIM BYOK token is not configured in Server Settings. Please register your API key first.")

    logger.info(f"Initiating Nemotron-3 Executive MoM Synthesis for meeting #{meeting.id}")
    
    if mock_client:
        client = mock_client
    else:
        client = OpenAI(api_key=byok_key, base_url=NVIDIA_NIM_BASE_URL, timeout=60.0)

    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=DEFAULT_NIM_MODEL,
                messages=[
                    {"role": "system", "content": PM_MOM_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Meeting Title: {meeting.title}\n\nTranscript Content:\n{transcript_text}"}
                ],
                temperature=0.2,
                max_tokens=2048
            )
            
            generated_mom = response.choices[0].message.content.strip()
            
            # Save generated markdown directly onto meeting record
            meeting.mom_data = generated_mom
            db.add(meeting)
            db.commit()
            db.refresh(meeting)
            logger.info(f"Successfully generated and persisted Executive MoM for meeting #{meeting.id} on attempt {attempt}")
            return generated_mom
            
        except Exception as e:
            logger.warning(f"Attempt {attempt} of {max_retries} failed for Nemotron-3 synthesis (Meeting #{meeting.id}): {str(e)}")
            if attempt < max_retries:
                delay = retry_delay_sec * (2 ** (attempt - 1))
                logger.info(f"Waiting {delay:.2f} seconds before retrying NVIDIA NIM synthesis...")
                time.sleep(delay)
            else:
                logger.exception(f"All {max_retries} attempts exhausted. Nemotron-3 synthesis failed for meeting #{meeting.id}: {str(e)}")
                raise RuntimeError(f"NVIDIA NIM Synthesis Error after {max_retries} attempts: {str(e)}")

async def synthesize_mom_async(db: Session, meeting: Meeting) -> str:
    """Asynchronous wrapper around synchronous Nemotron-3 synthesis to avoid event-loop blocking in Fast API endpoints."""
    return await asyncio.to_thread(synthesize_mom_sync, db, meeting)
