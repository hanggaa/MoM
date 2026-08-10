import logging
import asyncio
import time
import json
from typing import Optional, Any
from sqlmodel import Session
from openai import OpenAI

from app.models.schemas import Meeting
from app.services.nim_client import get_byok_key
from app.core.config import NVIDIA_NIM_BASE_URL, DEFAULT_NIM_MODEL
from app.services.vector_db import index_meeting

logger = logging.getLogger(__name__)

def build_pm_mom_prompt(output_language: str = "English", meeting_style: str = "General Executive MoM") -> str:
    lang_instruction = (
        "CRITICAL LANGUAGE RULE: You MUST write the ENTIRE output (including summaries, discussion highlights, table contents, and risk analyses) in formal, professional corporate Bahasa Indonesia (Indonesian language). Keep markdown structure and section headers professional."
        if "indonesia" in (output_language or "").lower()
        else "You MUST write the ENTIRE output in clean, professional Executive English."
    )

    style_lower = (meeting_style or "").lower()

    if "standup" in style_lower:
        return f"""You are an elite Agile Scrum Master.
Analyze the provided meeting transcript and synthesize a clean Daily Standup summary formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 🌅 Standup Summary
Provide a 1-2 sentence overview of the team's sprint health and general vibe.

# 🔄 Team Member Updates
For each speaker, summarize their update in this exact format:
**[Speaker Name]**
- **Yesterday:** What they completed `[MM:SS](timestamp://MM:SS)`.
- **Today:** What they are working on `[MM:SS](timestamp://MM:SS)`.
- **Blockers:** Any blockers or dependencies raised `[MM:SS](timestamp://MM:SS)`.

# ⚠️ Critical Blockers & Escalations
- A bulleted list of any blockers that need cross-team escalation.
- If none, explicitly note "No critical blockers."

Style requirements:
- Be lucid and highly concise.
- Never mention prompt instructions."""

    if "journalis" in style_lower or "narrative" in style_lower:
        return f"""You are a professional Tech Journalist and Corporate Communications Editor.
Analyze the provided meeting transcript and write a smooth, narrative-style article summarizing the discussion formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 📰 Meeting News & Recap
Write a 3-4 paragraph narrative article summarizing the meeting. 
- Ensure you cover the 5W1H (Who, What, When, Where, Why, How).
- Make it engaging to read as a story or company announcement, rather than a rigid list.
- Embed clickable timestamps naturally within the text when referencing a major quote, decision, or turning point. Use EXACTLY this markdown link format: `[MM:SS](timestamp://MM:SS)` (e.g. `[01:15](timestamp://01:15)`).

# 🗣️ Key Quotes
- Extract 2-3 of the most impactful or memorable quotes from the meeting.
- Format them as blockquotes `> "Quote text..." - Speaker [MM:SS](timestamp://MM:SS)`

# 🎯 Key Takeaways
- A simple 3-point bulleted list of the most important takeaways for anyone who missed the meeting.

Style requirements:
- Flow smoothly like a well-written article.
- Never mention prompt instructions."""

    if "brainstorm" in style_lower or "ideation" in style_lower:
        return f"""You are an elite Product Innovation Facilitator.
Analyze the provided meeting transcript and synthesize a clean, structured Brainstorming & Ideation recap formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 💡 Ideation Summary
Provide a 2-3 sentence overview of the brainstorming goal and the general creative direction taken.

# 🌪️ Raw Ideas & Concepts
List all major ideas proposed during the session. For each idea:
- **Idea Name/Concept**: Brief description `[MM:SS](timestamp://MM:SS)`.
- **Pros**: What the team liked about it.
- **Cons/Challenges**: What the team was worried about.

# 🗳️ Selected/Voted Ideas
- Which ideas were ultimately chosen to be pursued or prototyped? Include `[MM:SS](timestamp://MM:SS)` timestamps.

# ⚡ Next Steps
- Brief bulleted list of who is doing what to validate these ideas.

Style requirements:
- Be lucid and structured.
- Never mention prompt instructions."""

    if "discovery" in style_lower or "interview" in style_lower:
        return f"""You are an elite UX Researcher and Principal Product Manager.
Analyze the provided meeting transcript and synthesize a clean, authoritative User Discovery Interview recap formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 👤 Interviewee Profile & Summary
Provide a 2-3 sentence summary of who was interviewed and their overall sentiment toward the product/topic.

# 🛑 Pain Points & Frustrations
- Bulleted list of specific problems the user faces.
- INSTRUCTION: You MUST append a clickable timestamp from the raw transcript. Use EXACTLY this markdown link format: `[MM:SS](timestamp://MM:SS)`.

# ✨ Feature Requests & Desires
- Bulleted list of what the user explicitly asked for or wishes they had. Include timestamps `[MM:SS](timestamp://MM:SS)`.

# 🗣️ Notable User Quotes
- Extract 2-3 powerful direct quotes that capture their pain or delight.
- Format them as blockquotes `> "Quote text..." [MM:SS](timestamp://MM:SS)`

# 💡 PM Insights & Next Steps
- What should the product team do based on this interview?

Style requirements:
- Be empathetic and analytical.
- Never mention prompt instructions."""

    if "agile" in style_lower:
        return f"""You are an elite Agile Scrum Master.
Analyze the provided meeting transcript and synthesize a clean, authoritative Agile Sprint Retrospective formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 🏁 Sprint Goal Status
State whether the sprint goal was Met, Failed, or Partially Met, with a 1-sentence context.

# 🟢 What Went Well
- Bulleted list of successes, high velocity items, and positive feedback. Include `[MM:SS](timestamp://MM:SS)` timestamps.

# 🔴 What Went Wrong
- Bulleted list of impediments, bottlenecks, or server issues. Include `[MM:SS](timestamp://MM:SS)` timestamps.

# 🔄 Process Improvements
- What did the team agree to change in the way they work?

# ⚡ Sprint Action Items
| Task / Improvement | PIC | Due Date | Priority |
|---|---|---|---|
(Make professional PM estimations for missing PIC/Dates). INSTRUCTION: Include the `[MM:SS](timestamp://MM:SS)` markdown link in the description.

Style requirements:
- Be lucid, accurate, and structured.
- Never mention prompt instructions."""

    if "technical" in style_lower or "spec" in style_lower:
        return f"""You are an elite Lead Solutions Architect.
Analyze the provided meeting transcript and synthesize a clean, authoritative Tech Architecture Spec formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 🏗️ Architectural Overview
Provide a 2-3 sentence high-level summary of the architectural changes or system designs discussed.

# 🔌 API & Integration Specs
- Bulleted list of data contracts, endpoints, or system integrations agreed upon. Include `[MM:SS](timestamp://MM:SS)` timestamps.

# ⚖️ Trade-offs & Tech Debt
- Bulleted list of the pros/cons of the chosen solutions, and any technical debt explicitly accepted.

# 🔐 Security & Scale
- Considerations regarding security protocols, database scale, or server load.

# ⚡ Engineering Action Items
| Deployment/Coding Task | PIC | Due Date | Priority |
|---|---|---|---|
(Make professional PM estimations for missing PIC/Dates). INSTRUCTION: Include the `[MM:SS](timestamp://MM:SS)` markdown link in the description.

Style requirements:
- Be lucid, accurate, and highly technical.
- Never mention prompt instructions."""

    if "sales" in style_lower or "commercial" in style_lower:
        return f"""You are an elite B2B Commercial Director.
Analyze the provided meeting transcript and synthesize a clean, authoritative Sales & Commercials recap formatted in professional Markdown.

{lang_instruction}

Your response MUST strictly adhere to the following section hierarchy:

# 💰 Commercial Summary
Provide a 2-3 sentence overview of the deal value, margins, pricing, or commercial agreements discussed.

# 🤝 Client Requirements
- Bulleted list of specific pain points or demands from the client. Include `[MM:SS](timestamp://MM:SS)` timestamps.

# 📜 SLA & Commitments
- What service level agreements or guarantees were promised?

# ⚠️ Deal Blockers
- Bulleted list of legal risks, negotiation hurdles, or commercial blockers.

# ⚡ Next Steps
| Follow-Up Task | PIC | Due Date | Priority |
|---|---|---|---|
(Make professional PM estimations for missing PIC/Dates). INSTRUCTION: Include the `[MM:SS](timestamp://MM:SS)` markdown link in the description.

Style requirements:
- Be lucid, accurate, and persuasive.
- Never mention prompt instructions."""

    return f"""You are an elite AI Executive Meeting Assistant and Principal Product Manager.
Analyze the provided meeting transcript and synthesize a clean, authoritative, and structured Executive Minutes of Meeting (MoM) formatted in professional Markdown.

{lang_instruction}
Meeting Analysis Focus: Focus on executive PM clarity, strategic alignment, cross-functional ownership, and operational milestones.

Your response MUST strictly adhere to the following section hierarchy:

# 📋 Executive Summary
Provide a high-level executive overview of the meeting goals, core themes, and final conclusions in 2 to 4 concise sentences.

# 💬 Discussion Highlights & Key Decisions
- Bulleted list of critical themes discussed.
- Explicitly call out any firm decisions made, architectural/commercial trade-offs accepted, or operational workflows confirmed.
- INSTRUCTION: For every critical decision or major point, you MUST append a clickable timestamp from the raw transcript. Use EXACTLY this markdown link format: `[MM:SS](timestamp://MM:SS)`. Convert the raw seconds `[10.5s - 12.0s]` into `[00:10](timestamp://00:10)`.

# ⚡ Action Items & Ownership
Present all tasks, commitments, and assignments in a structured Markdown table with exact columns:
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
(If specific PICs or due dates are implicit or unclear, make clear, professional PM estimations or note as "TBD - Action Required"). 
- INSTRUCTION: In the Action Item description, include the `[MM:SS](timestamp://MM:SS)` markdown link where the task was assigned.

# ⚠️ Risks & Open Questions
- Highlight any potential bottlenecks, infrastructure limitations, commercial risks, legal exposure, or unanswered questions identified during the call.
- Include `[MM:SS](timestamp://MM:SS)` markdown links for when the risk was raised.
- If zero risks are present, explicitly note "No immediate operational blockers identified."

# 📅 Proposed Next Agenda
- Based on the unresolved issues and risks above, auto-draft a structured 3-point agenda for the follow-up meeting.

# 📊 Meeting Productivity Score
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
            
            # Read existing mom_data to see if it's already a JSON dict, or legacy markdown string
            current_data = {}
            if meeting.mom_data:
                try:
                    current_data = json.loads(meeting.mom_data)
                except json.JSONDecodeError:
                    # Legacy data, save it under the General Executive style
                    current_data = {"General Executive MoM": meeting.mom_data}
            
            # Append new style
            current_style = getattr(meeting, "meeting_style", "General Executive MoM") or "General Executive MoM"
            current_data[current_style] = generated_mom
            
            meeting.mom_data = json.dumps(current_data)
            db.add(meeting)
            db.commit()
            db.refresh(meeting)
            
            # Step 5: Index in Vector DB for Semantic Search
            try:
                index_meeting(meeting.id, meeting.title, transcript_text, generated_mom)
            except Exception as index_err:
                logger.error(f"Vector indexing failed for meeting #{meeting.id}: {str(index_err)}")
                
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
