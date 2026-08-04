# Product Requirements Document: AI Meeting-to-MoM Generator MVP

## Overview
**Product Name:** AI Meeting-to-MoM Generator
**Problem Statement:** Product Managers spend hours manually listening to routine meeting recordings and typing up Action Items and summaries, wasting critical cognitive bandwidth. Existing SaaS tools charge recurring subscriptions and expose proprietary corporate audio to public third-party clouds.
**MVP Goal:** A self-hosted web application capable of transcribing routine audio meetings locally and generating executive-grade Minutes of Meeting (MoM) automatically via NVIDIA Nemotron AI in minutes without memory errors on a GCP VM.
**Target Launch:** 1 week sprint (7 days)

## Target Users
### Primary User Profile
**Who:** Product Managers, Project Managers, Tech Leads, and Executive Secretaries.
**Problem:** Overwhelmed by long routine meetings, losing 2–4 hours weekly transcribing notes, and facing data leakage risks with public AI transcription SaaS platforms.
**Current Solution:** Manual note-taking during live meetings or listening to audio replays after meetings.
**Why They'll Switch:** Complete data ownership and privacy on a custom domain, $0 monthly SaaS subscription fees, BYOK (Bring Your Own Key) cost control, and customized PM-specific prompts that extract structured Action Item tables with PICs and deadlines.

### User Persona: Alex the Product Manager
- **Demographics:** 28–40 years old, Product Management Leader working in agile technology or corporate environments.
- **Tech Level:** Intermediate (comfortable managing cloud domains, Cloudflare DNS, GCP VMs, and AI API keys).
- **Goals:** Automate the documentation of routine team meetings to free up cognitive bandwidth for product strategy and team execution.
- **Frustrations:** Tedious manual note-taking during multi-hour meetings and expensive recurring SaaS AI tools that lack prompt flexibility.

## User Journey
### The Story
Alex finishes a 1.5-hour roadmap alignment meeting with engineering and design. Instead of spending an hour reviewing notes and drafting an email, Alex visits their private web domain (`mom.domainanda.com`). Alex drags and drops the recorded audio file (.mp3/.wav/.m4a) into the sleek Vite/React interface and inputs their NVIDIA NIM API key (saved securely in browser session storage). The FastAPI backend seamlessly handles transcription via `faster-whisper` on the local CPU and immediately forwards the text transcript to the `nvidia/nemotron-3-ultra-550b-a55b` NIM API. Within minutes, a perfectly formatted executive MoM featuring an Action Items table appears on screen. Alex clicks "Copy to Clipboard" and pastes it directly into the team's Notion workspace or Slack channel.

### Key Touchpoints
1. **Discovery:** Accessing their custom self-hosted domain via browser.
2. **First Contact:** A modern, dark-mode glassmorphic interface with an intuitive drag-and-drop audio file uploader.
3. **Onboarding:** Simple Bring-Your-Own-Key (BYOK) setup modal where Alex pastes their NVIDIA NIM (`nvapi-...`) API key once per session.
4. **Core Loop:** Uploading meeting audio ➔ Watching real-time interactive progress indicators ➔ Reviewing the AI-generated executive MoM ➔ One-click copying to Notion/Markdown.
5. **Retention:** Saving hours every week while retaining total data ownership and $0 recurring SaaS platform subscription costs.

## MVP Features
### Core Features (Must Have)

#### 1. Asynchronous Audio Upload & Local STT Pipeline
- **Description:** Handle multi-megabyte audio file uploads cleanly and transcribe audio into accurate text using `faster-whisper` (INT8 quantization on CPU) in a FastAPI background worker task.
- **User Value:** Fast, high-accuracy, local transcription without sending proprietary audio over public internet APIs or running out of RAM on the cloud server.
- **Success Criteria:**
  - Users can upload MP3, WAV, M4A, and MP4 audio files up to 150MB+ without timeouts or freezes.
  - System processes Speech-to-Text via `faster-whisper` within safe memory boundaries (~2.5GB RAM consumption on 16GB VM).
  - Audio files are kept securely on the private VM filesystem during processing and cleaned up post-transcription.
- **Priority:** Critical (P0)

#### 2. NVIDIA Nemotron MoM AI Synthesizer (BYOK)
- **Description:** Connect to NVIDIA NIM API (`integrate.api.nvidia.com/v1`) using model `nvidia/nemotron-3-ultra-550b-a55b` via OpenAI Python SDK with user-supplied API credentials to synthesize executive MoM.
- **User Value:** Harnesses enterprise-grade reasoning models specifically prompted to output Product Manager standard formats (Executive Summary, Key Decisions, Action Items Table with PIC/Owner & Deadline).
- **Success Criteria:**
  - Users can input their `nvapi-` key safely without backend database persistence (in-memory/session transit only).
  - System calls NVIDIA NIM API and reliably formats Markdown output into designated sections.
  - Output cleanly separates random conversation noise from formal actionable team commitments.
- **Priority:** Critical (P0)

#### 3. Reactive UI/UX with Live Progress Tracker
- **Description:** Responsive frontend SPA built with Vite, React, and Tailwind CSS featuring dynamic state indicators (Uploading ➔ Transcribing Audio ➔ Synthesizing MoM ➔ Ready).
- **User Value:** Keeps the Product Manager fully informed during multi-minute background transcription tasks without browser guessing or UI freezing.
- **Success Criteria:**
  - Users can track exact progress stages via polling or asynchronous notifications from FastAPI.
  - System renders a polished, accessible, premium interface with fluid animations and clear visual feedback.
  - Finished MoM data is rendered immediately once processing finishes.
- **Priority:** Critical (P0)

#### 4. One-Click Markdown & Notion Export Utilities
- **Description:** Rendered Markdown view of the MoM with action buttons to copy directly to clipboard in raw Markdown or Notion-formatted rich text.
- **User Value:** Eliminates reformatting friction when moving meeting summaries into official corporate documentation channels.
- **Success Criteria:**
  - Users can click a single button to copy the formatted MoM with instant visual confirmation.
  - System preserves Markdown tables, headers, bold text, and bulleted lists perfectly for Notion, Slack, and Jira pasting.
  - Summary is immediately ready for dissemination to meeting stakeholders.
- **Priority:** Critical (P0)

## Out of Scope (Not in MVP)
| Feature | Why Wait | Planned For |
|---------|----------|-------------|
| **Multi-User Auth & Accounts** | Single user (self-hosted for PM owner/team) is the primary launch goal; adding user identity databases adds unnecessary overhead for a 1-week sprint. | Version 2 |
| **Direct PDF/DOCX Export Engine** | Markdown copy-paste covers 90% of modern Product Manager workflows (Notion/Slack/Jira/Confluence); native binary rendering can be added later. | Version 2 |
| **Real-Time Live Microphone Recording** | Post-meeting file upload is far more reliable and doesn't interfere with existing Zoom/Meet audio device routing during live meetings. | Version 2 |

## Success Metrics
### Primary Metrics
1. **Transcription & MoM Completion Time:** Under 10 minutes total processing time for a standard 1-hour audio recording by Day 7 launch.
   - How to measure: Timestamp logs in FastAPI between `/upload` initiation and Nemotron completion response.
   - Why it matters: Efficiency is the core value proposition; rapid turnaround ensures immediate post-meeting utility.
2. **System Stability under Load:** 0% OOM (Out of Memory) crashes or Nginx 504 timeouts during long audio processing.
   - How to measure: GCP VM system logs and memory monitoring during staging testing.
   - Why it matters: A dependable workday tool must run unattended without restarting the instance.

### Secondary Metrics
- **Formatting Accuracy:** 100% of generated MoMs adhere to the requested schema (Executive Summary + Action Items table).
- **Time Saved per Week:** Estimated 2–4 hours saved per PM user per week.

## UI/UX Direction
**Design Feel:** Clean, fast, professional, modern dark-mode glassmorphism.
**Inspiration:** Raycast, Linear, and modern Vercel SaaS interfaces (minimalist, typography-focused, instant visual responsiveness).

### Key Screens
1. **Dashboard & Upload Home**
   - Purpose: Main entry point to drop audio recordings and configure BYOK API key.
   - Key Elements: Brand header, drag-and-drop zone with supported file badge (.mp3/.wav/.m4a), NVIDIA API key input field (masked as password), and "Generate MoM" CTA button.
   - User Actions: Drag audio file, paste API key, click generate.
2. **Processing & Interactive Tracker Screen**
   - Purpose: Visual reassurance during heavy STT decoding and LLM summarization.
   - Key Elements: Animated spinner/loader, step-by-step milestone checklist (1. File Uploaded, 2. Transcribing via faster-whisper, 3. Synthesizing MoM via NVIDIA Nemotron), elapsed time timer.
   - User Actions: Monitor status, cancel task if needed.
3. **MoM Review & Export Screen**
   - Purpose: Presenting the finished executive minutes for reading and extraction.
   - Key Elements: Clean rendered Markdown typography, highlighted Action Items table, side-by-side raw text toggle, "Copy Markdown", and "Copy for Notion" buttons.
   - User Actions: Read summary, copy to clipboard, start new upload.

### Design Principles
- **Instant Visual Feedback:** Never leave the user guessing during multi-minute STT processing; always animate progress state.
- **Content-First Typography:** Meeting summaries must be effortlessly scannable; leverage sharp font hierarchies and high-contrast tables.
- **Frictionless BYOK:** Store the user's API key in browser session storage after initial input so they don't have to re-type it for sequential meetings during the same work session.

## Technical Considerations
**Platform:** Web (Self-hosted SPA + REST API)
**Responsive:** Yes, mobile-friendly for viewing notes, desktop-first for file uploads.
**Performance Goals:**
- Load time: < 2 seconds for SPA frontend
- Smooth micro-animations (60fps on transitions and loaders)
- STT processing leveraging optimal CPU multithreading on GCP `e2-standard-4` (4 vCPU / 16GB RAM)

**Security & Privacy:**
- API Key handling: Never stored permanently in a database; retained only in runtime memory during inference execution.
- Audio data: Temporary audio files deleted from VM disk immediately after transcription completes.
- SSL/TLS: End-to-end HTTPS enforced via Nginx and Cloudflare Origin CA certificate.

**Scalability & DevOps Workarounds:**
- Dedicated background worker pattern (`asyncio` / `BackgroundTasks` in FastAPI) ensures the server handles queued audio requests without dropping HTTP requests.
- Cloudflare upload limit workaround: Bypassing the 100MB Cloudflare HTTP proxy limit via frontend chunked sliced uploads or a dedicated DNS-only (`Grey Cloud`) upload subdomain.

## Constraints & Requirements
### Budget
- Development tools: $0 (Open-source stack: FastAPI, faster-whisper, Vite, React, Tailwind CSS)
- Hosting/Infrastructure: Pre-provisioned within existing GCP budget (GCP VM `e2-standard-4` with 4 vCPUs & 16 GB RAM)
- Third-party services: NVIDIA NIM API usage (BYOK — free developer credits or pay-as-you-go per token)
- **Total:** Minimal additional operational expenditure (existing GCP + NIM token consumption)

### Timeline
- MVP Development & Scaffold: Days 1–3
- Backend AI & UI Integration: Days 4–5
- Beta Testing, Nginx Deploy & Tuning: Days 6–7
- Launch Target: Next week (7-day sprint)

### Technical Constraints
- Must run STT effectively on CPU (no dedicated GPU hardware attached to the VM instance).
- Nginx config must explicitly extend `client_max_body_size` (e.g., 500M) and proxy read/send timeouts (300s+) to support long-duration background processing.

## Open Questions & Assumptions
- **Assumption:** Users will upload clean audio recordings (MP3/WAV/M4A/MP4) generated from standard Zoom, Google Meet, Microsoft Teams, or local voice recorder outputs.
- **Assumption:** NVIDIA NIM API (`integrate.api.nvidia.com/v1`) will maintain standard OpenAI SDK compatibility for chat completions without structural breaking changes.
- **Open Question:** Will users eventually want automatic speaker diarization (differentiating Speaker A vs Speaker B), or is unified content transcription sufficient for accurate PM Action Item extraction? (Action: Evaluate after Day 7 beta test).

## Quality Standards
**Code Quality:**
- Use TypeScript and type hinting in Python (`pydantic` models in FastAPI) to catch bugs early and enforce structured contracts.
- Handle errors explicitly (e.g., audio formatting errors, NVIDIA API expiration/unauthorized exceptions) with human-readable UI toast notifications.
- Validate STT processing against sample test audio files prior to production deployment.

**Design Quality:**
- Use modern design tokens in Tailwind for cohesive dark mode colors and balanced layout spacing.
- Ensure proper accessibility contrast ratios (WCAG AA) on text and interactive action elements.
- Maintain responsive layouts so meeting summaries read cleanly even when reviewed on mobile devices.

**What This Project Will NOT Accept:**
- Placeholder content ("Lorem ipsum") or fake mocked summaries in production launch.
- Silent fails — if transcribing an audio file fails, the UI must explain exactly why and allow instant retry.
- Exceeding cloud memory limits due to unconstrained audio buffer loading.

## Risk Mitigation
| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| **Cloudflare 100MB File Upload Reject** | High | Implement sliced chunked uploads in React or direct file transfer to a DNS-only (`Grey Cloud`) dedicated upload route in Cloudflare. |
| **RAM Spike / OOM during Whisper Audio Decoding** | High | Strictly enforce INT8 quantization in `faster-whisper` and process large files via streaming chunks; rely on the generous 16 GB memory headroom of `e2-standard-4`. |
| **NVIDIA API Key Exemption or Rate Limiting** | Medium | Implement standard exponential backoff retries and display clear UI prompts if an API key lacks available credits or permissions. |

## MVP Completion Checklist
### Development Complete
- [ ] FastAPI backend routes (`/upload`, `/status`, `/generate-mom`) functional
- [ ] `faster-whisper` STT processing tested on 1-hour audio file
- [ ] NVIDIA Nemotron NIM OpenAI SDK integration verified
- [ ] Vite React UI complete with upload drop zone, progress loader, and Markdown render view

### Launch Ready
- [ ] Nginx configured with `client_max_body_size 500M` and extended proxy timeouts
- [ ] HTTPS certificates active via Cloudflare and Let's Encrypt / Origin CA
- [ ] Temporary audio file cleanup routine tested (no disk overflow over time)

### Quality Checks
- [ ] Tested end-to-end with real Product Manager meeting recordings
- [ ] Verified copy-paste formatting in Notion and Slack
- [ ] Zero memory leaks or crash loops under multi-hour testing

## Next Steps
1. **Immediate:** Review and approve this PRD
2. **Next:** Create Technical Design Document (Part 3)
3. **Then:** Set up development environment on local machine / GCP VM
4. **Build:** Implement backend API and React frontend with AI assistance
5. **Test:** Conduct beta validation with 2-3 real meeting audio files
6. **Launch:** Deploy to GCP Nginx + Cloudflare subdomain and go live!

---
*Created: August 4, 2026*  
*Status: Ready for Technical Design*  
*Owner: Alex (Product Manager)*  
*Platform: Gemini 3.1 Pro (High)*  

---
## Handoff Context
<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: prd
- App name: AI Meeting-to-MoM Generator
- User level: C
- Target platform: web
- Budget: Flexible (GCP e2-standard-4 VM 16GB RAM + BYOK NVIDIA API)
- Timeline: 1 week (7 days)
- Source files: research-AIMeetingMoM.md → PRD-AIMeetingMoM-MVP.md
---
