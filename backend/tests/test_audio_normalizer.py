import subprocess
from contextlib import nullcontext
from pathlib import Path

import pytest

from app.services import audio_normalizer


def test_normalize_for_diarization_builds_lossless_16khz_mono_flac(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source_path = tmp_path / "meeting.mp3"
    source_path.write_bytes(b"compressed-audio")
    command_seen: list[str] = []

    def fake_run(
        command: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        command_seen.extend(command)
        Path(command[-1]).write_bytes(b"normalized-flac")
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    output_path = audio_normalizer.normalize_for_diarization(source_path, tmp_path)

    assert output_path.exists()
    assert output_path.suffix == ".flac"
    assert command_seen == [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "flac",
        str(output_path),
    ]


@pytest.mark.parametrize("raise_inside_context", [False, True])
def test_normalized_audio_context_always_removes_temporary_file(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    raise_inside_context: bool,
) -> None:
    source_path = tmp_path / "meeting.m4a"
    source_path.write_bytes(b"compressed-audio")
    normalized_path: Path | None = None

    def fake_run(
        command: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        Path(command[-1]).write_bytes(b"normalized-flac")
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    expectation = pytest.raises(RuntimeError) if raise_inside_context else nullcontext()
    with expectation:
        with audio_normalizer.normalized_audio_for_diarization(
            source_path, tmp_path
        ) as temporary_path:
            normalized_path = temporary_path
            assert temporary_path.exists()
            if raise_inside_context:
                raise RuntimeError("simulated diarization failure")

    assert normalized_path is not None
    assert not normalized_path.exists()


def test_normalize_for_diarization_cleans_up_failed_conversion(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source_path = tmp_path / "meeting.aac"
    source_path.write_bytes(b"compressed-audio")

    def fake_run(
        command: list[str],
        *,
        check: bool,
        capture_output: bool,
        text: bool,
    ) -> subprocess.CompletedProcess[str]:
        Path(command[-1]).write_bytes(b"partial-output")
        raise subprocess.CalledProcessError(1, command, stderr="invalid audio")

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(audio_normalizer.AudioNormalizationError, match="invalid audio"):
        audio_normalizer.normalize_for_diarization(source_path, tmp_path)

    assert list(tmp_path.glob("diarization-*.flac")) == []
