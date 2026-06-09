/**
 * Client-side PDF → text extraction via pdf.js.
 *
 * Runs entirely in the browser (no backend round-trip) — the extracted text is
 * dropped straight into the Job Description box, so tailoring works the same as
 * a pasted JD. pdf.js (~1MB) is dynamically imported so it only loads when a
 * user actually uploads a PDF, keeping the initial bundle small.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((it) => ("str" in it ? it.str : "")).join(" "),
      );
    }
    return pages
      .join("\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    // Free the worker's document resources.
    void loadingTask.destroy();
  }
}
