"""Pre-compile sanitizers for LaTeX sources.

Tectonic 0.16.9 (and earlier) on Windows crashes with heap corruption on
certain font-heavy packages. We strip the worst offenders before compile.
"""
import re

# Matches \usepackage{fontawesome5} or \usepackage{fontawesome} with any
# option list. Captures the trailing newline so we don't leave blank lines.
_PKG_FONTAWESOME = re.compile(
    r"\\usepackage(?:\[[^\]]*\])?\{fontawesome5?\}[ \t]*\n?"
)

# Matches \faPhone, \faEnvelope, \faLinkedin, ... and optional trailing
# backslash-space (the \  spacing form). Does NOT eat following whitespace.
_FA_MACRO = re.compile(r"\\fa[A-Z][a-zA-Z]*\\?")

# Matches \raisebox{ANY}  where ANY may contain \height etc. Used to clean
# up the now-empty raiseboxes that wrapped the removed icons.
_EMPTY_RAISEBOX = re.compile(
    r"\\raisebox\{[^{}]*\}[ \t]*(?=[~\s\\$&])"
)

# LLMs frequently misread custom commands like \resumeItemListStart as
# environments, then close them with \end{resumeItemListStart} instead of
# the matching \resumeItemListEnd command. Generic fix: any \end{...Start}
# becomes the corresponding ...End command.
_BAD_END_START = re.compile(r"\\end\{(\w+)Start\}")

# pdfTeX-only directives that XeTeX (Tectonic's default engine) doesn't
# understand. \input{glyphtounicode} loads a file full of \pdfglyphtounicode
# calls, and \pdfgentounicode=1 enables them — both are no-ops we can drop
# without affecting the rendered output. (They only matter for PDF tagging.)
_PDFTEX_DIRECTIVES = re.compile(
    r"(\\input\{glyphtounicode\}[ \t]*\n?"
    r"|\\pdfgentounicode\s*=\s*\d+[ \t]*\n?"
    r"|\\pdfglyphtounicode\s*\{[^}]*\}\s*\{[^}]*\}[ \t]*\n?)"
)


def neutralize_fontawesome(latex: str) -> str:
    """Strip fontawesome5 package + every \\fa* command from the source.

    Visual outcome: contact-info icons disappear but surrounding text stays,
    so a header like:
        \\raisebox{-0.1\\height}\\faPhone\\ +91 1234567890
    becomes:
        +91 1234567890

    Also: within \\begin{center}...\\end{center} blocks (typical contact
    header), replace the bare `~` separators with ` $|$ ` so the items
    don't run together visually once the icons are gone.
    """
    out = _PKG_FONTAWESOME.sub("", latex)
    out = _FA_MACRO.sub("", out)
    out = _EMPTY_RAISEBOX.sub("", out)
    out = _add_pipe_separators_in_centers(out)
    return out


_CENTER_BLOCK = re.compile(
    r"(\\begin\{center\}.*?\\end\{center\})", re.DOTALL
)
# ` ~ ` between items in the header — non-breaking space used as separator.
_TILDE_SEP = re.compile(r"[ \t]*~[ \t]*")


def _add_pipe_separators_in_centers(latex: str) -> str:
    def fix_block(m: re.Match) -> str:
        block = m.group(1)
        # Only swap separators that look like they were dividers (i.e. only
        # ~ that sits between visible items). We do this everywhere in the
        # block since center headers don't legitimately use ~ for spacing
        # within items.
        return _TILDE_SEP.sub(r" $|$ ", block)
    return _CENTER_BLOCK.sub(fix_block, latex)


def fix_command_environment_confusion(latex: str) -> str:
    r"""Rewrite `\end{FooStart}` as `\FooEnd`.

    Resume templates commonly define paired commands like
    `\resumeItemListStart` / `\resumeItemListEnd`. LLMs misread the `Start`
    suffix as an environment name and close them with `\end{...Start}`,
    which is a LaTeX error. This catches that whole class of mistakes.
    """
    return _BAD_END_START.sub(lambda m: f"\\{m.group(1)}End", latex)


def strip_pdftex_only_directives(latex: str) -> str:
    """Drop pdfTeX-only commands that XeTeX doesn't understand."""
    return _PDFTEX_DIRECTIVES.sub("", latex)


_DOCCLASS_FONTSIZE = re.compile(
    r"(\\documentclass\[[^\]]*?)\b(11|12)pt\b"
)


def shrink_to_fit(latex: str) -> str:
    """Force the resume onto one page.

    Two adjustments:
      1. \\documentclass[..., 11pt|12pt, ...] -> 10pt (smallest standard size).
      2. After the existing geometry adjustments in the preamble, add another
         half-inch of textheight if there isn't already plenty.

    Applies to the final .tex right before compile.
    """
    out = _DOCCLASS_FONTSIZE.sub(lambda m: f"{m.group(1)}10pt", latex)
    # If the preamble doesn't already crank textheight aggressively, add some.
    # We just append a one-shot \addtolength after \begin{document} marker
    # candidates fail — easier and safer to do it right before \begin{document}.
    if "\\addtolength{\\textheight}{0.5in}" not in out:
        out = out.replace(
            "\\begin{document}",
            "% STRIDE: extra textheight to keep one-page fit after tailoring\n"
            "\\addtolength{\\textheight}{0.5in}\n"
            "\\begin{document}",
            1,
        )
    return out


def sanitize_for_tectonic(latex: str, *, shrink: bool = False) -> str:
    """Run all known sanitizers. Apply to BOTH user input (so the LLM never
    sees crash-triggering constructs) and the LLM output (in case the LLM
    re-introduced them despite preserve rules).

    ``shrink=True`` additionally applies one-page-fit adjustments (font size
    and textheight). Only enable this for the FINAL compile, not the pre-LLM
    sanitize — otherwise the LLM might "preserve" the 10pt and we lose info.
    """
    latex = neutralize_fontawesome(latex)
    latex = strip_pdftex_only_directives(latex)
    latex = fix_command_environment_confusion(latex)
    if shrink:
        latex = shrink_to_fit(latex)
    return latex
