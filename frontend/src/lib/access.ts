/**
 * Access-code validation for the app pages.
 *
 * There is NO persistence — access is granted only for the current page load,
 * so refreshing (or reopening) the page re-locks and the code must be entered
 * again. The unlocked flag lives in React state in AccessProvider.
 *
 * NOTE: this is a *soft*, client-side gate. We compare a hash (not the literal
 * code) so the code isn't sitting in plaintext in the bundle, but a determined
 * user could still bypass it — real protection would have to live on the
 * backend.
 */

// djb2 hash of the access code — the literal code is never stored here.
const EXPECTED_HASH = 2110775284;

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** True if `code` matches the access code. */
export function isCodeValid(code: string): boolean {
  return hash(code.trim()) === EXPECTED_HASH;
}
