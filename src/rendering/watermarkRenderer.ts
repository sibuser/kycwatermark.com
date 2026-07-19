import type { RedactionRect } from "../imageLogic";

export type WatermarkRenderOptions = {
  width: number;
  height: number;
  watermarked: boolean;
  grayscale: boolean;
  redactions: readonly RedactionRect[];
  lines: readonly string[];
  opacity: number;
  color: string;
  font: string;
  angleDegrees: number;
  offsetX: number;
  offsetY: number;
  spacingX: number;
  spacingY: number;
  fontSize: number;
  lineGap: number;
  stagger: number;
};

/**
 * Draws the exported image layers. The caller owns sizing the canvas and may
 * draw editor-only overlays afterwards. Keeping this function free of React
 * makes the output contract directly testable.
 */
export function renderWatermarkedImage(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  options: WatermarkRenderOptions,
): void {
  const { width, height } = options;

  context.save();
  context.clearRect(0, 0, width, height);
  context.filter =
    options.watermarked && options.grayscale ? "grayscale(100%)" : "none";
  context.drawImage(source, 0, 0, width, height);
  context.restore();

  if (!options.watermarked) return;

  for (const rect of options.redactions) {
    context.save();
    context.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    context.rotate(rect.angle);
    context.fillStyle = "#000000";
    context.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    context.restore();
  }

  if (options.lines.length === 0 || options.opacity <= 0) return;

  context.save();
  context.globalAlpha = options.opacity;
  context.fillStyle = options.color;
  context.font = options.font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.translate(width / 2 + options.offsetX, height / 2 + options.offsetY);
  context.rotate((Math.PI / 180) * options.angleDegrees);

  const diagonal = Math.sqrt(width * width + height * height);
  const lineHeight = options.fontSize + options.lineGap;
  const rows: number[] = [];
  for (let y = -diagonal; y <= diagonal; y += options.spacingY) rows.push(y);
  const centerRowIndex = Math.floor(rows.length / 2);

  rows.forEach((y, rowIndex) => {
    const rowOffset = (rowIndex - centerRowIndex) * options.stagger;
    for (
      let x = -diagonal + rowOffset - options.spacingX;
      x <= diagonal + options.spacingX;
      x += options.spacingX
    ) {
      options.lines.forEach((line, lineIndex) => {
        context.fillText(line, x, y + lineIndex * lineHeight);
      });
    }
  });

  context.restore();
}
