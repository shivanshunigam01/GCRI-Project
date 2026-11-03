/**
 * Render every page of the latest SAMPLE redesign PDF to PNG via Playwright + local pdfjs-dist.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdfJs = fs.readFileSync(path.join(pdfjsRoot, "build", "pdf.min.mjs"));
const pdfWorker = fs.readFileSync(path.join(pdfjsRoot, "build", "pdf.worker.min.mjs"));

const reportsDir = path.resolve("uploads/reports");
const outDir = path.resolve("uploads/report-previews");
fs.mkdirSync(outDir, { recursive: true });

const argPdf = process.argv[2];
let resolvedPdf = argPdf ? path.resolve(argPdf) : null;
if (!resolvedPdf) {
  const latest = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith("SAMPLE_GRAICE_Report_REDESIGN_") && f.endsWith(".pdf"))
    .map((f) => ({ f, t: fs.statSync(path.join(reportsDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  if (!latest) {
    console.error("No SAMPLE_GRAICE_Report_REDESIGN_*.pdf found");
    process.exit(1);
  }
  resolvedPdf = path.join(reportsDir, latest.f);
}

console.log("Rendering:", resolvedPdf);
const pdfBytes = fs.readFileSync(resolvedPdf);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 2000 } });

await page.route("**/*", async (route) => {
  const url = route.request().url();
  if (url.endsWith("/pdf.sample")) {
    return route.fulfill({ status: 200, contentType: "application/pdf", body: pdfBytes });
  }
  if (url.endsWith("/pdf.min.mjs")) {
    return route.fulfill({ status: 200, contentType: "text/javascript", body: pdfJs });
  }
  if (url.endsWith("/pdf.worker.min.mjs")) {
    return route.fulfill({ status: 200, contentType: "text/javascript", body: pdfWorker });
  }
  if (url === "http://report.local/" || url === "http://report.local") {
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>body{margin:0;background:#525659}canvas{display:block;margin:12px auto;background:#fff}</style>
</head><body>
<script type="module">
  import * as pdfjsLib from "/pdf.min.mjs";
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  try {
    const res = await fetch("/pdf.sample");
    const buf = await res.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    window.__PAGE_COUNT__ = pdf.numPages;
    const scale = 1.7;
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i);
      const viewport = pg.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.dataset.page = String(i);
      document.body.appendChild(canvas);
      await pg.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    }
    window.__RENDER_DONE__ = true;
  } catch (e) {
    window.__RENDER_ERROR__ = String(e && e.stack || e);
    window.__RENDER_DONE__ = true;
  }
</script>
</body></html>`,
    });
  }
  return route.fulfill({ status: 404, body: "not found" });
});

page.on("console", (msg) => console.log("PAGE:", msg.type(), msg.text()));
page.on("pageerror", (err) => console.error("PAGEERROR:", err.message));

await page.goto("http://report.local/", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => window.__RENDER_DONE__ === true, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__RENDER_ERROR__ || null);
if (err) {
  console.error("Render failed:", err);
  await browser.close();
  process.exit(1);
}

const count = await page.evaluate(() => window.__PAGE_COUNT__);
console.log("Pages:", count);

for (const f of fs.readdirSync(outDir)) {
  if (f.startsWith("page-") && f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
}

for (let i = 1; i <= count; i++) {
  const handle = await page.$(`canvas[data-page="${i}"]`);
  if (!handle) continue;
  const out = path.join(outDir, `page-${String(i).padStart(2, "0")}.png`);
  await handle.screenshot({ path: out, type: "png" });
  console.log("Wrote", out);
}

await browser.close();
console.log("Preview render complete.");
