import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderWatermarkedImage } from "../../.test-build/rendering/watermarkRenderer.js";
import { makeSyntheticImage, SoftwareCanvasContext } from "./softwareCanvas.mjs";

const width = 96;
const height = 64;
const source = makeSyntheticImage(width, height);
const here = dirname(fileURLToPath(import.meta.url));

const defaults = {
  width,
  height,
  watermarked: true,
  grayscale: true,
  redactions: [],
  lines: ["KYC ONLY"],
  opacity: 0.4,
  color: "#353b46",
  font: '600 7px "Golden Test Bitmap"',
  angleDegrees: -32,
  offsetX: 0,
  offsetY: 0,
  spacingX: 42,
  spacingY: 18,
  fontSize: 7,
  lineGap: 3,
  stagger: 0,
};

const scenarios = {
  "default-watermark": defaults,
  "color-multiline-offset-stagger": { ...defaults, grayscale: false, lines: ["ONLY FOR", "ACME 2026"], opacity: 0.62, color: "#b42318", angleDegrees: 18, offsetX: 7, offsetY: -4, spacingX: 48, spacingY: 25, lineGap: 2, stagger: 11 },
  "rotated-overlapping-redactions": { ...defaults, lines: ["PRIVATE"], grayscale: false, opacity: 0.25, redactions: [{ x: 9, y: 11, w: 31, h: 13, angle: Math.PI / 12 }, { x: 29, y: 20, w: 42, h: 17, angle: -Math.PI / 7 }] },
  "original-has-no-transformations": { ...defaults, watermarked: false, redactions: [{ x: 1, y: 1, w: 90, h: 60, angle: 0 }] },
};

// Exact hashes of decoded RGBA buffers—not encoded image bytes.
const approved = {
  "default-watermark": "14855f076ccbc699a75f6082bcb6e5248c37a54ceff5b788fee2a12d2ea7eddd",
  "color-multiline-offset-stagger": "825ea50e3ae667faab5ed79a6ba326fada06a0f335342f017e0ed37139828866",
  "rotated-overlapping-redactions": "444ac9bd89b0836554efd46d38831cb94c4f4f751d13a370b7635231c3d7a2f5",
  "original-has-no-transformations": "ebb9eff40a5faafc6b1235a317e058576f2b9fbd7ba03d6d8277e6ccde4e6fed",
};

function hash(pixels) { return createHash("sha256").update(pixels).digest("hex"); }

function writePpm(name, pixels) {
  const artifactDirectory = resolve(here, "../artifacts");
  mkdirSync(artifactDirectory, { recursive: true });
  const rgb = Buffer.alloc(width * height * 3);
  for (let from = 0, to = 0; from < pixels.length; from += 4) {
    rgb[to++] = pixels[from];
    rgb[to++] = pixels[from + 1];
    rgb[to++] = pixels[from + 2];
  }
  const path = resolve(artifactDirectory, `${name}.actual.ppm`);
  writeFileSync(path, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), rgb]));
  return path;
}

for (const [name, options] of Object.entries(scenarios)) {
  test(`golden RGBA output: ${name}`, () => {
    const context = new SoftwareCanvasContext(width, height);
    renderWatermarkedImage(context, source, options);
    const actual = hash(context.pixels);
    if (process.env.UPDATE_GOLDEN_HASHES === "1") {
      console.log(`${JSON.stringify(name)}: ${JSON.stringify(actual)},`);
      return;
    }
    if (actual !== approved[name]) {
      const artifact = writePpm(name, context.pixels);
      assert.equal(actual, approved[name], `decoded RGBA changed; inspect ${artifact}`);
    }
  });
}
