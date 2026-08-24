import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Recursos auxiliares do pdf.js (fontes padrão, CMaps e wasm) servidos pela
 * CDN oficial do pacote, na mesma versão instalada.
 */
const CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/";

export function openPdf(data: ArrayBuffer): PDFDocumentLoadingTask {
  return getDocument({
    data: new Uint8Array(data),
    cMapUrl: `${CDN}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${CDN}standard_fonts/`,
    wasmUrl: `${CDN}wasm/`,
  });
}

export interface PdfInfo {
  pages: number;
  title?: string;
  author?: string;
}

/** Lê número de páginas (e metadados embutidos, quando houver) de um PDF. */
export async function readPdfInfo(data: ArrayBuffer): Promise<PdfInfo> {
  const task = openPdf(data);
  const doc = await task.promise;
  let title: string | undefined;
  let author: string | undefined;
  try {
    const meta = await doc.getMetadata();
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    if (typeof info.Title === "string" && info.Title.trim()) title = info.Title.trim();
    if (typeof info.Author === "string" && info.Author.trim()) author = info.Author.trim();
  } catch {
    /* PDF sem metadados — seguimos com o nome do arquivo */
  }
  const pages = doc.numPages;
  await task.destroy();
  return { pages, title, author };
}
