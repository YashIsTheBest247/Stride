import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import NamedTuple

from ..config import get_settings


class LatexCompileError(RuntimeError):
    def __init__(self, message: str, log_tail: str = "") -> None:
        super().__init__(message)
        self.log_tail = log_tail


class CompileResult(NamedTuple):
    pdf: bytes
    pages: int  # 0 = unknown (log line not found / unparseable)


# TeX writes e.g. "Output written on resume.pdf (1 page, 51234 bytes)." at the
# end of a successful run. We read the page count from there — reliable and
# free, no PDF parsing needed.
_PAGE_COUNT_RE = re.compile(r"Output written on .*?\((\d+)\s+pages?", re.DOTALL)


def _page_count_from_log(log_text: str) -> int:
    m = _PAGE_COUNT_RE.search(log_text)
    return int(m.group(1)) if m else 0


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


def compile_latex_to_pdf(latex_source: str, timeout_sec: int = 120) -> CompileResult:
    """Compile a single .tex string to PDF bytes using Tectonic.

    Returns the PDF bytes plus the rendered page count (0 if the count couldn't
    be read from the log) so callers can decide whether one-page shrinking is
    needed.
    """
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
                log_tail = "\n".join(log_file.read_text(errors="ignore").splitlines()[-80:])
            stderr_tail = (proc.stderr or "").strip()[:500]
            # Dump the failing .tex to backend/_last_failure.tex so we can
            # inspect what the LLM (and our post-process) actually produced.
            # Single file — overwritten each time, no clutter.
            try:
                dump = Path(__file__).resolve().parents[2] / "_last_failure.tex"
                dump.write_text(latex_source, encoding="utf-8")
            except Exception:
                pass
            raise LatexCompileError(
                f"Tectonic failed (exit {proc.returncode}): {stderr_tail}",
                log_tail=log_tail,
            )

        pdf_path = tmp_path / "resume.pdf"
        if not pdf_path.exists():
            raise LatexCompileError("Tectonic reported success but no PDF was produced.")

        log_file = tmp_path / "resume.log"
        pages = (
            _page_count_from_log(log_file.read_text(errors="ignore"))
            if log_file.exists()
            else 0
        )
        return CompileResult(pdf=pdf_path.read_bytes(), pages=pages)
