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

def build_pm_mom_prompt(output_language: str = "English", meeting_style: str = "General Executive MoM") -> str:
    lang_instruction = (
        "CRITICAL LANGUAGE RULE: You MUST write the ENTIRE output (including summaries, discussion highlights, table contents, and risk analyses) in formal, professional corporate Bahasa Indonesia (Indonesian language). Keep markdown structure and section headers professional."
        if "indonesia" in (output_language or "").lower()
        else "You MUST write the ENTIRE output in clean, professional Executive English."
    )

    if "agile" in (meeting_style or "").lower():
        style_instruction = "Focus heavily on Agile Scrum/Kanban metrics: identify sprint velocity impediments, user story blockers, release timelines, and retrospective action deliverables."
    elif "technical" in (meeting_style or "").lower() or "spec" in (meeting_style or "").lower():
        style_instruction = "Focus heavily on engineering architecture, API integration specs, data consistency trade-offs, system latency, security protocols, and scalability constraints."
    elif "sales" in (meeting_style or "").lower() or "commercial" in (meeting_style or "").lower():
        style_instruction = "Focus heavily on commercial terms, pricing margins, contract SLA clauses, customer requirements, client escalation matrices, and legal compliance checkpoints."
    else:
        style_instruction = "Focus on executive PM clarity, strategic alignment, cross-functional ownership, and operational milestones."

    return f"""You are an elite AI Executive Meeting Assistant and Principal Product Manager.
Analyze the provided meeting transcript and synthesize a clean, authoritative, and structured Executive Minutes of Meeting (MoM) formatted in professional Markdown.

{lang_instruction}
Meeting Analysis Focus ({meeting_style}): {style_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 📋 Executive Summary
Provide a high-level executive overview of the meeting goals, core themes, and final conclusions in 2 to 4 concise sentences.

# 💬 Discussion Highlights & Key Decisions
- Bulleted list of critical themes discussed.
- Explicitly call out any firm decisions made, architectural/commercial trade-offs accepted, or operational workflows confirmed.
- INSTRUCTION: For every critical decision or major point, you MUST append a clickable timestamp from the raw transcript. Use EXACTLY this markdown link format: `[MM:SS](timestamp://MM:SS)` (e.g. `[01:15](timestamp://01:15)`). Convert the raw seconds `[10.5s - 12.0s]` into `[00:10](timestamp://00:10)`.

# ⚡ Action Items & Ownership
Present all tasks, commitments, and assignments in a structured Markdown table with exact columns:
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
(If specific PICs or due dates are implicit or unclear, make clear, professional PM estimations or note as "TBD - Action Required"). 
- INSTRUCTION: In the Action Item description, include the `[MM:SS](timestamp://MM:SS)` markdown link where the task was assigned.

# ⚠️ Risks, Constraints & Open Questions
- Highlight any potential bottlenecks, infrastructure limitations, commercial risks, legal exposure, or unanswered questions identified during the call.
- Include `[MM:SS](timestamp://MM:SS)` markdown links for when the risk was raised.
- If zero risks are present, explicitly note "No immediate operational blockers identified."

# 📅 Proposed Next Meeting Agenda
- Based on the unresolved issues and risks above, auto-draft a structured 3-point agenda for the follow-up meeting.

# 📊 Meeting Productivity & Sentiment Score
- Provide a "Health Score" (e.g., 85/100).
- Write a 2-sentence analysis on the meeting's efficiency, emotional tone, and whether the discussion stayed on track or went on tangents.

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
        client = OpenAI(api_key=byok_key, base_url=NVIDIA_NIM_BASE_URL, timeout=300.0)

    system_prompt_text = build_pm_mom_prompt(
        output_language=getattr(meeting, "output_language", "English") or "English",
        meeting_style=getattr(meeting, "meeting_style", "General Executive MoM") or "General Executive MoM"
    )

    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=DEFAULT_NIM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt_text},
                    {"role": "user", "content": f"Meeting Title: {meeting.title}\n\nTranscript Content:\n{transcript_text}"}
                ],
                temperature=0.2,
                max_tokens=4096
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
