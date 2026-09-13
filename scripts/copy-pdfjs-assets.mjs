// pdf.js fetches character maps, standard font data and its image-decoder wasm
// at runtime. Copying them into public/ keeps rendering fully local instead of
// falling back to a CDN, which would defeat the point of this tool.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_DIRECTORIES = ["cmaps", "standard_fonts", "wasm"];

const pdfjsRoot = dirname(
  createRequire(import.meta.url).resolve("pdfjs-dist/package.json"),
);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const targetRoot = join(projectRoot, "public", "pdfjs");

rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(targetRoot, { recursive: true });

for (const directory of RUNTIME_DIRECTORIES) {
  cpSync(join(pdfjsRoot, directory), join(targetRoot, directory), {
    recursive: true,
  });
}

console.log(`pdf.js runtime assets copied to ${targetRoot}`);
