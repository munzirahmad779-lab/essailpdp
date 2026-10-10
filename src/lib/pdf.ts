export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== "application/pdf") throw new Error("File harus PDF");
  const pdfjs = await import("pdfjs-dist");
  
  // Standard bundler-compatible way to load worker
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    return pages.join("\n\n").replace(/\s+\n/g, "\n").trim();
  } catch {
    throw new Error("PDF tidak dapat dibaca. Pastikan file tidak rusak atau dilindungi kata sandi.");
  } finally {
    await task.destroy();
  }
}
