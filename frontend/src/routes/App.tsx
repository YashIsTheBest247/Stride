import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Download, Loader2, Sparkles, XCircle } from "lucide-react";
import Marquee from "../components/Marquee";
import { tailorResume, type TailorResponse } from "../lib/api";

type Status = "idle" | "loading" | "done" | "error";

export default function AppPage() {
  const [latex, setLatex] = useState("");
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<TailorResponse | null>(null);

  // Reset scroll on mount so the textarea panels are immediately visible
  // when arriving from /landing → /app.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const canSubmit = latex.trim().length > 100 && jd.trim().length > 50 && status !== "loading";

  async function handleSubmit() {
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const res = await tailorResume(latex, jd);
      setResult(res);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  function downloadPdf() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setLatex("");
    setJd("");
    setStatus("idle");
    setError("");
    setResult(null);
  }

  return (
    <main className="anim-page-enter relative">
      <section className="px-8 pt-36 pb-12">
        <div className="mx-auto max-w-[1400px]">
          <p className="eyebrow text-sap-200/70">/ Tailor</p>
          <h1 className="display mt-4 text-5xl text-sap-50 md:text-6xl">
            Paste. Generate. <span className="text-sap-100">Download.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-sap-100/65">
            Drop your LaTeX on the left, the job description on the right. STRIDE rewrites the parts an ATS reads and ships a PDF named <span className="font-mono text-sap-200">Firstname_Company_Role.pdf</span>.
          </p>
        </div>
      </section>

      <Marquee
        items={[
          "Rewrites bullets",
          "Injects keywords",
          "Preserves formatting",
          "Compiles to PDF",
          "Names the file",
        ]}
      />

      <section className="px-8 py-12">
        <div className="mx-auto max-w-[1400px]">
          {/* TWO PANES */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="display text-sm text-sap-100">01</span>
                  <h2 className="display text-xl text-sap-50">LaTeX source</h2>
                </div>
                <span className="eyebrow text-sap-100/40">{latex.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder={"\\documentclass{article}\n\\begin{document}\n...paste your full .tex source here...\n\\end{document}"}
                spellCheck={false}
                className="ta h-[420px]"
              />
            </div>

            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="display text-sm text-sap-100">02</span>
                  <h2 className="display text-xl text-sap-50">Job description</h2>
                </div>
                <span className="eyebrow text-sap-100/40">{jd.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description — title, responsibilities, requirements, tech stack..."
                spellCheck={false}
                className="ta h-[420px]"
              />
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="panel mt-6 flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${latex.trim().length > 100 ? "bg-sap-100" : "bg-white/15"}`} />
                <span className="eyebrow text-sap-100/55">LaTeX</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${jd.trim().length > 50 ? "bg-sap-100" : "bg-white/15"}`} />
                <span className="eyebrow text-sap-100/55">Job description</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!canSubmit} className="btn-cta min-w-[260px]">
              {status === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Tailoring & compiling</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate PDF</span>
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>
          </div>

          {/* RESULTS */}
          {status === "done" && result && (
            <div className="mt-10">
              <div className="panel-sap p-8">
                <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
                      <CheckCircle2 className="text-white" size={22} />
                    </div>
                    <div>
                      <p className="eyebrow text-white">Ready</p>
                      <h3 className="display mt-2 text-3xl break-words text-white">{result.filename}</h3>
                      {result.role && (
                        <p className="mt-2 text-sm text-white/80">
                          Tailored for {result.role.replace(/_/g, " ")}
                          {result.company && result.company !== "Company"
                            ? ` at ${result.company.replace(/_/g, " ")}`
                            : ""}.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={downloadPdf} className="btn-cta">
                      <Download size={14} />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={resetAll}
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-white/45 hover:bg-white/10 active:scale-[0.97]"
                    >
                      <ArrowLeft size={12} />
                      <span>Start over</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-10">
              <div className="rounded-3xl border border-red-400/30 bg-red-500/5 p-8">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-400/30">
                    <XCircle className="text-red-300" size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-red-300">Error</p>
                    <h3 className="display mt-2 text-2xl text-red-100">Something went wrong</h3>
                    <p className="mt-3 break-words text-sm text-red-100/70">{error}</p>
                    <button onClick={resetAll} className="btn-ghost mt-5">Try again</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
