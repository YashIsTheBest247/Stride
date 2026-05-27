const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export interface TailorResponse {
  blob: Blob;
  filename: string;
  company: string;
  role: string;
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
