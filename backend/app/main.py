import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db
from app.api.router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIMeetingMoM")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing server and verifying SQLite database schemas...")
    init_db()
    yield
    logger.info("Shutting down AIMeetingMoM server...")

app = FastAPI(
    title="AIMeetingMoM Backend API",
    description="Self-hosted Product Manager executive STT and BYOK MoM synthesis server.",
    version="1.0.0-MVP",
    lifespan=lifespan
)

# Configure CORS for local development with Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include core routes
app.include_router(api_router)
