/**
 * Persistent default-resume slot, browser-local.
 *
 * Paste your usual LaTeX once → click "Save as default". From then on every
 * page with a resume textarea gets a "Default" button that re-loads it.
 *
 * Storage is plain localStorage keyed under `stride:default-latex`. Stays in
 * the browser — never sent to the backend, never crosses devices.
 */
const KEY = "stride:default-latex";

export function loadDefaultLatex(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDefaultLatex(latex: string): void {
  try {
    if (latex.trim()) {
      localStorage.setItem(KEY, latex);
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    /* localStorage disabled — silently no-op */
  }
}

export function hasDefaultLatex(): boolean {
  return loadDefaultLatex().trim().length > 0;
}
