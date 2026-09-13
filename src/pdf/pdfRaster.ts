import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import type { DocumentPage } from "./documentPage";

// Rasterising is what makes redactions real: the exported PDF holds pixels, so
// covered text cannot be selected, copied or recovered from the file.
const TARGET_DPI = 150;
const POINTS_PER_INCH = 72;
const MAX_PAGE_DIMENSION = 2400;

export class PdfPasswordError extends Error {}
export class PdfPageLimitError extends Error {}

function pageRenderScale(pointWidth: number, pointHeight: number): number {
  const dpiScale = TARGET_DPI / POINTS_PER_INCH;
  const longestSide = Math.max(pointWidth, pointHeight);
  return Math.min(dpiScale, MAX_PAGE_DIMENSION / longestSide);
}

/**
 * Decodes a PDF entirely in the browser and returns one raster page per PDF
 * page. pdf.js is imported lazily so visitors who only watermark images never
 * download it.
 */
export async function renderPdfPages(
  data: ArrayBuffer,
  maxPages: number,
): Promise<DocumentPage[]> {
  const pdfjs = await import("pdfjs-dist");
  // Vite bundles and names the worker itself, rather than us pointing pdf.js at
  // a .mjs URL: static hosts commonly serve that extension as
  // application/octet-stream, which browsers refuse to run as a module.
  pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

  const assetBase = `${import.meta.env.BASE_URL}pdfjs/`;
  const task = pdfjs.getDocument({
    data,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
    wasmUrl: `${assetBase}wasm/`,
  });

  let pdf: Awaited<typeof task.promise>;
  try {
    pdf = await task.promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new PdfPasswordError(
        "That PDF is password protected. Remove the password and try again.",
      );
    }
    throw error;
  }

  try {
    if (pdf.numPages > maxPages) {
      throw new PdfPageLimitError(
        `That PDF has ${pdf.numPages} pages. Keep it under ${maxPages}.`,
      );
    }

    const pages: DocumentPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: pageRenderScale(unscaled.width, unscaled.height),
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not create a rendering canvas.");

      // Scanned pages are transparent outside their content, and a transparent
      // export would turn black once flattened into the PDF.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, viewport }).promise;
      page.cleanup();

      pages.push({
        source: canvas,
        width: canvas.width,
        height: canvas.height,
        pointWidth: unscaled.width,
        pointHeight: unscaled.height,
      });
    }

    return pages;
  } finally {
    await task.destroy();
  }
}
