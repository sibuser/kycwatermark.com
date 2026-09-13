/**
 * One rasterised page of a loaded document. Images produce a single page backed
 * by the decoded `HTMLImageElement`; PDFs produce one canvas per page.
 *
 * `width`/`height` are pixels and drive both the editor canvas and the export.
 * `pointWidth`/`pointHeight` carry the original PDF page box so the exported
 * file keeps the paper size it came in with.
 */
export type DocumentPage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  pointWidth: number;
  pointHeight: number;
};
