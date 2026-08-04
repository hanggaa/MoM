# Project Brief

- **Product vision:** Build an independent, self-hosted web application that locally transcribes long meeting recordings with high accuracy and low memory overhead, leveraging BYOK NVIDIA Nemotron-3 to automatically synthesize executive Minutes of Meeting (MoM) tailored specifically for Product Managers.
- **Target Audience:** Product Managers managing multi-hour technical syncs and strategic product review meetings who need accurate Action Items, PICs, and Deadlines without exposing confidential company discussions to third-party SaaS cloud platforms.

## Conventions
- **Naming:** snake_case for Python backend files and database columns; camelCase for JavaScript/TypeScript utilities; PascalCase for React components and Pydantic models.
- **File Structure:** Maintain strict separation in monorepo: `backend/app/` for FastAPI services/models/routes, `frontend/src/` for React pages/components/services, and `backend/storage/` for persistent SQLite database and audio archives.

## Key Principles
- Ship the simplest possible solution that solves the user story without sacrificing architectural stability or data privacy.
- Audio recordings MUST be transcribed locally on the host GCP VM using `faster-whisper` INT8 quantization to ensure zero external audio data leakage and stable memory operation under 16GB RAM.
- If a lightweight approach exists (such as direct SQLite storage over external Postgres server, or built-in Vite React SPA over SSR Next.js), always favor simplicity to reduce infrastructure maintenance tax.
