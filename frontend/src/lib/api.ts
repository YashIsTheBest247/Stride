const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export interface TailorResponse {
  blob: Blob;
  filename: string;
  company: string;
  role: string;
}

export interface TailorStep {
  step: string;
  label: string;
}

function parseFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

export async function tailorResume(
  latexSource: string,
  jobDescription: string
): Promise<TailorResponse> {
  const res = await fetch(`${BASE}/tailor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latex_source: latexSource,
      job_description: jobDescription,
    }),
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const filename = parseFilename(res.headers.get("Content-Disposition"), "resume.pdf");
  const company = res.headers.get("X-Resume-Company") ?? "";
  const role = res.headers.get("X-Resume-Role") ?? "";
  const blob = await res.blob();
  return { blob, filename, company, role };
}

/**
 * Streaming tailor — same pipeline as `tailorResume`, but reports real per-step
 * progress via Server-Sent Events. `onStep` fires for each backend phase
 * (sanitize → tailor → compile → shrink …); the final event carries the PDF.
 */
export async function tailorResumeStream(
  latexSource: string,
  jobDescription: string,
  onStep: (s: TailorStep) => void,
): Promise<TailorResponse> {
  const res = await fetch(`${BASE}/tailor/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latex_source: latexSource, job_description: jobDescription }),
  });

  if (!res.ok || !res.body) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let evt: { step: string; label?: string; message?: string; pdf?: string; filename?: string; company?: string; role?: string };
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (evt.step === "error") throw new Error(evt.message || "Tailoring failed.");
      if (evt.step === "done") {
        const bytes = Uint8Array.from(atob(evt.pdf ?? ""), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        return {
          blob,
          filename: evt.filename ?? "resume.pdf",
          company: evt.company ?? "",
          role: evt.role ?? "",
        };
      }
      onStep({ step: evt.step, label: evt.label ?? evt.step });
    }
  }

  throw new Error("Stream ended before the PDF was ready.");
}

/** Reduce raw PDF-extracted text to just role + responsibilities + requirements + skills. */
export async function distillJobDescription(text: string): Promise<string> {
  const res = await fetch(`${BASE}/distill-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as { job_description?: string };
  return data.job_description ?? text;
}
