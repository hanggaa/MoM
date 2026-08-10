# System Memory & Context 🧠
<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal
**Current Task:** Complete! Phase 5: Product Evolution & Advanced Capabilities fully integrated and verified across full-stack monorepo.
**Next Steps:** Ready for live PM execution and further iterative enhancements as requested by user.

## 📂 Architectural Decisions
*(Log specific choices made during the build here so future agents respect them)*
- 2026-08-04 — Chose React + Vite over Next.js SPA for fast local development build times, simple static asset hosting, and clean separation from Python backend.
- 2026-08-04 — Chose SQLite with SQLModel ORM over PostgreSQL to zero out database administration overhead for single-user PM workload on GCP VM.
- 2026-08-04 — Chose local `faster-whisper` (INT8 quantization) over cloud STT APIs to guarantee total meeting audio privacy and avoid OOM RAM spikes on GCP `e2-standard-4` (16GB RAM) VM.
- 2026-08-04 — Chose NVIDIA Nemotron-3 (`nvidia/nemotron-3-ultra-550b-a55b`) via OpenAI Python SDK (custom `base_url`) with BYOK user-managed tokens for executive summary reasoning.
- 2026-08-04 — Built chunked audio upload using client-side `File.slice(start, end)` into 25MB blobs, reassembled in temporary server folder `backend/storage/chunks/`, ensuring zero 100MB Cloudflare HTTP body limit rejections.
- 2026-08-04 — Wired `faster-whisper` execution into FastAPI `BackgroundTasks` via `run_stt_task`, updating SQLite `Task` table with real-time percentage milestones (10% to 100%) polled every 2s via `GET /api/tasks/{task_id}` by `TaskMonitor.jsx` to eliminate Nginx 504 Gateway Timeouts.
- 2026-08-04 — Implemented Phase 2C: automated chaining of Nemotron-3 executive MoM synthesis at 90% STT worker progress (`status = 'SYNTHESIZING'`), storing structured output directly into `Meeting.mom_data` in SQLite, with standalone re-synthesis support (`POST /api/meetings/{id}/synthesize`).
- 2026-08-04 — Developed `MoMViewer.jsx` with section parsing, one-click Markdown copy, raw `.md` file downloads, and native browser Print/PDF styles (`print:hidden`, `break-inside-avoid`).
- 2026-08-04 — Implemented exponential backoff and retry wrapping (3 retries, base delay 2s) in `mom_synthesizer.py` (`synthesize_mom_sync`) to withstand intermittent NIM API timeouts or socket errors.
- 2026-08-04 — Exposed streaming audio endpoint (`GET /api/meetings/{id}/audio`) using FastAPI `FileResponse` and embedded an HTML5 audio playback deck inside `MoMViewer.jsx` for synchronous note-and-audio verification.
- 2026-08-04 — Completed RAM Performance Audit: Verified INT8 quantization limits inference RAM consumption to ~3.5 GB – 4.0 GB peak, utilizing only 28% of the 16 GB memory on GCP `e2-standard-4`, entirely eliminating OOM risks during 2-hour recordings.
- 2026-08-04 — Added lightweight self-healing table schema checks (`ALTER TABLE ... ADD COLUMN`) inside `init_db()` in `database.py` to prevent OperationalErrors when running against developer physical SQLite DB files across schema evolutions.
- 2026-08-04 — Scoped FastAPI dependency overrides (`app.dependency_overrides[get_session]`) and module mocks inside individual test fixtures rather than at module import time to ensure complete test suite isolation across multi-file pytest runs.
- 2026-08-10 — Transitioned `meeting.mom_data` column from raw Markdown strings to JSON dictionary strings `{"style": "markdown"}` to support multi-style synthesis side-by-side in `MoMViewer.jsx` tabs without requiring SQLite schema migrations. Legacy raw markdown is gracefully handled and coerced into "General Executive MoM".
## 🐛 Known Issues & Quirks
*(Log current bugs or weird workarounds here)*
- Cloudflare Free/Pro enforces a strict 100MB HTTP request body limitation; frontend audio upload slices files into 25MB chunks and uploads sequentially to `/api/upload/chunk`. (SOLVED via `AudioUploader.jsx` & `upload_service.py`).
- Nginx and Cloudflare will terminate long-running synchronous requests with HTTP 504 Gateway Timeout; STT processing executes via FastAPI `BackgroundTasks`, communicating progress back to UI via polling `GET /api/tasks/{id}`. (SOLVED via `stt_worker.py` & `TaskMonitor.jsx`).
- SQLite cross-thread connection sharing during pytest executions requires configuring test engines with `StaticPool` and `connect_args={"check_same_thread": False}`.

## 📜 Completed Phases
- [x] Part 1: Deep Research and technical constraint resolution (`research-AIMeetingMoM.md`)
- [x] Part 2: Product Requirements Document validation (`PRD-AIMeetingMoM-MVP.md`)
- [x] Part 3: Technical Design Document completion (`TechDesign-AIMeetingMoM-MVP.md`)
- [x] Phase 1: Initial scaffold and foundation setup (Monorepo, SQLModel SQLite DB, BYOK settings endpoint & React Glassmorphic Modal)
- [x] Phase 2A & 2B: Resilient Chunked Audio Upload & Asynchronous STT Transcription Pipeline (`faster-whisper` INT8 in BackgroundTasks + `TaskMonitor.jsx`)
- [x] Phase 2C: PM-Specific AI MoM Synthesis (Nemotron-3 prompt engineering) and interactive Dashboard viewer (`MoMViewer.jsx`)
- [x] Phase 3: UI polish, audio playback review deck, exponential backoff NIM retries, and INT8 RAM memory audit
- [x] Phase 4: Production deployment verification (Security audit pass, production Vite build, and 100% passing E2E tests)
- [x] Phase 5: Product Evolution & Advanced Capabilities (STT resolution accuracy selector, custom technical vocabulary biasing, bilingual 🇮🇩/🇬🇧 MoM synthesis style controls, and real-time smart archive disk cleanup)
- [x] Phase 6: Intelligent PM Workspace (Clickable markdown audio timestamps via ReactMarkdown interceptor, Nemotron-3 auto-drafted follow-up meeting agenda, and meeting productivity & sentiment scoring)
