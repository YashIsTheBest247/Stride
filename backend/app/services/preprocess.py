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


# ── Achievement rescue: re-bullet sections the LLM flattened ───────────────
#
# `ensure_bullet_wrappers` only saves *orphan `\resumeItem`* calls. But the LLM
# also (mis)copies the Technical-Skills idiom into Achievements:
#     \begin{itemize}[leftmargin=.., label={}]
#       \small{\item{ Line one \\ Line two \\ Line three }}
#     \end{itemize}
# That renders flush-left with NO bullet markers (label={} + a single \item).
# For sections whose TITLE marks them as bullet lists (Achievements, Awards,
# Leadership, …) and that contain NO `\resumeItem`, we explode the flattened
# content back into bare `\resumeItem{...}` lines and let
# `ensure_bullet_wrappers` (run right after) wrap them. Technical-Skills /
# Coursework sections never match the title test, so their intentional
# bulletless layout is left untouched.

_ACHIEVEMENT_TITLE_RE = re.compile(
    r"achiev|extracurric|involve|leadership|award|honou?r"
    r"|certificat|volunteer|activit|accomplishment",
    re.IGNORECASE,
)
_ITEMIZE_BLOCK_RE = re.compile(
    r"\\begin\{itemize\}(?:\[[^\]]*\])?(.*?)\\end\{itemize\}", re.DOTALL
)
# A LaTeX line break `\\`, optionally with `[4pt]`-style spacing.
_LINE_BREAK_RE = re.compile(r"\\\\(?:\[[^\]]*\])?")
# Font-size switches that wrap content but carry no text of their own.
_SIZE_CMD_RE = re.compile(
    r"\\(?:small|footnotesize|scriptsize|normalsize|large)\b"
)


def _strip_wrapping_braces(text: str) -> str:
    """Drop a fully-enclosing ``{...}`` pair (e.g. left over from ``\\small{}``).

    Only strips when the opening brace's match is the final character, so an
    inline ``\\textbf{X}`` at the end of a line is never broken.
    """
    text = text.strip()
    while text.startswith("{"):
        end = _find_matching_brace(text, 0)
        if end == len(text) - 1:
            text = text[1:end].strip()
        else:
            break
    return text


def _explode_items(inner: str) -> list[str]:
    r"""Turn an itemize body into a flat list of achievement strings.

    Handles both shapes the LLM emits:
      * one braced ``\item{ A \\ B \\ C }`` (split the body on ``\\``), and
      * several bare ``\item A`` entries (split on ``\item``).
    Braces are matched, never blindly stripped, so inline groups survive.
    """
    item_starts = [m.start() for m in re.finditer(r"\\item\b", inner)]
    chunks: list[str] = []
    if not item_starts:
        chunks.append(inner)
    else:
        for k, start in enumerate(item_starts):
            cursor = start + len("\\item")
            j = cursor
            while j < len(inner) and inner[j] in " \t\n":
                j += 1
            if j < len(inner) and inner[j] == "{":
                end = _find_matching_brace(inner, j)
                if end != -1:
                    chunks.append(inner[j + 1:end])
                    continue
            nxt = item_starts[k + 1] if k + 1 < len(item_starts) else len(inner)
            chunks.append(inner[cursor:nxt])

    frags: list[str] = []
    for chunk in chunks:
        chunk = _SIZE_CMD_RE.sub("", chunk)
        for piece in _LINE_BREAK_RE.split(chunk):
            piece = _strip_wrapping_braces(piece)
            if piece:
                frags.append(piece)
    return frags


def _rescue_section_body(body: str) -> str:
    m = _ITEMIZE_BLOCK_RE.search(body)
    if not m:
        return body
    frags = _explode_items(m.group(1))
    if not frags:
        return body
    items = "\n        ".join(f"\\resumeItem{{{f}}}" for f in frags)
    return f"{body[:m.start()]}{items}{body[m.end():]}"


def rescue_bulletless_achievements(latex: str) -> str:
    r"""Re-bullet achievement-type sections the LLM flattened to plain lines.

    Only touches sections whose heading matches an achievement-ish keyword AND
    that contain no ``\resumeItem``. The exploded bare ``\resumeItem`` lines are
    then wrapped by :func:`ensure_bullet_wrappers`.
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
        if _ACHIEVEMENT_TITLE_RE.search(header) and "\\resumeItem{" not in body:
            body = _rescue_section_body(body)
        rebuilt.append(body)
        i += 2
    return "".join(rebuilt)


# A `\resumeSubHeadingListStart` whose body is ONLY a `\resumeItemListStart`
# block (no `\resumeSubheading`/`\item` between the two) opens a nested itemize
# before the outer one has any item → LaTeX "Something's wrong--perhaps a
# missing \item" and zero pages of output. Experience/Projects are safe because
# a `\resumeSubheading` (which emits an `\item`) sits between the wrappers; an
# Achievements list has none. Collapsing to the bare item list is valid LaTeX
# and still renders bullets (\resumeItemListStart = a plain \begin{itemize}).
_REDUNDANT_SUBHEADING_WRAP = re.compile(
    r"\\resumeSubHeadingListStart\s*\\resumeItemListStart"
    r"(.*?)"
    r"\\resumeItemListEnd\s*\\resumeSubHeadingListEnd",
    re.DOTALL,
)


def fix_redundant_subheading_wrapper(latex: str) -> str:
    r"""Drop a `\resumeSubHeadingListStart` that only wraps a bullet list.

    Repairs the empty-outer-list crash for sections (typically Achievements)
    that nest `\resumeItemListStart` directly inside `\resumeSubHeadingListStart`
    with no intervening `\resumeSubheading`.
    """
    return _REDUNDANT_SUBHEADING_WRAP.sub(
        lambda m: f"\\resumeItemListStart{m.group(1)}\\resumeItemListEnd", latex
    )


# Match 10/11/12pt so we can also step a doc down to 9pt at the top level.
_DOCCLASS_FONTSIZE = re.compile(
    r"(\\documentclass\[[^\]]*?)\b(10|11|12)pt\b"
)


_SHRINK_MARKER = "% STRIDE-SHRINK-V5"
_OLD_SHRINK_MARKERS = (
    "% STRIDE-SHRINK-V2", "% STRIDE-SHRINK-V3", "% STRIDE-SHRINK-V4",
)

# Escalating one-page-fit profiles. Each level reduces content HEIGHT more than
# the last — smaller font and/or tighter line spacing — so a resume that still
# overflowed at the previous level has another, harder squeeze to try. We vary
# font + linespread (the levers that actually shrink content) and keep the
# proven V4 geometry (textheight/​textwidth/margins) constant: expanding
# textheight further can't help once the text block already fills the page.
_SHRINK_PROFILES = {
    1: {"font": 10, "linespread": 0.93},  # gentle (old V4 default)
    2: {"font": 10, "linespread": 0.88},  # tighter lines
    3: {"font": 9,  "linespread": 0.90},  # smaller font — last resort
}
MAX_SHRINK_LEVEL = max(_SHRINK_PROFILES)


def shrink_to_fit(latex: str, level: int = 1) -> str:
    """Tighten geometry so the tailored resume fits one page, without cropping.

    ``level`` (1..MAX_SHRINK_LEVEL) selects how hard to squeeze; the caller
    steps it up only while the page still overflows. Knobs per level come from
    ``_SHRINK_PROFILES`` (font size + line spacing); the geometry below is the
    proven V4 set and is constant across levels. NO topmargin shift, so the
    name/contact header is never pushed above the printable area.

    Injected once, right before \\begin{document}. Idempotent — a .tex that
    already carries the marker (or a prior V2-V4 marker) is returned untouched,
    so re-runs and user-pasted once-shrunk sources don't double-inject.
    """
    level = max(1, min(level, MAX_SHRINK_LEVEL))
    prof = _SHRINK_PROFILES[level]
    out = _DOCCLASS_FONTSIZE.sub(lambda m: f"{m.group(1)}{prof['font']}pt", latex)
    if _SHRINK_MARKER in out or any(m in out for m in _OLD_SHRINK_MARKERS):
        return out
    injection = (
        f"{_SHRINK_MARKER} (level {level}): tighten geometry so content fits one page\n"
        "\\addtolength{\\textheight}{0.8in}\n"
        "\\addtolength{\\textwidth}{0.4in}\n"
        "\\addtolength{\\oddsidemargin}{-0.2in}\n"
        "\\addtolength{\\evensidemargin}{-0.2in}\n"
        "\\linespread{" + str(prof["linespread"]) + "}\n"
        "\\setlength{\\parskip}{0pt}\n"
        "\\setlength{\\parsep}{0pt}\n"
        "\\setlength{\\itemsep}{0pt}\n"
    )
    return out.replace("\\begin{document}", injection + "\\begin{document}", 1)


def sanitize_for_tectonic(
    latex: str, *, finalize: bool = False, shrink: bool = False
) -> str:
    """Run all known sanitizers. Apply to BOTH user input (so the LLM never
    sees crash-triggering constructs) and the LLM output (in case the LLM
    re-introduced them despite preserve rules).

    ``finalize=True`` additionally strips the LLM-added \\textbf{} from inside
    bullets and repairs/re-bullets list structure (orphan ``\\resumeItem`` and
    flattened achievement sections). Enable it for the FINAL compile only —
    pre-LLM sanitize should keep the original's bolds and layout intact.

    ``shrink=True`` layers on the one-page-fit geometry. It's now decoupled
    from ``finalize`` so the caller can compile at natural size first and only
    shrink when the document actually overflows a page.
    """
    latex = neutralize_fontawesome(latex)
    latex = strip_pdftex_only_directives(latex)
    latex = fix_command_environment_confusion(latex)
    if finalize:
        latex = strip_added_bolds(latex)
        latex = rescue_bulletless_achievements(latex)
        latex = ensure_bullet_wrappers(latex)
        # Must run AFTER ensure_bullet_wrappers, which can itself create the
        # broken `\resumeSubHeadingListStart`→`\resumeItemListStart` nesting.
        latex = fix_redundant_subheading_wrapper(latex)
    if shrink:
        latex = shrink_to_fit(latex)
    return latex
