import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { isCodeValid } from "../lib/access";

interface AccessCtx {
  unlocked: boolean;
  /** Navigate to `dest` if unlocked, otherwise open the code modal first. */
  requestAccess: (dest: string) => void;
}

const Ctx = createContext<AccessCtx>({ unlocked: false, requestAccess: () => {} });
export const useAccess = () => useContext(Ctx);

/** Little document mascot. Frowns + nods sadly when the code is wrong. */
function SadPaper({ sad, nod }: { sad: boolean; nod: boolean }) {
  return (
    <div className={`mx-auto mb-6 h-16 w-16 ${nod ? "anim-sad-nod" : ""}`} aria-hidden>
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        {/* paper with a folded corner */}
        <path
          d="M19 7 H40 L48 15 V55 Q48 57 46 57 H19 Q17 57 17 55 V9 Q17 7 19 7 Z"
          fill="#ffffff"
          stroke="#0a0908"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M40 7 V13 Q40 15 42 15 H48" stroke="#0a0908" strokeWidth="2.2" strokeLinejoin="round" />
        {/* faint text line */}
        <path d="M23 18 h11" stroke="#0a0908" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />
        {/* eyes */}
        <circle cx="27" cy="33" r="2.3" fill="#0a0908" />
        <circle cx="39" cy="33" r="2.3" fill="#0a0908" />
        {/* worried eyebrows when sad */}
        {sad && (
          <>
            <path d="M23 28 L30 30" stroke="#0a0908" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M43 28 L36 30" stroke="#0a0908" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
        {/* mouth: frown when sad, calm line otherwise */}
        {sad ? (
          <path d="M27 47 Q33 41 39 47" stroke="#0a0908" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M28 45 H38" stroke="#0a0908" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

/**
 * Global access gate. Renders its children plus a code modal that covers the
 * page (opaque — the landing video does NOT play behind it). The correct code
 * unlocks for THIS page load only (no persistence — a refresh re-locks) and
 * continues to the requested destination; a wrong code makes the paper mascot
 * nod sadly.
 */
export default function AccessProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [nod, setNod] = useState(false);

  function requestAccess(dest: string) {
    if (unlocked) {
      navigate(dest);
      return;
    }
    setCode("");
    setError(false);
    setPending(dest);
  }

  function close() {
    setPending(null);
    setCode("");
    setError(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isCodeValid(code)) {
      setUnlocked(true);
      const dest = pending;
      close();
      if (dest) navigate(dest);
      return;
    }
    setError(true);
    setCode("");
    setNod(true);
    window.setTimeout(() => setNod(false), 850);
  }

  const open = pending !== null && !unlocked;

  return (
    <Ctx.Provider value={{ unlocked, requestAccess }}>
      {children}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          {/* Opaque, heavily-blurred backdrop — the landing video stays hidden,
              but the glass panel still has depth to read against. */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-sap-50/85 backdrop-blur-2xl"
          />
          <div className="anim-modal-pop relative z-10 w-full max-w-md rounded-3xl border border-white/50 bg-white/70 p-10 text-center shadow-[0_30px_90px_-24px_rgba(0,0,0,0.6)] ring-1 ring-white/40 backdrop-blur-xl">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 text-sap-300 transition hover:text-sap-50"
            >
              <X size={16} />
            </button>

            <SadPaper sad={error} nod={nod} />

            <p className="eyebrow text-sap-200/70">/ Access</p>
            <h1 className="display mt-2 text-3xl text-sap-50">Enter access code</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-sap-100/65">
              This is an invite-only preview. Enter your one-time access code to continue.
            </p>

            <form onSubmit={submit} className="mt-7">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(false);
                }}
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                autoFocus
                aria-label="Access code"
                placeholder="••••••"
                className={`anim-bar-in block w-full rounded-2xl border bg-black/[0.025] px-5 py-4 text-center font-mono text-2xl tracking-[0.5em] text-sap-50 outline-none transition placeholder:text-sap-300/50 ${
                  error ? "border-red-500/60" : "border-black/15 focus:border-black/55"
                }`}
              />
              {error && (
                <p className="mt-2 text-[12px] font-medium text-red-600">Incorrect code — please try again.</p>
              )}
              <button type="submit" disabled={code.length < 6} className="btn-cta mt-5 w-full justify-center">
                <span>Unlock</span>
                <ArrowRight size={14} />
              </button>
            </form>

            <p className="mt-6 text-[12px] text-sap-100/55">
              No code? Contact the{" "}
              <a
                href="https://yash-munshi.vercel.app/#contact"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 underline-offset-2 hover:underline"
              >
                Developer
              </a>{" "}
              for access.
            </p>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
