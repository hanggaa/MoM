# Testing Strategy

## Frameworks
- **Unit & Integration Tests (Backend):** pytest (with `pytest-asyncio` and `httpx` for testing FastAPI endpoints and background workers)
- **Unit Tests (Frontend):** Vitest + React Testing Library (for verifying UI components, upload state hooks, and Markdown formatting logic)
- **E2E Tests:** Playwright (for automated end-to-end browser simulation of file upload chunking, processing progress monitoring, and clipboard export functionality)

## Rules & Requirements
- **Coverage:** Aim for 80% code coverage on critical application paths (specifically audio chunk reassembly services and BYOK key encryption/storage logic).
- **Before Commit:** Always run `cd backend && pytest && cd ../frontend && npm test` before verifying a task is complete.
- **Failures:** NEVER skip tests or mock out assertions to make a pipeline pass without Human approval. If an Agent breaks a test or introduces memory leaks, the Agent must fix it immediately.
- **Memory Safety Verification:** During local staging tests on GCP VM, ensure `htop` or `psutil` assertions confirm that memory consumption never exceeds 12GB during simulated `faster-whisper` INT8 processing runs.

## Execution
- Command to run all backend tests: `cd backend && pytest -v`
- Command to run all frontend tests: `cd frontend && npm test`
- Command to run a single Python test file: `cd backend && pytest tests/test_upload_service.py -v`
- Command to run Playwright E2E browser suite: `cd frontend && npx playwright test`
