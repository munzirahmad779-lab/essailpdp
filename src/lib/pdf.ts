import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    throw new Error("File harus PDF");
  }
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new Error("PDF dilindungi kata sandi. Unggah salinan tanpa kata sandi.");
    }
    throw new Error("PDF tidak dapat dibaca. Pastikan file tidak rusak atau dilindungi kata sandi.");
  } finally {
    await task.destroy();
  }
}
