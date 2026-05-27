import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Play } from "lucide-react";
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
  { n: "01", title: "Paste LaTeX", body: "Drop in your existing .tex source — the resume you already trust." },
  { n: "02", title: "Paste the JD", body: "Copy the job description straight from the listing. Title, requirements, the lot." },
  { n: "03", title: "Download PDF", body: "Named Firstname_Company_Role.pdf. Formatting untouched. Ready to send." },
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
        className="relative overflow-hidden px-8 pt-12 pb-16"
      >
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="max-w-5xl">
            <p className="eyebrow text-sap-200/70">/ STRIDE · Resume Engine</p>

            <p className="serif mt-4 text-2xl text-sap-100/85 md:text-3xl">
              Stride — <span className="text-sap-50">Your Resume.</span> Engineered to Win.
            </p>

            <h1 className="display mt-5 text-[clamp(2.5rem,6.5vw,5.5rem)]">
              <span className="block chrome">Tailored.</span>
              <span className="block text-sap-200">
                <TypewriterWord words={ROTATING} />
              </span>
              <span className="block chrome">Hired Faster.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-sap-200/70">
              Paste your LaTeX. Paste a job description. STRIDE rewrites only what an ATS reads — bullets, skills, keywords — and ships a polished PDF in seconds. Your formatting stays exactly where you put it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
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
      <section id="how" className="px-8 pt-20 pb-12">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-16 flex items-end justify-between gap-8">
            <div>
              <p className="eyebrow text-sap-200/70">/ Pipeline</p>
              <h2 className="display mt-4 text-5xl text-sap-50">
                Three steps. <span className="chrome">No tinkering.</span>
              </h2>
            </div>
            <p className="hidden md:block max-w-md text-sm text-sap-200/55">
              No Overleaf round-trip. No toolchain on your machine. Paste, click, download.
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
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <p className="eyebrow text-sap-400">STRIDE · 2026</p>
          <p className="serif text-sap-300">Engineered to Win.</p>
        </div>
      </footer>
    </main>
  );
}
