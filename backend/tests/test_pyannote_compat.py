import sys
import types
from pathlib import Path
from typing import Callable

import pytest

from app.services import pyannote_compat


def test_apply_patches_can_retry_after_partial_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[str] = []

    def record(name: str) -> Callable[[], None]:
        return lambda: calls.append(name)

    def fail_numpy_patch() -> None:
        calls.append("numpy-failed")
        raise RuntimeError("simulated patch failure")

    monkeypatch.setattr(pyannote_compat, "_PATCHES_APPLIED", False)
    monkeypatch.setattr(pyannote_compat, "_patch_torchaudio", record("torchaudio"))
    monkeypatch.setattr(pyannote_compat, "_patch_numpy", fail_numpy_patch)
    monkeypatch.setattr(pyannote_compat, "_patch_torch", record("torch"))
    monkeypatch.setattr(
        pyannote_compat,
        "_patch_huggingface_hub",
        lambda cache_dir: calls.append(f"hub:{cache_dir}"),
    )

    with pytest.raises(RuntimeError, match="simulated patch failure"):
        pyannote_compat.apply_pyannote_compat_patches(str(tmp_path))

    assert pyannote_compat._PATCHES_APPLIED is False

    monkeypatch.setattr(pyannote_compat, "_patch_numpy", record("numpy"))
    pyannote_compat.apply_pyannote_compat_patches(str(tmp_path))

    assert pyannote_compat._PATCHES_APPLIED is True
    assert calls == [
        "torchaudio",
        "numpy-failed",
        "torchaudio",
        "numpy",
        "torch",
        f"hub:{tmp_path}",
    ]


def test_huggingface_patch_imports_file_download_submodule_explicitly(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    hub_module = types.ModuleType("huggingface_hub")
    hub_module.__path__ = []
    constants_module = types.ModuleType("huggingface_hub.constants")
    constants_module.HF_HOME = "old-home"
    constants_module.HF_HUB_CACHE = "old-cache"
    file_download_module = types.ModuleType("huggingface_hub.file_download")
    hf_api_module = types.ModuleType("huggingface_hub.hf_api")

    def original_download(*args: object, **kwargs: object) -> dict[str, object]:
        return {"args": args, "kwargs": kwargs}

    file_download_module.hf_hub_download = original_download

    class FakeHfApi:
        def model_info(self, *args: object, **kwargs: object) -> dict[str, object]:
            return {"args": args, "kwargs": kwargs}

    hf_api_module.HfApi = FakeHfApi
    hub_module.constants = constants_module
    hub_module.hf_hub_download = original_download

    monkeypatch.setitem(sys.modules, "huggingface_hub", hub_module)
    monkeypatch.setitem(sys.modules, "huggingface_hub.constants", constants_module)
    monkeypatch.setitem(
        sys.modules, "huggingface_hub.file_download", file_download_module
    )
    monkeypatch.setitem(sys.modules, "huggingface_hub.hf_api", hf_api_module)

    pyannote_compat._patch_huggingface_hub(str(tmp_path))

    result = file_download_module.hf_hub_download("repo/file", use_auth_token="secret")
    assert result["kwargs"] == {
        "token": "secret",
        "cache_dir": str(tmp_path / "hub"),
    }
    model_info_result = FakeHfApi().model_info("repo", use_auth_token="secret")
    assert model_info_result["kwargs"] == {"token": "secret"}
