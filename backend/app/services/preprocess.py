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


# ── Bold-stripper: undo LLM "keyword highlighting" inside bullet content ───

_BULLET_COMMANDS = ("resumeItem", "resumeSubItem")


def _find_matching_brace(text: str, start: int) -> int:
    """Given index of `{`, return the index of the matching `}` (or -1)."""
    if start >= len(text) or text[start] != "{":
        return -1
    depth = 0
    for j in range(start, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return j
    return -1


def _strip_textbf_one_level(text: str) -> str:
    r"""`\textbf{X}` → `X`, applied until stable (handles nested wrappers)."""
    pattern = re.compile(r"\\textbf\{([^{}]*)\}")
    prev = None
    while prev != text:
        prev = text
        text = pattern.sub(r"\1", text)
    return text


def strip_added_bolds(latex: str) -> str:
    r"""Remove \\textbf{...} wrappers from inside bullet bodies + skill values.

    The LLM keeps adding \\textbf{} around random keywords inside bullets
    ("Developed \\textbf{Python back-end} REST APIs") even though the prompt
    forbids it. Structural bolds — job titles in \\resumeSubheading, project
    names in \\resumeProjectHeading, skill category labels like
    \\textbf{Languages}{...} — sit OUTSIDE the bodies we scan, so they stay.

    Cleans two patterns:
      1. \\resumeItem{ ... \\textbf{X} ... }                  → strip
      2. \\textbf{Category}{: ... \\textbf{Y} ... }            → strip Y only
    """
    # Pattern 1 — bullet commands
    for macro in _BULLET_COMMANDS:
        open_marker = f"\\{macro}{{"
        out_parts: list[str] = []
        last = 0
        i = 0
        while True:
            idx = latex.find(open_marker, i)
            if idx == -1:
                break
            body_start = idx + len(open_marker) - 1  # position of `{`
            end = _find_matching_brace(latex, body_start)
            if end == -1:
                i = idx + len(open_marker)
                continue
            out_parts.append(latex[last:body_start + 1])
            out_parts.append(_strip_textbf_one_level(latex[body_start + 1:end]))
            out_parts.append("}")
            last = end + 1
            i = end + 1
        if out_parts:
            out_parts.append(latex[last:])
            latex = "".join(out_parts)

    # Pattern 2 — skill value lists: \textbf{X}{: ...}
    out_parts2: list[str] = []
    last = 0
    textbf_pat = re.compile(r"\\textbf\{[^{}]*\}\{")
    for m in textbf_pat.finditer(latex):
        value_start = m.end() - 1  # position of `{` of the value group
        # Only intervene when the value group starts with ":" — that's the
        # skill-line pattern. Other uses of \textbf{X}{Y} are left alone.
        if value_start + 1 >= len(latex) or latex[value_start + 1] != ":":
            continue
        end = _find_matching_brace(latex, value_start)
        if end == -1:
            continue
        out_parts2.append(latex[last:value_start + 1])
        out_parts2.append(_strip_textbf_one_level(latex[value_start + 1:end]))
        out_parts2.append("}")
        last = end + 1
    if out_parts2:
        out_parts2.append(latex[last:])
        latex = "".join(out_parts2)

    return latex


_SECTION_SPLIT = re.compile(r"(\\section\*?\{[^}]*\})")
_LIST_START_RE = re.compile(r"\\resumeItemListStart\b")
_LIST_END_RE = re.compile(r"\\resumeItemListEnd\b")
_RESUME_ITEM_RE = re.compile(r"\\resumeItem\{")


def ensure_bullet_wrappers(latex: str) -> str:
    r"""Wrap orphan ``\resumeItem`` calls in ``\resumeItemListStart``/``End``.

    Resume templates render bullet markers (•) only when ``\resumeItem`` sits
    inside the template's itemize-wrapping command pair. LLMs occasionally
    emit Achievements or similar sections as bare ``\resumeItem{...}`` lines
    with no surrounding wrapper, producing bulletless paragraphs in the PDF.

    For each ``\section{...}`` block: if the body contains ``\resumeItem{``
    but ZERO ``\resumeItemListStart``, wrap the contiguous span from the
    first ``\resumeItem`` to the closing brace of the last one. Sections
    that already wrap their items are left untouched.
    """
    parts = _SECTION_SPLIT.split(latex)
    if len(parts) < 3:
        return latex
    rebuilt: list[str] = [parts[0]]
    i = 1
    while i < len(parts):
        header = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        rebuilt.append(header)
        rebuilt.append(_wrap_orphan_items_in_section_body(body))
        i += 2
    return "".join(rebuilt)


def _wrap_orphan_items_in_section_body(body: str) -> str:
    if not _RESUME_ITEM_RE.search(body):
        return body
    if _LIST_START_RE.search(body):
        return body  # template already wrapped them; trust it
    first = body.find("\\resumeItem{")
    last_open = body.rfind("\\resumeItem{")
    if first < 0 or last_open < 0:
        return body
    last_brace_start = last_open + len("\\resumeItem")
    last_close = _find_matching_brace(body, last_brace_start)
    if last_close < 0:
        return body
    return (
        body[:first]
        + "\\resumeItemListStart\n  "
        + body[first:last_close + 1]
        + "\n\\resumeItemListEnd"
        + body[last_close + 1:]
    )


_DOCCLASS_FONTSIZE = re.compile(
    r"(\\documentclass\[[^\]]*?)\b(11|12)pt\b"
)


_SHRINK_MARKER = "% STRIDE-SHRINK-V4"
_OLD_SHRINK_MARKERS = ("% STRIDE-SHRINK-V2", "% STRIDE-SHRINK-V3")


def shrink_to_fit(latex: str) -> str:
    """Force the tailored resume onto one page WITHOUT cropping the header.

    V3 used \\addtolength{\\topmargin}{-0.4in} to pull content up, which on
    some templates pushed the name/contact header above the printable area.
    V4 fixes that: NO topmargin shift, and the vertical room we still need
    comes from a moderate textheight expansion + tighter item spacing.

    Net page coverage vs V3:
        V3 bottom = T_default - 0.4 + (H + 1.2) = T_default + H + 0.8
        V4 bottom = T_default       + (H + 0.8) = T_default + H + 0.8
    Same bottom — header is no longer cropped because everything is shifted
    0.4in down, into the printable area.

    Knobs:
      1. \\documentclass[..., 11pt|12pt, ...] -> 10pt.
      2. textheight +0.8in, textwidth +0.4in, side margins -0.2in.
      3. \\linespread{0.93} + \\itemsep / \\parskip / \\parsep = 0pt so
         bullet lists don't waste vertical room between items.

    Injected once, right before \\begin{document}. Idempotent — re-runs on
    already-shrunk .tex are no-ops, and prior V2/V3-marker installs are
    detected and left alone.
    """
    out = _DOCCLASS_FONTSIZE.sub(lambda m: f"{m.group(1)}10pt", latex)
    if _SHRINK_MARKER in out:
        return out
    # If a previous V2/V3 marker is present (e.g. user pasted a once-shrunk
    # .tex), don't double-inject — return as-is to stay idempotent.
    if any(m in out for m in _OLD_SHRINK_MARKERS):
        return out
    injection = (
        f"{_SHRINK_MARKER}: tighten geometry so tailored content fits one page\n"
        "\\addtolength{\\textheight}{0.8in}\n"
        "\\addtolength{\\textwidth}{0.4in}\n"
        "\\addtolength{\\oddsidemargin}{-0.2in}\n"
        "\\addtolength{\\evensidemargin}{-0.2in}\n"
        "\\linespread{0.93}\n"
        "\\setlength{\\parskip}{0pt}\n"
        "\\setlength{\\parsep}{0pt}\n"
        "\\setlength{\\itemsep}{0pt}\n"
    )
    out = out.replace(
        "\\begin{document}",
        injection + "\\begin{document}",
        1,
    )
    return out


def sanitize_for_tectonic(latex: str, *, shrink: bool = False) -> str:
    """Run all known sanitizers. Apply to BOTH user input (so the LLM never
    sees crash-triggering constructs) and the LLM output (in case the LLM
    re-introduced them despite preserve rules).

    ``shrink=True`` additionally applies one-page-fit adjustments AND strips
    the LLM-added \\textbf{} from inside bullets. Only enable this for the
    FINAL compile — pre-LLM sanitize should keep the original's bolds intact.
    """
    latex = neutralize_fontawesome(latex)
    latex = strip_pdftex_only_directives(latex)
    latex = fix_command_environment_confusion(latex)
    if shrink:
        latex = strip_added_bolds(latex)
        latex = ensure_bullet_wrappers(latex)
        latex = shrink_to_fit(latex)
    return latex
