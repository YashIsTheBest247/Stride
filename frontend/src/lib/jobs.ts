const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

export interface JobResult {
  company: string;
  role: string;
  location: string;
  description: string;
  url: string;
  source: string;          // "greenhouse" | "lever" | "linkedin" | "indeed" | "glassdoor" | …
  posted_at: string;
  logo_url: string;
  stipend: string;         // e.g. "$25/hr"  |  "$50K–$80K/yr"  |  ""
  duration: string;        // e.g. "12 weeks" |  "Summer 2026"  |  ""
}

export interface SearchOptions {
  role?: string;
  location?: string;
  internshipOnly?: boolean;
  topN?: number;
}

export async function searchJobs(opts: SearchOptions): Promise<JobResult[]> {
  const res = await fetch(`${BASE}/search-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: opts.role ?? "",
      location: opts.location ?? "",
      internship_only: opts.internshipOnly ?? false,
      top_n: opts.topN ?? 50,
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
  return (await res.json()) as JobResult[];
}
