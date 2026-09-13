// Rasterised pages are photographic once a scan is involved, so JPEG keeps
// multi-page exports to a sane size. Quality stays high enough that small print
// on an ID stays legible.
const EXPORT_QUALITY = 0.92;

export type PdfExportPage = {
  pointWidth: number;
  pointHeight: number;
  /** Draws the finished page. Called one page at a time to cap peak memory. */
  render: () => HTMLCanvasElement | null;
};

function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode a page of the document."));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      "image/jpeg",
      EXPORT_QUALITY,
    );
  });
}

/** Assembles watermarked page canvases into a single PDF, in the browser. */
export async function buildWatermarkedPdf(
  pages: readonly PdfExportPage[],
): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();

  for (const page of pages) {
    const canvas = page.render();
    if (!canvas) throw new Error("Could not render a page of the document.");

    const bytes = await canvasToJpegBytes(canvas);
    // A full-resolution page canvas is tens of megabytes; release it before
    // rendering the next one rather than holding the whole document at once.
    canvas.width = 0;
    canvas.height = 0;

    const image = await pdf.embedJpg(bytes);
    const pdfPage = pdf.addPage([page.pointWidth, page.pointHeight]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: page.pointWidth,
      height: page.pointHeight,
    });
  }

  // pdf-lib is typed against an older DOM lib, so the buffer kind needs saying.
  const saved = (await pdf.save()) as Uint8Array<ArrayBuffer>;
  return new Blob([saved], { type: "application/pdf" });
}
