import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Secure local cache directories for Whisper AI models (prevents /var/www/.cache permission error under www-data user)
CACHE_DIR = STORAGE_DIR / "cache"
HF_CACHE_DIR = STORAGE_DIR / "hf_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
HF_CACHE_DIR.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("HF_HOME", str(HF_CACHE_DIR))
os.environ.setdefault("XDG_CACHE_HOME", str(CACHE_DIR))

# Database
DATABASE_FILE = STORAGE_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# NVIDIA NIM AI Configuration
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_NIM_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"

# App Settings Keys
KEY_NVIDIA_API_KEY = "NVIDIA_NIM_API_KEY"
KEY_STT_MODEL_SIZE = "STT_MODEL_SIZE"
KEY_STT_CUSTOM_VOCAB = "STT_CUSTOM_VOCAB"
KEY_DEFAULT_LANGUAGE = "DEFAULT_OUTPUT_LANGUAGE"
KEY_DEFAULT_STYLE = "DEFAULT_MEETING_STYLE"
