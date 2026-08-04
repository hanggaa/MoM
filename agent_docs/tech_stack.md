# Tech Stack & Tools

- **Frontend:** React 18 + Vite 5 (Single Page Application architecture)
- **Backend:** Python 3.11+ / FastAPI (Asynchronous execution engine with BackgroundTasks)
- **Database:** SQLite 3 with SQLModel (Pydantic + SQLAlchemy integration)
- **Styling:** Tailwind CSS + Lucide React (Icons) + Glassmorphic dark theme variables
- **Authentication & Security:** Single-user BYOK (Bring Your Own Key) architecture; API key stored in server-side SQLite table with zero client exposure
- **AI & ML Integration:** Local `faster-whisper` (INT8 quantization via CTranslate2) for audio Speech-to-Text + NVIDIA Nemotron-3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b`) via official `openai` Python SDK with custom endpoint
- **Infrastructure:** GCP Virtual Machine (`e2-standard-4`, 4 vCPU, 16 GB RAM) with Nginx Reverse Proxy & Cloudflare SSL/DNS

## Error Handling Pattern
```python
# FastAPI backend standardized error handling pattern for background processing and AI API calls
from fastapi import HTTPException, status
from openai import APIConnectionError, RateLimitError
import logging

logger = logging.getLogger(__name__)

async def call_nvidia_nim_synthesis(client, prompt: str):
    try:
        response = await client.chat.completions.create(
            model="nvidia/nemotron-3-ultra-550b-a55b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded on NVIDIA NIM: {e}")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="NVIDIA NIM rate limit exceeded. Retrying shortly.")
    except APIConnectionError as e:
        logger.error(f"Connection error to NVIDIA server: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="NVIDIA inference service unreachable.")
    except Exception as e:
        logger.critical(f"Unexpected LLM synthesis error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to synthesize meeting notes.")
```

## Styling & Component Examples
```tsx
// React + Tailwind CSS canonical glassmorphic MoM Action Item Card component
import React from 'react';
import { Calendar, User, CheckCircle2 } from 'lucide-react';

interface ActionItemProps {
  task: string;
  ownerPic: string;
  dueDate: string;
  isCompleted?: boolean;
}

export const ActionItemCard: React.FC<ActionItemProps> = ({ task, ownerPic, dueDate, isCompleted = false }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-800/60 backdrop-blur-md border border-slate-700/50 hover:border-cyan-500/50 transition-all shadow-lg flex items-start gap-4">
      <div className={`mt-1 p-2 rounded-lg ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
        <CheckCircle2 size={20} />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-slate-100 font-medium text-base leading-snug">{task}</p>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
          <span className="inline-flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-md text-cyan-400 border border-slate-700/40">
            <User size={13} /> {ownerPic}
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-md text-rose-400 border border-slate-700/40">
            <Calendar size={13} /> {dueDate}
          </span>
        </div>
      </div>
    </div>
  );
};
```
