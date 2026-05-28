import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  BookmarkPlus,
  Briefcase,
  Clock4,
  ExternalLink,
  Loader2,
  MapPin,
  Search as SearchIcon,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { searchJobs, type JobResult } from "../lib/jobs";
import { hasDefaultLatex, loadDefaultLatex, saveDefaultLatex } from "../lib/defaultResume";

type Status = "idle" | "loading" | "done" | "error";

export default function SearchPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [internshipOnly, setInternshipOnly] = useState(true);
  const [resume, setResume] = useState("");

  const [results, setResults] = useState<JobResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const canSearch = role.trim() || location.trim() || internshipOnly;
  const panelOpen = status !== "idle";

  // Reset scroll on mount so the page header is visible when arriving from
  // a scrolled-down landing page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Default-resume slot — same localStorage value as the /app page.
  const [hasDefault, setHasDefault] = useState(false);
  useEffect(() => {
    setHasDefault(hasDefaultLatex());
  }, []);

  function loadDefault() {
    const t = loadDefaultLatex();
    if (t) setResume(t);
  }

  function saveDefault() {
    if (!resume.trim()) return;
    saveDefaultLatex(resume);
    setHasDefault(true);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    setStatus("loading");
    setError("");
    setResults([]);
    try {
      const data = await searchJobs({
        role,
        location,
        internshipOnly,
        topN: 50,
      });
      setResults(data);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  function tailorFor(job: JobResult) {
    sessionStorage.setItem(
      "stride:prefill",
      JSON.stringify({ latex: resume, jd: job.description, company: job.company, role: job.role }),
    );
    navigate("/app");
  }

  function closePanel() {
    setStatus("idle");
    setResults([]);
    setError("");
  }

  return (
    <main className="anim-page-enter relative">
      {/* HEADER */}
      <section className="px-8 pt-24 pb-4">
        <div className="mx-auto max-w-[1400px]">
          <p className="eyebrow text-sap-400">/ Search</p>
          <h1 className="display mt-3 text-5xl text-sap-50 md:text-6xl">
            Find roles. <span className="chrome">Open postings.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sap-300">
            Filter by role, location, and internship status. Searches our free
            Greenhouse + Lever boards plus -
            LinkedIn, Indeed, Glassdoor, and ZipRecruiter. Click any result to
            open the posting in a new tab.
          </p>
        </div>
      </section>

      {/* BODY — filters left, results panel right */}
      <section className="px-8 pb-24">
        <div
          className={`mx-auto grid max-w-[1400px] gap-6 transition-all duration-500 ${
            panelOpen ? "lg:grid-cols-[minmax(340px,420px)_1fr]" : "lg:grid-cols-1"
          }`}
        >
          {/* LEFT — filter form */}
          <form onSubmit={runSearch} className="panel h-fit p-6">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl text-sap-50">Filters</h2>
              <span className="eyebrow text-sap-400">live</span>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Role">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. python developer"
                  className="w-full bg-transparent text-sm text-sap-50 placeholder-sap-400 outline-none"
                />
              </Field>

              <Field label="Location">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. remote, san francisco"
                  className="w-full bg-transparent text-sm text-sap-50 placeholder-sap-400 outline-none"
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3 ring-1 ring-black/[0.06]">
                <input
                  type="checkbox"
                  checked={internshipOnly}
                  onChange={(e) => setInternshipOnly(e.target.checked)}
                  className="h-4 w-4 accent-sap-50"
                />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-sap-200">
                  Internship only
                </span>
              </label>

              <div>
                <div className="flex items-center justify-between">
                  <label className="eyebrow text-sap-400">Your resume (LaTeX) — optional</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={loadDefault}
                      disabled={!hasDefault}
                      title={hasDefault
                        ? "Load your saved default .tex"
                        : "No default saved yet — paste + click Save"}
                      className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-black/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-sap-200 transition hover:border-black/40 hover:text-sap-50 active:scale-[0.97] disabled:opacity-40 disabled:hover:border-black/15"
                    >
                      <Star size={10} />
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={saveDefault}
                      disabled={!resume.trim()}
                      title="Save the current .tex as your default for future visits"
                      className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-black/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-sap-200 transition hover:border-black/40 hover:text-sap-50 active:scale-[0.97] disabled:opacity-40 disabled:hover:border-black/15"
                    >
                      <BookmarkPlus size={10} />
                      Save
                    </button>
                  </div>
                </div>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="paste your .tex here — enables one-click Tailor on any result"
                  spellCheck={false}
                  className="ta mt-2 h-[140px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSearch || status === "loading"}
              className="btn-cta mt-5 w-full"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Searching live boards</span>
                </>
              ) : (
                <>
                  <SearchIcon size={14} />
                  <span>Search</span>
                </>
              )}
            </button>

            {!canSearch && (
              <p className="mt-3 text-center text-[11px] text-sap-400">
                Set a role, location, or toggle internship-only.
              </p>
            )}
          </form>

          {/* RIGHT — results side panel (rendered only when panelOpen) */}
          {panelOpen && (
            <ResultsPanel
              status={status}
              results={results}
              error={error}
              onClose={closePanel}
              onTailor={tailorFor}
              hasResume={!!resume.trim()}
            />
          )}
        </div>
      </section>
    </main>
  );
}

// ── small components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="eyebrow text-sap-400">{label}</label>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-black/[0.04] px-4 py-3 ring-1 ring-black/[0.08] transition focus-within:ring-black/30">
        {children}
      </div>
    </div>
  );
}

function ResultsPanel({
  status,
  results,
  error,
  onClose,
  onTailor,
  hasResume,
}: {
  status: Status;
  results: JobResult[];
  error: string;
  onClose: () => void;
  onTailor: (job: JobResult) => void;
  hasResume: boolean;
}) {
  return (
    <aside className="panel relative flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden p-0 lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
        <div>
          <p className="eyebrow text-sap-400">Results</p>
          <p className="mt-1 text-sm text-sap-200">
            {status === "loading"
              ? "Fetching from live boards…"
              : status === "error"
                ? "Search failed"
                : `${results.length} match${results.length === 1 ? "" : "es"}`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close results"
          className="rounded-full p-2 text-sap-400 transition hover:bg-black/[0.05] hover:text-sap-50"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {status === "loading" && <ResultsSkeleton />}

        {status === "error" && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/5 p-5 text-sm text-red-700">
            <p className="eyebrow text-red-700">Error</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        )}

        {status === "done" && results.length === 0 && (
          <div className="panel p-5 text-center">
            <p className="eyebrow text-sap-400">No matches</p>
            <p className="mt-2 text-sm text-sap-300">
              Try broader keywords, drop the location, or uncheck Internship only.
            </p>
          </div>
        )}

        {status === "done" && results.length > 0 && (
          <div className="space-y-3">
            {results.map((job, i) => (
              <JobCard
                key={`${job.company}-${i}-${job.url}`}
                job={job}
                onTailor={() => onTailor(job)}
                hasResume={hasResume}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="panel animate-pulse p-5">
          <div className="h-3 w-1/3 rounded bg-black/10" />
          <div className="mt-3 h-5 w-2/3 rounded bg-black/10" />
          <div className="mt-3 h-3 w-full rounded bg-black/10" />
          <div className="mt-2 h-3 w-4/5 rounded bg-black/10" />
        </div>
      ))}
    </div>
  );
}

function JobCard({
  job,
  onTailor,
  hasResume,
}: {
  job: JobResult;
  onTailor: () => void;
  hasResume: boolean;
}) {
  const domain = (() => {
    try {
      return new URL(job.url).hostname.replace(/^www\./, "");
    } catch {
      return job.url;
    }
  })();
  const initials = job.company
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="panel group p-3.5 transition hover:border-black/20">
      {/* Top row: company + source meta on the left, logo on the right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sap-200">
              {job.company}
            </span>
            <span className="h-1 w-1 rounded-full bg-sap-400" />
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-sap-400">
              <Briefcase size={9} /> {job.source}
            </span>
          </div>
        </div>
        <CompanyLogo url={job.logo_url} initials={initials} />
      </div>

      {/* Stipend + duration badges — prominent, top of card */}
      {(job.stipend || job.duration) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {job.stipend && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sap-900/90 px-2 py-0.5 text-[10px] font-bold text-ink-950 ring-1 ring-black/20">
              <Banknote size={10} />
              {job.stipend}
            </span>
          )}
          {job.duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-bold text-sap-100 ring-1 ring-black/10">
              <Clock4 size={10} />
              {job.duration}
            </span>
          )}
        </div>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 block"
        title={`Open posting at ${domain}`}
      >
        <h3 className="display text-[15px] leading-tight text-sap-50 underline decoration-transparent decoration-1 underline-offset-4 transition group-hover:decoration-current">
          {job.role}
        </h3>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-sap-400 transition group-hover:text-sap-100">
          <ExternalLink size={9} /> {domain}
        </span>
      </a>

      {job.location && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-sap-400">
          <MapPin size={10} /> {job.location}
        </p>
      )}

      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-sap-300">
        {job.description}
      </p>

      <div className="mt-3 flex gap-1.5">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-black/40 bg-sap-50/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-950 transition hover:bg-sap-50 active:scale-[0.97]"
        >
          <ExternalLink size={10} />
          <span>Open posting</span>
        </a>
        <button
          onClick={onTailor}
          disabled={!hasResume}
          title={hasResume ? "Pre-fill the tailor with this JD" : "Paste your resume on the left first"}
          className="flex items-center gap-1.5 rounded-full border border-black/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sap-200 transition hover:border-black/50 hover:text-sap-50 active:scale-[0.97] disabled:opacity-40 disabled:hover:border-black/20"
        >
          <Sparkles size={10} />
          <span>Tailor</span>
        </button>
      </div>
    </div>
  );
}

function CompanyLogo({ url, initials }: { url: string; initials: string }) {
  const [errored, setErrored] = useState(false);
  if (url && !errored) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setErrored(true)}
        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-black/10"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/[0.06] text-[10px] font-bold text-sap-200 ring-1 ring-black/10">
      {initials || "?"}
    </div>
  );
}
