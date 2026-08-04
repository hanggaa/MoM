# AGENTS.md — Master Plan for AIMeetingMoM

<!--
Single source of truth for every AI coding assistant on this project.
Keep it lean — details live in the Context Files at the bottom. Update Current State and Roadmap as you build.
-->

## Project Overview & Stack
**App:** AIMeetingMoM
**Overview:** Self-hosted web application for Product Managers that automates long meeting audio transcription locally and synthesizes executive Minutes of Meeting (MoM). Designed to eliminate 2–4 hours of weekly manual meeting documentation with zero third-party audio privacy risks.
**Stack:** Frontend: React + Vite + Tailwind CSS. Backend: Python + FastAPI + faster-whisper (INT8). Database: SQLite with SQLModel ORM. Infrastructure: Nginx + Cloudflare reverse proxy on GCP VM (e2-standard-4, 16GB RAM) with BYOK NVIDIA NIM API (Nemotron-3 Ultra).
**Critical Constraints:** Local CPU transcription only (never send raw audio to external APIs); chunked audio upload (25MB slices) to bypass Cloudflare 100MB body limit; async background processing for STT to prevent Nginx 504 Gateway Timeouts; BYOK API keys securely stored server-side in SQLite (zero exposure to client).

## Setup & Commands
Execute these commands for standard development workflows. Do not invent new package manager commands.
- **Setup:** `cd backend && python3 -m venv venv && source venv/bin/activate && pip install fastapi uvicorn[standard] faster-whisper sqlmodel openai python-multipart pytest && cd ../frontend && npm install`
- **Development:** `cd backend && uvicorn app.main:app --reload --port 8000` (Backend) | `cd frontend && npm run dev` (Frontend)
- **Testing:** `cd backend && pytest` (Backend) | `cd frontend && npm test` (Frontend)
- **Linting & Formatting:** `cd backend && flake8 app/ && black --check app/` (Backend) | `cd frontend && npm run lint` (Frontend)
- **Build:** `cd frontend && npm run build`

## Protected Areas 🛡️
Do NOT modify these without explicit human approval:
- **Secrets:** NEVER commit `.env` files or hardcode API keys, tokens, or passwords. Use environment variables and ask the human to set them up.
- **Infrastructure:** `deploy/`, Dockerfiles, Nginx configurations (`nginx.conf`), and deployment workflows.
- **Database Migrations:** Existing migration files and SQLite storage folder (`backend/storage/`).
- **Third-Party Integrations:** BYOK NVIDIA NIM integration client and encryption mechanics.

## Coding Conventions
- **Formatting:** ESLint + Prettier for frontend React/TSX; Black + Flake8 for backend Python (zero lint errors or warnings in new code).
- **Architecture:** layered (Route controllers handle HTTP request/response ONLY -> Business logic & AI clients live in services -> Database interactions via SQLModel ORM).
- **Testing:** All new utilities get unit tests (pytest for Python services, Vitest for React components). Core user flows get integration tests.
- **Type Safety:** Use strict typing. In Python, use Pydantic schemas and type hints for all endpoints. In TypeScript/JS, avoid `any`; define precise interfaces or use `unknown`.

## How I Should Think 🧠
1. **Understand Intent First:** Identify what the user actually needs before answering.
2. **Ask If Unsure:** If critical information is missing, ask ONE specific question before proceeding.
3. **Plan Before Coding:** Propose a brief step-by-step plan and wait for approval before changing more than one file. (If your tool has a plan/reflect mode, use it.)
4. **Execute Incrementally:** Build one feature at a time. Prefer refactoring over rewriting large blocks.
5. **Verify After Changes:** Run tests/linters or manual checks after each logical change; fix failures before moving on (see `REVIEW-CHECKLIST.md`).
6. **Explain Trade-offs:** When recommending something, briefly mention alternatives.
7. **Remember in Files:** Write state and decisions to `MEMORY.md` instead of relying on chat history.
8. **Use Subagents If Available:** If your tool supports subagents or parallel agents, assign roles and require a plan before edits.

## What NOT To Do ⛔
- Do NOT delete files without explicit confirmation.
- Do NOT modify database schemas without a backup plan.
- Do NOT add features not in the current phase.
- Do NOT skip tests for "simple" changes.
- Do NOT bypass failing tests or pre-commit hooks.
- Do NOT use deprecated libraries or patterns.
- Do NOT run STT or LLM synthesis in synchronous HTTP request threads; always use FastAPI BackgroundTasks or async workers.

## Engineering Constraints 🏗️
- **Type Safety:** The `any` type is forbidden — use `unknown` with type guards. All function parameters and returns are typed. Validate external input with a runtime schema (Pydantic in Python, Zod/PropTypes in React).
- **Architectural Sovereignty:** Route/UI layers handle request/response ONLY. Business logic lives in services/core modules. No database calls directly from route handlers.
- **Library Governance:** Check `requirements.txt` or `package.json` before suggesting new dependencies. Prefer native APIs over libraries. Use the data-fetching approach specified in `agent_docs/tech_stack.md`.
- **Clear Communication:** State issues briefly and fix them — no apology loops or filler. If context is missing, ask ONE specific clarifying question.
- **Workflow Discipline:** Pre-commit hooks must pass before commits (or ask before bypassing). If verification fails, fix it before continuing.

## Current State 📍
**Last Updated:** 2026-08-04
**Working On:** Complete (All phases verified and passing)
**Recently Completed:** Phase 4: Launch (Security audit verification, zero API key leakage confirmation, production Nginx/Systemd deploy configs verified, and 100% passing E2E tests)
**Blocked By:** None

## Roadmap 🗺️

### Phase 1: Foundation
- [x] Initialize monorepo structure (`backend/` and `frontend/`)
- [x] Set up SQLite database with SQLModel tables (`app_settings`, `meetings`, `tasks`)
- [x] Configure FastAPI CORS and Vite development proxy
- [x] Implement BYOK settings modal and secure backend key storage endpoint

### Phase 2: Core Features
- [x] Resilient Large Audio Upload via Chunking (Frontend 25MB File.slice + Backend reassembly endpoint)
- [x] Asynchronous STT Transcription Pipeline (`faster-whisper` INT8 in FastAPI BackgroundTasks + Progress tracking)
- [x] PM-Specific AI MoM Synthesis (NVIDIA Nemotron-3 prompt engineering for Action Items, PIC, Due Dates)
- [x] Interactive MoM Dashboard & Export Engine (Copy Markdown, Download .md, Native PDF print view)

### Phase 3: Polish
- [x] Error handling and exponential backoff retries for NVIDIA NIM API calls
- [x] Mobile and tablet responsiveness and local STT audio review playback in dashboard
- [x] Performance pass (RAM usage validation under 16GB limit during STT execution on e2-standard-4)

### Phase 4: Launch
- [x] Security pass (see `REVIEW-CHECKLIST.md` — confirm zero key leakage in bundles)
- [x] Deploy to production GCP VM (`e2-standard-4`) with Nginx reverse proxy and Systemd service (Verified configs in `deploy/`)
- [x] Launch verification test with 2-hour sample meeting audio (`test_e2e_production_pipeline_verification` passing 100%)

## Context Files 📚
Load these only when needed — progressive disclosure keeps context lean:
- `agent_docs/tech_stack.md` — Stack details, libraries, setup commands
- `agent_docs/code_patterns.md` — Architecture and code style rules
- `agent_docs/project_brief.md` — Product vision and conventions
- `agent_docs/product_requirements.md` — Feature list and user stories
- `agent_docs/testing.md` — Test strategy and commands
- `MEMORY.md` — Session memory: decisions, known issues, active goal
- `REVIEW-CHECKLIST.md` — Definition of done before marking work complete
- `specs/` — Feature specs and handoff notes created during the build
