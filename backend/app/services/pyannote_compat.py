"""
Compatibility patches for pyannote.audio 3.1.x running with modern dependencies.

pyannote.audio 3.1.1 was written for:
  - torchaudio < 2.2  (uses torchaudio.backend.common, set/get_audio_backend)
  - numpy < 2.0       (uses np.NaN)
  - huggingface_hub < 0.24  (uses use_auth_token kwarg)
  - torch < 2.6       (uses torch.load with weights_only=False default)

This module monkey-patches all four libraries so pyannote 3.1.x works
on a modern Python ML stack without downgrading anything.

Call apply_pyannote_compat_patches(hf_cache_dir) once before
`from pyannote.audio import Pipeline`.
"""

import os
import sys
import types
import logging

logger = logging.getLogger(__name__)

_PATCHES_APPLIED = False


def apply_pyannote_compat_patches(hf_cache_dir: str) -> None:
    """Apply all compatibility patches. Safe to call multiple times."""
    global _PATCHES_APPLIED
    if _PATCHES_APPLIED:
        return
    _PATCHES_APPLIED = True
    logger.info("Applying pyannote 3.1.x compatibility patches for modern dependencies...")

    _patch_torchaudio()
    _patch_numpy()
    _patch_torch()
    _patch_huggingface_hub(hf_cache_dir)

    logger.info("All pyannote compatibility patches applied successfully.")


def _patch_torchaudio() -> None:
    """torchaudio >= 2.2.0 removed the backend module, set/get_audio_backend."""
    import torchaudio

    if not hasattr(torchaudio, "set_audio_backend"):
        torchaudio.set_audio_backend = lambda backend: None
    if not hasattr(torchaudio, "get_audio_backend"):
        torchaudio.get_audio_backend = lambda: "soundfile"

    if "torchaudio.backend" not in sys.modules or "torchaudio.backend.common" not in sys.modules:
        backend_mod = types.ModuleType("torchaudio.backend")
        backend_mod.__package__ = "torchaudio.backend"
        common_mod = types.ModuleType("torchaudio.backend.common")
        common_mod.__package__ = "torchaudio.backend"

        if hasattr(torchaudio, "AudioMetaData"):
            common_mod.AudioMetaData = torchaudio.AudioMetaData
        else:
            from dataclasses import dataclass

            @dataclass
            class _AudioMetaData:
                sample_rate: int = 0
                num_frames: int = 0
                num_channels: int = 0
                bits_per_sample: int = 0
                encoding: str = ""

            common_mod.AudioMetaData = _AudioMetaData

        backend_mod.common = common_mod
        torchaudio.backend = backend_mod
        sys.modules["torchaudio.backend"] = backend_mod
        sys.modules["torchaudio.backend.common"] = common_mod
        logger.info("Patched torchaudio.backend.common module")


def _patch_numpy() -> None:
    """NumPy 2.0+ removed np.NaN."""
    import numpy as np

    if not hasattr(np, "NaN"):
        np.NaN = np.nan
        logger.info("Patched np.NaN -> np.nan")


def _patch_torch() -> None:
    """PyTorch 2.6+ changed torch.load default to weights_only=True.
    pyannote checkpoints require weights_only=False to load."""
    import torch

    _original_torch_load = torch.load

    def _patched_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _original_torch_load(*args, **kwargs)

    torch.load = _patched_torch_load
    logger.info("Patched torch.load to default weights_only=False")


def _patch_huggingface_hub(hf_cache_dir: str) -> None:
    """huggingface_hub >= 0.24 removed use_auth_token kwarg.
    pyannote 3.1.x still passes it internally. We intercept and translate."""
    import huggingface_hub
    import huggingface_hub.constants

    forced_hub_cache = os.path.join(hf_cache_dir, "hub")
    os.makedirs(forced_hub_cache, exist_ok=True)

    # Override cached constants
    huggingface_hub.constants.HF_HOME = hf_cache_dir
    huggingface_hub.constants.HF_HUB_CACHE = forced_hub_cache
    if hasattr(huggingface_hub.constants, "HUGGINGFACE_HUB_CACHE"):
        huggingface_hub.constants.HUGGINGFACE_HUB_CACHE = forced_hub_cache

    # Patch hf_hub_download
    _original_hf_hub_download = huggingface_hub.file_download.hf_hub_download

    def _patched_hf_hub_download(*args, **kwargs):
        if "use_auth_token" in kwargs:
            kwargs["token"] = kwargs.pop("use_auth_token")
        kwargs["cache_dir"] = forced_hub_cache
        return _original_hf_hub_download(*args, **kwargs)

    huggingface_hub.file_download.hf_hub_download = _patched_hf_hub_download
    huggingface_hub.hf_hub_download = _patched_hf_hub_download

    # Patch HfApi.model_info
    if hasattr(huggingface_hub, "hf_api"):
        _HfApi = huggingface_hub.hf_api.HfApi
        _original_model_info = _HfApi.model_info

        def _patched_model_info(self, *args, **kwargs):
            if "use_auth_token" in kwargs:
                kwargs["token"] = kwargs.pop("use_auth_token")
            return _original_model_info(self, *args, **kwargs)

        _HfApi.model_info = _patched_model_info

    logger.info(f"Patched huggingface_hub (cache -> {forced_hub_cache})")
