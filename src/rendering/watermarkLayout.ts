import {
  getEffectiveWatermarkSpacing,
  type RedactionRect,
  scaleWatermarkSettings,
  type WatermarkSettings,
  wrapWatermarkText,
} from "../imageLogic";
import type { WatermarkRenderOptions } from "./watermarkRenderer";

const FONT_STACK =
  '"Avenir Next", "Sora", "Manrope", "Trebuchet MS", "Segoe UI", sans-serif';

export type TextMeasurer = (text: string, font: string) => number;

let sharedMeasurer: TextMeasurer | null | undefined;

/**
 * One offscreen context, created on first use, for all text measurement.
 * Returns null where canvas is unavailable, which callers estimate around.
 */
export function getTextMeasurer(): TextMeasurer | null {
  if (sharedMeasurer === undefined) {
    const context = document.createElement("canvas").getContext("2d");
    sharedMeasurer = context
      ? (text, font) => {
          context.font = font;
          return context.measureText(text).width;
        }
      : null;
  }
  return sharedMeasurer;
}

export type WatermarkLayoutInput = {
  width: number;
  height: number;
  scaleFactor: number;
  settings: WatermarkSettings;
  redactions: readonly RedactionRect[];
  watermarked: boolean;
  measureText: TextMeasurer | null;
};

/**
 * Resolves user-facing settings into the concrete numbers the renderer draws
 * with. Pages of a PDF differ in size, so the preview and every exported page
 * run through here independently rather than sharing one scaled layout.
 */
export function buildWatermarkRenderOptions({
  width,
  height,
  scaleFactor,
  settings,
  redactions,
  watermarked,
  measureText,
}: WatermarkLayoutInput): WatermarkRenderOptions {
  const scaled = scaleWatermarkSettings(settings, scaleFactor);
  const font = `600 ${scaled.fontSize}px ${FONT_STACK}`;
  const maxLineWidth = scaled.spacingX - scaled.fontSize * 0.6;

  const text = settings.text.trim();
  const { lines, textWidth } = !text
    ? { lines: [], textWidth: 0 }
    : measureText
      ? wrapWatermarkText(text, maxLineWidth, (line) => measureText(line, font))
      : { lines: [text], textWidth: text.length * scaled.fontSize * 0.58 };

  const effective = getEffectiveWatermarkSpacing(
    lines,
    textWidth,
    scaled.fontSize,
    scaled.spacingX,
    scaled.spacingY,
    scaled.lineGap,
  );

  return {
    width,
    height,
    watermarked,
    grayscale: settings.grayscale,
    redactions,
    lines,
    opacity: settings.opacity,
    color: settings.color,
    font,
    angleDegrees: settings.angle,
    offsetX: scaled.offsetX,
    offsetY: scaled.offsetY,
    spacingX: effective.spacingX,
    spacingY: effective.spacingY,
    fontSize: scaled.fontSize,
    lineGap: scaled.lineGap,
    stagger: scaled.stagger,
  };
}
