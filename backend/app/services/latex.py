import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from ..config import get_settings


class LatexCompileError(RuntimeError):
    def __init__(self, message: str, log_tail: str = "") -> None:
        super().__init__(message)
        self.log_tail = log_tail


def _build_env(tectonic_path: str) -> dict:
    """Compose the environment for Tectonic.

    On Windows, the standalone tectonic.exe needs FONTCONFIG_FILE pointing at
    a valid fonts.conf, otherwise fontconfig errors out before compilation
    even starts ("Cannot load default config file"). We auto-pick the
    fonts.conf that lives next to the binary if one is there.
    """
    env = os.environ.copy()
    binary_dir = Path(tectonic_path).parent
    candidate = binary_dir / "fonts.conf"
    if candidate.exists() and "FONTCONFIG_FILE" not in env:
        env["FONTCONFIG_FILE"] = str(candidate)
    # Ensure HOME is set so Tectonic can locate its cache directory on Windows.
    if "HOME" not in env and "USERPROFILE" in env:
        env["HOME"] = env["USERPROFILE"]
    return env


def compile_latex_to_pdf(latex_source: str, timeout_sec: int = 120) -> bytes:
    """Compile a single .tex string to PDF bytes using Tectonic."""
    settings = get_settings()
    tectonic = shutil.which(settings.tectonic_bin) or settings.tectonic_bin

    env = _build_env(tectonic)

    with tempfile.TemporaryDirectory(prefix="stride_tex_") as tmp:
        tmp_path = Path(tmp)
        tex_file = tmp_path / "resume.tex"
        tex_file.write_text(latex_source, encoding="utf-8")

        try:
            proc = subprocess.run(
                [
                    tectonic,
                    "--keep-logs",
                    "--chatter=minimal",
                    "--outdir",
                    str(tmp_path),
                    str(tex_file),
                ],
                cwd=tmp_path,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
                env=env,
            )
        except FileNotFoundError as exc:
            raise LatexCompileError(
                "Tectonic binary not found. Install it and set TECTONIC_BIN."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise LatexCompileError("LaTeX compile timed out.") from exc

        if proc.returncode != 0:
            log_file = tmp_path / "resume.log"
            log_tail = ""
            if log_file.exists():
                log_tail = "\n".join(log_file.read_text(errors="ignore").splitlines()[-40:])
            stderr_tail = (proc.stderr or "").strip()[:500]
            raise LatexCompileError(
                f"Tectonic failed (exit {proc.returncode}): {stderr_tail}",
                log_tail=log_tail,
            )

        pdf_path = tmp_path / "resume.pdf"
        if not pdf_path.exists():
            raise LatexCompileError("Tectonic reported success but no PDF was produced.")
        return pdf_path.read_bytes()
