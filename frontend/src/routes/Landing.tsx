import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Github, Globe, Linkedin, Play } from "lucide-react";
import TypewriterWord from "../components/TypewriterWord";
import VideoBackdrop from "../components/VideoBackdrop";

const ROTATING = [
  "ATS-Optimized.",
  "Keyword-Matched.",
  "Recruiter-Ready.",
  "Engineered.",
  "Sharpened.",
];

const STEPS = [
  {
    n: "01",
    title: "Search live boards",
    body: "Filter by role, location, and internship status. Aggregates live postings from Greenhouse, Lever, LinkedIn, Indeed, Glassdoor, and ZipRecruiter in one panel.",
  },
  {
    n: "02",
    title: "One-click Tailor",
    body: "Pick a match, the JD auto-fills the tailor. Paste your .tex once — Gemini rewrites the bullets and skills to load the JD's keywords, formatting untouched.",
  },
  {
    n: "03",
    title: "Download PDF",
    body: "Compiled server-side by Tectonic, auto-shrunk to one page, named FullName_Role.pdf. Ready to send in under 30 seconds.",
  },
];

const HOW_TO_USE = [
  {
    n: "01",
    title: "Save your default resume",
    body: "On the Tailor page, paste your .tex once and click ★ SAVE. It's stored in your browser — next time, one click reloads it.",
  },
  {
    n: "02",
    title: "Find roles that match",
    body: "Open Search, set role + location + Internship-only. Side panel returns live Greenhouse, Lever, and Internshala postings. Use the More Job Sites buttons to open LinkedIn / Indeed / Glassdoor / Wellfound / Naukri in new tabs.",
  },
  {
    n: "03",
    title: "Tailor a match",
    body: "Click the Tailor button on any result — the JD auto-fills the tailor with your default resume already loaded. Or paste a JD manually from any other source.",
  },
  {
    n: "04",
    title: "Generate the PDF",
    body: "Hit Generate. Gemini rewrites bullets and skills to weave in JD keywords, Tectonic compiles, auto-shrunk to one page. ~15-30 seconds end to end. Downloads as FullName_Role.pdf.",
  },
  {
    n: "05",
    title: "Apply on the company site",
    body: "Click Open Posting on any search result to land on the company's actual page, upload the tailored PDF, hit submit. STRIDE never touches the application form — that part stays yours.",
  },
];

const AUTO_SCROLL_DELAY_MS = 10000;

export default function Landing() {
  // Let the video play in full (~10s), then glide down to #intro.
  // Cancelled if the user takes control first.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.location.hash && window.location.hash !== "#hero") return;

    let cancelled = false;
    const onUserAction = () => { cancelled = true; };

    window.addEventListener("wheel", onUserAction, { passive: true, once: true });
    window.addEventListener("touchstart", onUserAction, { passive: true, once: true });
    window.addEventListener("keydown", onUserAction, { once: true });

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (window.scrollY > 60) return;
      document.getElementById("intro")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, AUTO_SCROLL_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onUserAction);
      window.removeEventListener("touchstart", onUserAction);
      window.removeEventListener("keydown", onUserAction);
    };
  }, []);

  return (
    <main className="relative">
      {/* HERO — pure video, no text overlay */}
      <section
        id="hero"
        className="relative flex h-screen items-end justify-center overflow-hidden"
      >
        <VideoBackdrop />

        {/* Scroll cue — only foreground element */}
        <button
          onClick={() =>
            document.getElementById("intro")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="relative z-10 mb-10 flex flex-col items-center gap-3 text-sap-100/80 transition hover:text-sap-50 active:scale-95"
          aria-label="Scroll to content"
        >
          <span className="eyebrow">Scroll</span>
          <span className="anim-scroll-bounce inline-block">
            <ChevronDown size={20} strokeWidth={1.5} />
          </span>
        </button>
      </section>

      {/* INTRO — headline + CTAs, auto-scroll target */}
      <section
        id="intro"
        className="relative overflow-hidden px-8 pt-6 pb-12"
      >
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="max-w-5xl">
            <p className="eyebrow text-sap-200/70">/ STRIDE · Resume Engine</p>

            <p className="serif mt-3 text-xl text-sap-100/85 md:text-2xl">
              Stride — <span className="text-sap-50">Your Resume.</span> Engineered to Win.
            </p>

            <h1 className="display mt-3 text-[clamp(2rem,4.5vw,3.75rem)]">
              <span className="block chrome">Tailored.</span>
              <span className="block text-sap-200">
                <TypewriterWord words={ROTATING} />
              </span>
              <span className="block chrome">Hired Faster.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sap-200/70">
              Search live internship boards — Greenhouse, Lever, LinkedIn, Indeed, Glassdoor — from one panel. One click on any match hands the JD to the tailor. Gemini rewrites your LaTeX to load the right keywords, Tectonic compiles, your formatting stays exactly where you put it.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/app" className="btn-cta">
                <span>Start tailoring</span>
                <ArrowUpRight size={14} />
              </Link>
              <a href="#how" className="btn-ghost">
                <Play size={12} />
                <span>How it works</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-8 pt-8 pb-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 flex items-end justify-between gap-8">
            <div>
              <p className="eyebrow text-sap-200/70">/ Pipeline</p>
              <h2 className="display mt-3 text-4xl text-sap-50 md:text-5xl">
                Three steps. <span className="chrome">No tinkering.</span>
              </h2>
            </div>
            <p className="hidden md:block max-w-md text-sm text-sap-200/55">
              No Overleaf round-trip. No toolchain on your machine. No copy-pasting JDs between tabs. Search, click, download.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl bg-black/[0.10] md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-ink-950 p-8">
                <div className="flex items-center justify-between">
                  <p className="display chrome text-2xl">{s.n}</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-sap-50" />
                </div>
                <h3 className="display mt-12 text-3xl text-sap-50">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-sap-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO USE */}
      <section id="howto" className="px-8 pt-12 pb-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 flex items-end justify-between gap-8">
            <div>
              <p className="eyebrow text-sap-200/70">/ How to use</p>
              <h2 className="display mt-3 text-4xl text-sap-50 md:text-5xl">
                Five steps. <span className="chrome">Apply ready.</span>
              </h2>
            </div>
            <p className="hidden md:block max-w-md text-sm text-sap-200/55">
              Save your resume once. After that, every application is paste-or-click then download.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl bg-black/[0.10] md:grid-cols-2 lg:grid-cols-5">
            {HOW_TO_USE.map((s) => (
              <div key={s.n} className="bg-ink-950 p-6">
                <div className="flex items-center justify-between">
                  <p className="display chrome text-xl">{s.n}</p>
                  <span className="h-1.5 w-1.5 rounded-full bg-sap-50" />
                </div>
                <h3 className="display mt-8 text-xl text-sap-50">{s.title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-sap-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 pt-12 pb-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="panel-sap relative overflow-hidden p-12 lg:p-16">
            <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="display text-5xl text-sap-50 lg:text-6xl">
                Ready in <span className="chrome">one stride.</span>
              </h2>
              <Link to="/app" className="btn-cta">
                <span>Tailor my resume</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/[0.10] px-8 py-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 md:flex-row">
          <p className="eyebrow text-sap-400">© 2026 · All rights reserved</p>

          <div className="flex items-center gap-5">
            <span className="eyebrow text-sap-400">Connect with developer</span>
            <span className="hidden h-3 w-px bg-black/15 md:inline-block" />
            <a
              href="https://yash-munshi.vercel.app/"
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sap-300 transition hover:text-sap-50"
              aria-label="Portfolio"
            >
              <Globe size={14} className="transition group-hover:scale-110" />
              <span className="hidden sm:inline">Portfolio</span>
            </a>
            <a
              href="https://www.linkedin.com/in/yash-munshi-a0408b337/"
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sap-300 transition hover:text-sap-50"
              aria-label="LinkedIn"
            >
              <Linkedin size={14} className="transition group-hover:scale-110" />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
            <a
              href="https://github.com/YashIsTheBest247"
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sap-300 transition hover:text-sap-50"
              aria-label="GitHub"
            >
              <Github size={14} className="transition group-hover:scale-110" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
