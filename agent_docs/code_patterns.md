# Code Patterns

## Purpose
This file defines the implementation patterns the agent should follow for this project.
Prefer these patterns over inventing new ones. All sections are populated from the Technical Design document.

## Architecture Pattern
- **Primary pattern:** layered (API Route Controllers -> Business & AI Services -> SQLModel Database ORM Layer)
- **Rule:** Keep domain logic separate from transport/UI concerns. Route handlers in FastAPI should only validate inputs, invoke background tasks or services, and format responses.
- **Rule:** Reuse existing modules before creating new abstractions. Keep the backend and frontend clearly divided in the monorepo workspace.

## Data Fetching
- **Primary approach:** Direct server API calls via Axios HTTP client encapsulated in reusable frontend React service hooks (with short polling for async task status updates).
- **Rule:** Do not assume a specific library. Check `tech_stack.md` for the project's chosen approach before fetching data.
- **Rule:** Keep fetch logic out of render functions unless the framework explicitly encourages it; wrap API calls inside custom React hooks (e.g., `useMeetingTaskStatus(taskId)`).

## State Management
- **Server state:** SQLModel ORM persisted directly in SQLite (`app.db`). Background task execution progress is continuously written to database task records.
- **Client state:** React built-in state (`useState`, `useCallback`, `useEffect`, and `useContext` for BYOK connection status and current active meeting view).
- **Forms:** Standard controlled React components with HTML5 validation and clean Tailwind UI feedback states.
- **Rule:** Prefer the simplest working approach for MVP scope. Do not add a state library like Redux or Zustand if React built-in state and props drilling are sufficient for a single-user application.

## Error Handling
- Normalize errors at service/API boundaries — never let raw Python traceback exceptions reach the React UI.
- Never swallow errors silently; always log with Python `logging` module server-side and trigger clean user toasts on the frontend.
- Return user-safe messages in the UI; log developer context server-side.
- Use a consistent error shape across all API responses (e.g., `{"error": true, "message": "...", "code": "..."}`).

## Validation
- Validate all external inputs (user upload forms, API payloads, environment variables).
- Apply runtime validation at system boundaries: use FastAPI Pydantic request models in Python, and strong interface definitions in TypeScript/React.
- Keep validation rules co-located with the relevant contract (e.g., next to the API route or form schema).
- Reject uploaded audio files that are not `.mp3`, `.wav`, `.m4a`, or `.aac` before processing chunk assembly.

## File and Naming Conventions
- **Files:** camelCase for TypeScript/JavaScript utility files, PascalCase for React JSX/TSX components, snake_case for Python backend scripts and modules.
- **Components / classes:** PascalCase (e.g., `AudioUploader`, `MoMCard`, `TranscriptionWorker`)
- **Functions / variables:** camelCase in JS/TS (e.g., `handleFileUpload`, `fetchTaskStatus`), snake_case in Python (e.g., `process_audio_chunk`, `save_mom_record`)
- **Constants / env vars:** UPPER_SNAKE_CASE (e.g., `MAX_CHUNK_SIZE_MB`, `NVIDIA_NIM_BASE_URL`)

## Testing Pattern
- Add unit tests for pure logic and utility functions (e.g., audio chunk reassembly logic, prompt string builders, Markdown exporter formatting).
- Add integration tests for API contracts and critical data flows (e.g., POST `/api/upload/chunk` and GET `/api/tasks/{task_id}`).
- Add E2E tests only for the top user journeys the PRD marks as must-have (audio upload -> transcription -> MoM display & markdown copy).
- Run the test suite after every feature; fix failures before moving on.

## Change Discipline
- Prefer focused, minimal edits over large rewrites.
- Do not introduce new dependencies without checking the existing stack in `tech_stack.md` first.
- Do not change database migrations, infrastructure config, auth flows, or BYOK encryption code without explicit approval.
- One feature at a time — commit or checkpoint after each working feature.
