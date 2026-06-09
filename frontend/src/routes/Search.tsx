import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Briefcase,
  Check,
  ChevronDown,
  Clock4,
  ExternalLink,
  Loader2,
  MapPin,
  Search as SearchIcon,
  Sparkles,
  X,
} from "lucide-react";
import { searchJobs, type JobResult } from "../lib/jobs";
import DefaultButtons from "../components/DefaultButtons";

type Status = "idle" | "loading" | "done" | "error";

export default function SearchPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [internshipOnly, setInternshipOnly] = useState(true);
  const [source, setSource] = useState("");        // "" = all sources
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
        source,
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

              <div>
                <label className="eyebrow text-sap-400">Source</label>
                <Dropdown
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: "", label: "All free sources" },
                    { value: "greenhouse", label: "Greenhouse only" },
                    { value: "lever", label: "Lever only" },
                    { value: "internshala", label: "Internshala only" },
                  ]}
                />
                <p className="mt-1.5 text-[10px] text-sap-400">
                  For LinkedIn / Indeed / Glassdoor / Wellfound / Naukri — use the "More job sites" buttons below (those render listings via JS, so they can't be scraped server-side without a headless browser).
                </p>
              </div>

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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DefaultButtons value={resume} onLoad={setResume} compact />
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

        {/* MORE JOB SITES — free deep-link buttons */}
        <div className="mx-auto mt-10 max-w-[1400px]">
          <MoreJobSites role={role} location={location} internshipOnly={internshipOnly} />
        </div>
      </section>
    </main>
  );
}

// ── Themed dropdown (replaces native <select>) ──────────────────────────────

interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

function Dropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl bg-black/[0.04] px-4 py-3 text-left text-sm text-sap-50 ring-1 transition ${
          open ? "ring-black/30" : "ring-black/[0.08] hover:ring-black/20"
        }`}
      >
        <span>{current?.label ?? "Select…"}</span>
        <ChevronDown
          size={14}
          className={`text-sap-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-[#f0e8d3] shadow-[0_18px_50px_-18px_rgba(0,0,0,0.25)] ring-1 ring-black/15">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                type="button"
                key={opt.value || "default"}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-black/[0.08] text-sap-50"
                    : "text-sap-200 hover:bg-black/[0.05] hover:text-sap-50"
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check size={12} className="text-sap-50" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── More job sites (free deep-link section) ─────────────────────────────────

interface Platform {
  name: string;
  hint: string;
  build: (role: string, location: string, internshipOnly: boolean) => string;
}

const PLATFORMS: Platform[] = [
  {
    name: "LinkedIn",
    hint: "Largest network. Internship + remote filters in their UI.",
    build: (role, loc, intern) => {
      const q = `${role}${intern ? " intern" : ""}`.trim();
      const params = new URLSearchParams();
      if (q) params.set("keywords", q);
      if (loc) params.set("location", loc);
      return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    },
  },
  {
    name: "Indeed",
    hint: "US + global postings, rich filters.",
    build: (role, loc, intern) => {
      const q = `${role}${intern ? " intern" : ""}`.trim();
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (loc) params.set("l", loc);
      return `https://www.indeed.com/jobs?${params.toString()}`;
    },
  },
  {
    name: "Glassdoor",
    hint: "Salary insight + reviews next to listings.",
    build: (role, loc, intern) => {
      const q = `${role}${intern ? " intern" : ""}`.trim();
      const params = new URLSearchParams();
      if (q) params.set("sc.keyword", q);
      if (loc) params.set("locKeyword", loc);
      return `https://www.glassdoor.com/Job/jobs.htm?${params.toString()}`;
    },
  },
  {
    name: "Wellfound",
    hint: "Startup + early-stage roles. Was AngelList Talent.",
    build: (role, loc) => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (loc) params.set("location", loc);
      return `https://wellfound.com/jobs?${params.toString()}`;
    },
  },
  {
    name: "Naukri",
    hint: "India's largest job board.",
    build: (role, loc, intern) => {
      const slug = `${role}${intern ? " internship" : ""}`.trim().toLowerCase().replace(/\s+/g, "-");
      const locSlug = loc.trim().toLowerCase().replace(/\s+/g, "-");
      if (!slug) return "https://www.naukri.com/";
      return locSlug
        ? `https://www.naukri.com/${slug}-jobs-in-${locSlug}`
        : `https://www.naukri.com/${slug}-jobs`;
    },
  },
  {
    name: "Internshala",
    hint: "India-focused internships, tech-friendly.",
    build: (role) => {
      const slug = role.trim().toLowerCase().replace(/\s+/g, "-");
      return slug
        ? `https://internshala.com/internships/${slug}-internship/`
        : "https://internshala.com/internships/";
    },
  },
];

function MoreJobSites({
  role,
  location,
  internshipOnly,
}: {
  role: string;
  location: string;
  internshipOnly: boolean;
}) {
  return (
    <section className="panel p-6">
      <div>
        <p className="eyebrow text-sap-400">/ More job sites</p>
        <h2 className="display mt-2 text-2xl text-sap-50">
          Search elsewhere — <span className="chrome">free.</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-sap-300">
          One click opens each platform's search results pre-filled with your role and
          location. Copy any JD back into the Tailor page — your saved default resume
          is ready to go.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.build(role, location, internshipOnly)}
            target="_blank"
            rel="noreferrer noopener"
            className="group panel flex items-start justify-between gap-3 p-4 transition hover:border-black/30"
          >
            <div className="min-w-0">
              <p className="display text-base leading-tight text-sap-50">{p.name}</p>
              <p className="mt-1 text-[11px] leading-snug text-sap-300">{p.hint}</p>
            </div>
            <ExternalLink
              size={14}
              className="mt-0.5 shrink-0 text-sap-400 transition group-hover:text-sap-50"
            />
          </a>
        ))}
      </div>
    </section>
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
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {job.stipend && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-sap-50 px-3 py-1 text-[11px] font-bold text-ink-950 shadow-sm ring-1 ring-black/30"
              title="Stipend"
            >
              <Banknote size={12} />
              {job.stipend}
            </span>
          )}
          {job.duration && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] px-3 py-1 text-[11px] font-bold text-sap-50 ring-1 ring-black/15"
              title="Duration"
            >
              <Clock4 size={12} />
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
