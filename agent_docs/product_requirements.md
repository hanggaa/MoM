# Product Requirements

> Extracted from the PRD (`PRD-AIMeetingMoM-MVP.md`). This is the agent's quick-reference version — keep it short, focused, and up to date.

## Product Summary
- **Product:** AIMeetingMoM
- **One-liner:** Self-hosted web application for Product Managers that automates long meeting audio transcription locally and synthesizes executive Minutes of Meeting using BYOK NVIDIA Nemotron-3.
- **Target users:** Product Managers overwhelmed by multi-hour meetings who require accurate Action Item tracking and strict data privacy on their own custom domain and infrastructure.

## User Stories
- As a Product Manager, I want to upload multi-hour audio recordings without hitting network timeout or file size limits so that my long strategic syncs are captured completely.
- As a Product Manager, I want speech-to-text transcription to execute locally on my GCP VM so that sensitive internal discussions never leak to third-party STT cloud APIs.
- As a Product Manager, I want AI to automatically extract and structure transcripts into executive Action Items, Owners (PICs), and Deadlines so that I can immediately share decisions with my engineering and design teams.
- As a Product Manager, I want to securely input my own NVIDIA NIM API key (BYOK) so that I maintain 100% control over token usage, model selection, and inference costs.

## Feature List (MoSCoW)

### Must Have (MVP Core - P0)
- [ ] **BYOK Settings Management:** Secure server-side storage and testing of NVIDIA NIM API key via SQLite without exposing credentials to the front-end browser.
- [ ] **Resilient Large Audio Upload:** Frontend chunking (25MB slices via File.slice) and backend sequential reassembly to reliably bypass Cloudflare/Nginx 100MB request limitations.
- [ ] **Async Local STT Pipeline:** Asynchronous background worker using `faster-whisper` (INT8 quantization) on FastAPI `BackgroundTasks` with real-time progress percentage tracking.
- [ ] **PM-Specific AI Synthesis & Export Dashboard:** Nemotron-3 prompt engineering that produces structured JSON containing Executive Summary, Key Decisions, and Action Items (Task, PIC, Due Date), accompanied by one-click Markdown copy and downloadable `.md` export.

### Should Have (P1)
- [ ] Styled native print CSS window for immediate clean PDF rendering directly from browser without requiring heavy server-side PDF generation engines.
- [ ] Audio player controls linked to generated transcript segments to review controversial discussion timestamps.

### Could Have (P2)
- [ ] Direct automated Notion API integration to push meeting notes directly to corporate project boards.
- [ ] Speaker diarization (identifying speaker labels like Speaker A / Speaker B) using lightweight local embedding clustering.

### Won't Have (This Version - P3)
- [ ] Multi-user authentication, team roles, or multi-tenant SaaS workspace billing.
- [ ] Live microphone recording directly from browser or Zoom/Meet integration bots.

## Success Metrics
- **Processing Time:** Total turnaround time from file upload completion to final MoM generation under 10 minutes for a 2-hour audio recording on GCP VM (`e2-standard-4`).
- **Memory & Stability:** Zero Out-of-Memory (OOM) server crashes or HTTP 504 Gateway Timeouts during simultaneous upload and background transcription processing.
- **Accuracy:** 100% successful extraction of explicitly stated Action Items, Owners (PICs), and target deadlines from standard meeting test audio.

## Out of Scope
- Do NOT implement user login, registration forms, JWT auth, or multi-tenant user tables (this is a personal single-user PM instance).
- Do NOT add external cloud STT services like OpenAI Audio API or AssemblyAI (all audio MUST be transcribed by local `faster-whisper`).
- Do NOT build custom server-side PDF rendering libraries (like WeasyPrint or ReportLab) that bloat VM memory; rely strictly on browser native CSS print formatting.
