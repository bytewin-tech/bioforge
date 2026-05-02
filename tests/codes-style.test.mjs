import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadCodesModule() {
  const filename = path.join(process.cwd(), "src/lib/codes.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require,
    TextEncoder,
  };

  vm.runInNewContext(compiled, context, { filename });
  return context.exports;
}

test("qrSvg renders custom QR styling options into the SVG", () => {
  const { qrSvg } = loadCodesModule();
  const svg = qrSvg("https://bioforge.app/launch", {
    foreground: "#1f3f34",
    background: "#fff7df",
    accent: "#d46b45",
    dotStyle: "rounded",
    cornerStyle: "rounded",
    gradient: true,
    logoText: "BF",
    frameText: "Scan to open Bioforge",
    scanSafe: false,
  });

  assert.match(svg, /<linearGradient/);
  assert.match(svg, /fill="url\(#qr-gradient\)"/);
  assert.match(svg, /rx="0\.32"/);
  assert.match(svg, /Scan to open Bioforge/);
  assert.match(svg, />BF</);
});

test("scan-safe QR output preserves phone-readable defaults", () => {
  const { qrSvg, barcodeSvg } = loadCodesModule();
  const qr = qrSvg("https://bioforge.app/launch", {
    foreground: "#1f3f34",
    background: "#fff7df",
    gradient: true,
    dotStyle: "dots",
    logoText: "BF",
    scanSafe: true,
  });
  const barcode = barcodeSvg("BF-2026-OVERNIGHT");

  assert.doesNotMatch(qr, /<linearGradient/);
  assert.doesNotMatch(qr, />BF</);
  assert.match(qr, /fill="#ffffff"/);
  assert.match(qr, /<g fill="#000000">/);
  assert.match(qr, /viewBox="0 0 37 37/);
  assert.match(barcode, /height="132"/);
  assert.match(barcode, /x="36" y="36"/);
});

test("home page presents the polished studio workspace", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");

  assert.match(source, /Bioforge Studio/);
  assert.match(source, /Live proof/);
  assert.match(source, /Export console/);
  assert.match(source, /Copy SVG/);
  assert.match(source, /Download PNG/);
  assert.match(source, /Phone scan-safe/);
  assert.match(source, /black-on-white QR and barcode/);
});
