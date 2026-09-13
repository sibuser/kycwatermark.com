# KYCWatermark.com

An offline-first web app for adding purpose-specific watermarks to ID images and PDF documents directly in the browser.

## Screenshot

![KYC Watermark Tool screenshot](./docs/screenshot.png)

## Why

When sharing identity documents for KYC, a visible watermark helps reduce misuse by making it clear the image was shared for a specific purpose. This project exists to provide a quick, private, and customizable way to do that without uploading files to a server.

## PDFs

PDFs up to 30 pages are supported alongside images. Each page is rendered to a
canvas with pdf.js, watermarked, and written back out with pdf-lib, so the
export is a flattened PDF: text covered by a redaction box is gone from the file
rather than merely hidden behind an overlay, and nothing can be selected, copied
or recovered. The trade-off is that the exported text is no longer searchable.

Redactions are tracked per page, and pdf.js only downloads when a PDF is
actually opened, so the image workflow is unaffected.

pdf.js needs its character maps, standard fonts and image-decoder wasm at
runtime. `scripts/copy-pdfjs-assets.mjs` copies them from `node_modules` into
`public/pdfjs/` and is run automatically by `pnpm dev` and `pnpm build`, which
keeps the app fully offline instead of reaching for a CDN.

## Run Locally

### Prerequisites

- Node.js 20+
- pnpm 10+

### Clone the repository

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

### Setup

```bash
pnpm install
```

### Start the development server

```bash
pnpm dev
```

Open `http://localhost:5173` in your browser.

### Production build and preview

```bash
pnpm build
pnpm preview
```

### Docker

Build and serve the production bundle with nginx on `http://localhost:8080`:

```bash
docker compose up --build web
```

Run the Vite dev server with hot reload on `http://localhost:5173`:

```bash
docker compose --profile dev up --build dev
```

The image is built without `.git` in the context, so the commit hash shown in the
footer is passed in as a build argument:

```bash
COMMIT_HASH=$(git rev-parse --short HEAD) docker compose build web
```

Plain Docker works too:

```bash
docker build -t kycwatermark --build-arg COMMIT_HASH="$(git rev-parse --short HEAD)" .
docker run --rm -p 8080:8080 kycwatermark
```

### Prebuilt container image

CI publishes a `linux/amd64` image to GitHub Container Registry on every push
to `main`:

```bash
docker run --rm -p 8080:8080 ghcr.io/sibuser/kycwatermark.com:latest
```

Available tags: `latest`, `main`, and `sha-<full-commit-sha>`.

Build provenance is attested and can be verified with:

```bash
gh attestation verify oci://ghcr.io/sibuser/kycwatermark.com:latest --repo sibuser/kycwatermark.com
```

## Type check

```bash
pnpm lint
```

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- pdf.js (PDF rendering) and pdf-lib (PDF output)
