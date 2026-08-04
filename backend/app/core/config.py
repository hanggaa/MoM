import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_FILE = STORAGE_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# NVIDIA NIM AI Configuration
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_NIM_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"

# App Settings Keys
KEY_NVIDIA_API_KEY = "NVIDIA_NIM_API_KEY"
