# Rendering golden tests

`npm run test:golden` compiles the production renderer in isolation and runs it
against a synthetic 96×64 RGBA image. The four approved hashes cover the
default grayscale watermark, colored multiline text with offsets and row
stagger, rotated/overlapping redactions, and the untouched original-image path.

The comparison is over the final decoded RGBA buffer, so image encoder metadata
and compression cannot make the test flaky. On a mismatch, the test writes the
actual output as `tests/artifacts/<scenario>.actual.ppm` for visual inspection.
That directory is ignored by Git.

The software Canvas harness uses a small deterministic bitmap font. This makes
text geometry and compositing stable on every CI operating system, but it does
not characterize a browser's platform-dependent font rasterization. Browser
font and canvas compatibility belongs in the deferred browser smoke suite.

To intentionally approve a rendering change, first inspect the failing PPM,
then run `UPDATE_GOLDEN_HASHES=1 npm run test:golden` and copy the printed hashes
into `approved` in `watermarkRenderer.test.mjs`. Run the normal command again to
verify the committed baselines.
