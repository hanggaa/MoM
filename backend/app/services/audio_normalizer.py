"""Temporary audio normalization for reliable speaker diarization."""

import logging
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)


class AudioNormalizationError(RuntimeError):
    """Raised when FFmpeg cannot create a diarization-safe audio file."""


def normalize_for_diarization(source_path: str | Path, output_dir: str | Path) -> Path:
    """Create a temporary lossless 16 kHz mono FLAC for pyannote."""
    source = Path(source_path)
    if not source.is_file():
        raise FileNotFoundError(f"Audio recording file missing at: {source}")

    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        prefix="diarization-",
        suffix=".flac",
        dir=destination,
        delete=False,
    ) as temporary_file:
        normalized_path = Path(temporary_file.name)

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "flac",
        str(normalized_path),
    ]

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        if not normalized_path.is_file() or normalized_path.stat().st_size == 0:
            raise AudioNormalizationError(
                "FFmpeg produced an empty diarization audio file."
            )
    except OSError as exc:
        normalized_path.unlink(missing_ok=True)
        raise AudioNormalizationError(
            f"FFmpeg could not start speaker diarization normalization: {exc}"
        ) from exc
    except subprocess.CalledProcessError as exc:
        normalized_path.unlink(missing_ok=True)
        details = (exc.stderr or "FFmpeg exited with an error.").strip()
        raise AudioNormalizationError(
            f"Could not normalize audio for speaker diarization: {details[:500]}"
        ) from exc
    except AudioNormalizationError:
        normalized_path.unlink(missing_ok=True)
        raise

    logger.info("Created temporary diarization audio at %s", normalized_path)
    return normalized_path


@contextmanager
def normalized_audio_for_diarization(
    source_path: str | Path, output_dir: str | Path
) -> Iterator[Path]:
    """Yield normalized audio and remove it after success or failure."""
    normalized_path = normalize_for_diarization(source_path, output_dir)
    try:
        yield normalized_path
    finally:
        try:
            normalized_path.unlink(missing_ok=True)
        except OSError:
            logger.exception(
                "Could not remove temporary diarization audio at %s",
                normalized_path,
            )
