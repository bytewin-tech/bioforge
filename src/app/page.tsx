"use client";

import { useMemo, useState } from "react";
import {
  barcodeSvg,
  normalizeBarcodeValue,
  qrSvg,
  type QrCornerStyle,
  type QrDotStyle,
  type QrStyleOptions,
} from "@/lib/codes";

type CodeMode = "qr" | "barcode";
type Notice = { tone: "success" | "error"; text: string } | null;
type QrColorKey = "foreground" | "background" | "accent";

type QrPreset = {
  name: string;
  description: string;
  badge: string;
  style: QrStyleOptions;
};

const starterValues = [
  "https://bioforge.app/launch",
  "BF-2026-OVERNIGHT",
  "hello@bioforge.app",
];

const qrPresets: QrPreset[] = [
  {
    name: "Phone Scan",
    description: "Maximum contrast, full quiet zone, no decoration.",
    badge: "Safe",
    style: {
      foreground: "#000000",
      background: "#ffffff",
      accent: "#000000",
      dotStyle: "square",
      cornerStyle: "square",
      gradient: false,
      frameText: "Scan to open Bioforge",
      scanSafe: true,
    },
  },
  {
    name: "Ledger",
    description: "Warm stock, sage modules, rust accent.",
    badge: "Premium",
    style: {
      foreground: "#203f34",
      background: "#fff7df",
      accent: "#c8613f",
      dotStyle: "rounded",
      cornerStyle: "rounded",
      gradient: true,
      logoText: "BF",
      frameText: "Scan to open Bioforge",
      scanSafe: false,
    },
  },
  {
    name: "Field Tag",
    description: "Crisp stamp treatment for inventory labels.",
    badge: "Print",
    style: {
      foreground: "#23391f",
      background: "#f7efd7",
      accent: "#718c5e",
      dotStyle: "square",
      cornerStyle: "rounded",
      gradient: false,
      frameText: "Bioforge launch",
      scanSafe: false,
    },
  },
  {
    name: "Coastal Proof",
    description: "Blue export proof with dotted modules.",
    badge: "Share",
    style: {
      foreground: "#263b4a",
      background: "#fbfcf6",
      accent: "#4d85a1",
      dotStyle: "dots",
      cornerStyle: "rounded",
      gradient: true,
      logoText: "QR",
      frameText: "Scan me",
      scanSafe: false,
    },
  },
];

const qrColorControls: { label: string; key: QrColorKey; fallback: string }[] = [
  { label: "Ink", key: "foreground", fallback: "#203f34" },
  { label: "Paper", key: "background", fallback: "#fff7df" },
  { label: "Accent", key: "accent", fallback: "#c8613f" },
];

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function svgToPngBlob(svg: string, width = 1200) {
  const image = new Image();
  image.decoding = "async";
  image.src = svgToDataUrl(svg);

  await image.decode();

  const ratio = image.height / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width * ratio);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export PNG."));
    }, "image/png");
  });
}

export default function Home() {
  const [mode, setMode] = useState<CodeMode>("qr");
  const [content, setContent] = useState(starterValues[0]);
  const [notice, setNotice] = useState<Notice>(null);
  const [qrStyle, setQrStyle] = useState<QrStyleOptions>(qrPresets[0].style);
  const [logoImage, setLogoImage] = useState("");
  const scanSafe = qrStyle.scanSafe ?? true;

  const normalizedBarcode = useMemo(() => normalizeBarcodeValue(content), [content]);
  const generated = useMemo(() => {
    const trimmed = content.trim();

    if (!trimmed) {
      return { svg: "", error: "Enter a URL, message, or SKU to start." };
    }

    try {
      if (mode === "qr") {
        return { svg: qrSvg(trimmed, { ...qrStyle, logoImage }), error: "" };
      }

      const barcode = normalizeBarcodeValue(trimmed);
      if (!barcode) {
        return { svg: "", error: "Barcode supports A-Z, 0-9, spaces, and - . / $ + %." };
      }

      return {
        svg: barcodeSvg(
          barcode,
          scanSafe ? "#000000" : qrStyle.foreground,
          scanSafe ? "#ffffff" : qrStyle.background,
        ),
        error: "",
      };
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : "Could not generate this code.",
      };
    }
  }, [content, logoImage, mode, qrStyle, scanSafe]);

  const hasOutput = Boolean(generated.svg && !generated.error);
  const currentType = mode === "qr" ? "QR matrix" : "Code 39 barcode";
  const filenameBase = `bioforge-${mode}`;

  function updateQrStyle(next: Partial<QrStyleOptions>) {
    setQrStyle((current) => ({ ...current, ...next }));
    setNotice(null);
  }

  function applyPreset(preset: QrPreset) {
    setQrStyle(preset.style);
    setLogoImage("");
    setNotice({ tone: "success", text: `${preset.name} preset applied.` });
  }

  function handleLogoUpload(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setLogoImage(typeof reader.result === "string" ? reader.result : "");
      setNotice({ tone: "success", text: "Logo added to QR preview." });
    };
    reader.onerror = () => {
      setNotice({ tone: "error", text: "Could not read that logo file." });
    };
    reader.readAsDataURL(file);
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content.trim());
      setNotice({ tone: "success", text: "Content copied." });
    } catch {
      setNotice({ tone: "error", text: "Clipboard access is blocked." });
    }
  }

  async function copySvg() {
    if (!generated.svg) return;

    try {
      await navigator.clipboard.writeText(generated.svg);
      setNotice({ tone: "success", text: "SVG copied." });
    } catch {
      setNotice({ tone: "error", text: "Clipboard access is blocked." });
    }
  }

  async function downloadSvg() {
    if (!generated.svg) return;
    downloadBlob(new Blob([generated.svg], { type: "image/svg+xml" }), `${filenameBase}.svg`);
    setNotice({ tone: "success", text: "SVG downloaded." });
  }

  async function downloadPng() {
    if (!generated.svg) return;

    try {
      const blob = await svgToPngBlob(generated.svg);
      downloadBlob(blob, `${filenameBase}.png`);
      setNotice({ tone: "success", text: "PNG downloaded." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "PNG export failed.",
      });
    }
  }

  async function shareCode() {
    if (!generated.svg) return;

    try {
      const blob = await svgToPngBlob(generated.svg, 1000);
      const file = new File([blob], `${filenameBase}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await navigator.share({
          title: "Bioforge code",
          text: content.trim(),
          files: [file],
        });
        setNotice({ tone: "success", text: "Share sheet opened." });
        return;
      }

      await navigator.clipboard.writeText(content.trim());
      setNotice({ tone: "success", text: "Sharing is unavailable, so content was copied." });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "error", text: "Could not share from this browser." });
    }
  }

  return (
    <main className="studio-shell min-h-screen text-[#2f261a]">
      <div className="studio-canvas pointer-events-none fixed inset-0" />
      <div className="studio-grid pointer-events-none fixed inset-0 opacity-[0.2]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1660px] flex-col gap-3 p-3 sm:p-4">
        <header className="studio-topbar flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#b8543f]" />
              <span className="h-3 w-3 rounded-full bg-[#d6a84f]" />
              <span className="h-3 w-3 rounded-full bg-[#6f8f62]" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl font-semibold text-[#302416]">
                Bioforge Studio
              </p>
              <p className="text-xs font-bold uppercase text-[#756447]">
                QR and barcode workbench
              </p>
            </div>
          </div>

          <div className="order-3 grid w-full grid-cols-2 gap-1 rounded-md border border-[#a38c62]/55 bg-[#f7eed9]/80 p-1 text-sm font-bold text-[#58472d] sm:order-none sm:w-auto sm:min-w-[230px]">
            {(["qr", "barcode"] as CodeMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setNotice(null);
                }}
                className={`rounded px-4 py-2.5 transition ${
                  mode === item
                    ? "bg-[#2f4e37] text-[#fff8df] shadow-sm"
                    : "hover:bg-[#eadfc5]"
                }`}
              >
                {item === "qr" ? "QR Code" : "Barcode"}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {["Compose", "Style", "Proof", "Export"].map((item, index) => (
              <span
                key={item}
                className={`rounded-md border px-3 py-2 text-xs font-bold uppercase ${
                  index < 3
                    ? "border-[#9aaa79]/70 bg-[#e5edd5] text-[#385132]"
                    : "border-[#86a9ba]/70 bg-[#e3f0f4] text-[#2d5b6f]"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-3 xl:grid-cols-[370px_minmax(420px,1fr)_330px]">
          <aside className="studio-panel flex min-h-0 flex-col gap-3 p-3 sm:p-4">
            <section className="tool-section">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <p>Compose</p>
                  <h2>Content source</h2>
                </div>
              </div>

              <label htmlFor="code-content" className="field-label mt-4">
                Destination or label text
              </label>
              <textarea
                id="code-content"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setNotice(null);
                }}
                placeholder={
                  mode === "qr" ? "Paste a URL, message, or contact detail" : "Enter a SKU"
                }
                className="mt-2 min-h-36 w-full resize-none rounded-md border border-[#ad966b]/70 bg-[#fffaf0] px-4 py-3 text-base leading-7 text-[#302416] shadow-inner outline-none transition placeholder:text-[#9b8a6b] focus:border-[#55754c] focus:bg-[#fffdf6]"
              />

              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-[#786546]">
                <span>{content.trim().length} characters</span>
                <button
                  type="button"
                  onClick={copyContent}
                  disabled={!content.trim()}
                  className="rounded-md border border-[#a38c62]/60 bg-[#f3e7cc] px-3 py-2 text-[#4d3d29] transition hover:bg-[#fff6df] disabled:opacity-40"
                >
                  Copy content
                </button>
              </div>

              {mode === "barcode" && content !== normalizedBarcode ? (
                <p className="mt-3 rounded-md border border-[#d4a15d]/70 bg-[#fff0ce] px-3 py-2 text-xs font-semibold text-[#88531c]">
                  Barcode will normalize to: {normalizedBarcode || "supported characters only"}
                </p>
              ) : null}

              <div className="mt-4 grid gap-2">
                {starterValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setContent(value);
                      setNotice(null);
                    }}
                    className="rounded-md border border-[#b7a071]/65 bg-[#f5ead0] px-3 py-2.5 text-left text-xs font-semibold text-[#5d4c33] transition hover:border-[#6f8f62] hover:bg-[#e9efd8]"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </section>

            <section className="tool-section">
              <div className="section-heading">
                <span>02</span>
                <div>
                  <p>Style system</p>
                  <h2>QR customization</h2>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {qrPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="preset-row group"
                  >
                    <span>
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                    </span>
                    <em>{preset.badge}</em>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {qrColorControls.map(({ label, key, fallback }) => (
                  <label key={key} className="field-label">
                    <span className="mb-1 block">{label}</span>
                    <input
                      type="color"
                      value={qrStyle[key] ?? fallback}
                      onChange={(event) => updateQrStyle({ [key]: event.target.value })}
                      className="h-11 w-full rounded-md border border-[#a98f5f]/70 bg-[#fff8e6] p-1"
                      aria-label={`${label} color`}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="field-label">
                  <span className="mb-1 block">Modules</span>
                  <select
                    value={qrStyle.dotStyle ?? "square"}
                    onChange={(event) =>
                      updateQrStyle({ dotStyle: event.target.value as QrDotStyle })
                    }
                    className="control-input"
                  >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                    <option value="dots">Dots</option>
                  </select>
                </label>
                <label className="field-label">
                  <span className="mb-1 block">Corners</span>
                  <select
                    value={qrStyle.cornerStyle ?? "square"}
                    onChange={(event) =>
                      updateQrStyle({ cornerStyle: event.target.value as QrCornerStyle })
                    }
                    className="control-input"
                  >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-center justify-between rounded-md border border-[#6f8f62]/70 bg-[#e8efd9] px-3 py-3 text-sm font-bold text-[#314628]">
                Phone scan-safe
                <input
                  type="checkbox"
                  checked={scanSafe}
                  onChange={(event) =>
                    updateQrStyle({
                      scanSafe: event.target.checked,
                      ...(event.target.checked
                        ? {
                            foreground: "#000000",
                            background: "#ffffff",
                            accent: "#000000",
                            dotStyle: "square",
                            cornerStyle: "square",
                            gradient: false,
                            logoText: "",
                          }
                        : {}),
                    })
                  }
                  className="h-4 w-4 accent-[#2f4e37]"
                />
              </label>

              <p className="mt-2 rounded-md border border-[#c7b078]/70 bg-[#fff6dc] px-3 py-2 text-xs font-semibold leading-5 text-[#6a542f]">
                Scan-safe locks the export to black ink, white paper, square modules, wider quiet
                zone, and no center logo. Turn it off only for decorative campaigns.
              </p>

              <label className="mt-4 flex items-center justify-between rounded-md border border-[#aa956b]/60 bg-[#f8eed5] px-3 py-3 text-sm font-bold text-[#4d3d29]">
                Gradient ink
                <input
                  type="checkbox"
                  checked={Boolean(qrStyle.gradient) && !scanSafe}
                  disabled={scanSafe}
                  onChange={(event) => updateQrStyle({ gradient: event.target.checked })}
                  className="h-4 w-4 accent-[#2f4e37] disabled:opacity-40"
                />
              </label>

              <div className="mt-4 grid gap-2">
                <label className="field-label">
                  <span className="mb-1 block">Center mark</span>
                  <input
                    value={scanSafe ? "" : qrStyle.logoText ?? ""}
                    disabled={scanSafe}
                    onChange={(event) => updateQrStyle({ logoText: event.target.value })}
                    maxLength={4}
                    placeholder="BF"
                    className="control-input disabled:opacity-40"
                  />
                </label>
                <label className="field-label">
                  <span className="mb-1 block">Logo image</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={scanSafe}
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                    className="w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-2 py-2 text-xs disabled:opacity-40"
                  />
                </label>
                <label className="field-label">
                  <span className="mb-1 block">Frame text</span>
                  <input
                    value={qrStyle.frameText ?? ""}
                    onChange={(event) => updateQrStyle({ frameText: event.target.value })}
                    maxLength={42}
                    placeholder="Scan to open Bioforge"
                    className="control-input"
                  />
                </label>
              </div>
            </section>
          </aside>

          <section className="studio-panel proof-panel flex min-h-[620px] flex-col p-3 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="stamp-label mb-3 inline-flex rotate-[-1deg]">Live proof</p>
                <h1 className="font-serif text-4xl font-semibold leading-tight text-[#302416] sm:text-5xl">
                  Scan-ready code, styled at the bench.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66563c]">
                  The preview is the center of the workflow: write content, tune the QR treatment,
                  then copy or export without hunting through extra panels.
                </p>
              </div>
              <div className="proof-key">
                <p>Proof status</p>
                <span className={hasOutput ? "bg-[#6f8f62]" : "bg-[#c8613f]"} />
                <strong>{hasOutput ? "Ready" : "Needs input"}</strong>
              </div>
            </div>

            <div className="preview-stage mt-5 grid flex-1 place-items-center rounded-md border border-[#b69c6d]/70 p-5 sm:p-8">
              {hasOutput ? (
                <div className="proof-card">
                  <div
                    className={`mx-auto w-full drop-shadow-sm ${
                      mode === "qr" ? "max-w-[360px]" : "max-w-[520px]"
                    }`}
                    dangerouslySetInnerHTML={{ __html: generated.svg }}
                  />
                </div>
              ) : (
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 h-24 w-24 rounded-md border border-dashed border-[#aa956d] bg-[#f5ecd6]" />
                  <p className="font-serif text-2xl font-semibold text-[#4f3f29]">
                    Waiting for valid content
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#796645]">{generated.error}</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Mode", currentType],
                ["Output", hasOutput ? "SVG and PNG ready" : "Not ready"],
                ["Scan mode", scanSafe ? "Phone-safe" : "Decorative"],
              ].map(([label, value]) => (
                <div key={label} className="status-tile">
                  <p>{label}</p>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <aside className="studio-panel flex flex-col gap-3 p-3 sm:p-4">
            <section className="tool-section">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <p>Ship asset</p>
                  <h2>Export console</h2>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={copySvg}
                  disabled={!hasOutput}
                  className="primary-action bg-[#2f4e37] hover:bg-[#3d6447]"
                >
                  Copy SVG
                </button>
                <button
                  type="button"
                  onClick={downloadSvg}
                  disabled={!hasOutput}
                  className="primary-action bg-[#263b4a] hover:bg-[#345267]"
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={!hasOutput}
                  className="primary-action bg-[#263b4a] hover:bg-[#345267]"
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={shareCode}
                  disabled={!hasOutput}
                  className="primary-action bg-[#b8543f] hover:bg-[#c8613f]"
                >
                  Share
                </button>
              </div>

              {notice ? (
                <p
                  className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${
                    notice.tone === "success"
                      ? "border-[#95a777] bg-[#e7efd6] text-[#39502f]"
                      : "border-[#c99385] bg-[#f4ddd3] text-[#7e3427]"
                  }`}
                >
                  {notice.text}
                </p>
              ) : null}
            </section>

            <section className="tool-section">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <p>Readiness</p>
                  <h2>Details</h2>
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-sm">
                <div className="detail-row">
                  <dt>Format</dt>
                  <dd>{currentType}</dd>
                </div>
                <div className="detail-row">
                  <dt>Content</dt>
                  <dd>{content.trim().length} chars</dd>
                </div>
                <div className="detail-row">
                  <dt>Scan state</dt>
                  <dd>{hasOutput ? "Ready to test" : "Input required"}</dd>
                </div>
                <div className="detail-row">
                  <dt>Filename</dt>
                  <dd>{filenameBase}</dd>
                </div>
              </dl>
            </section>

            <section className="command-card">
              <p className="font-serif text-lg font-semibold text-[#3a2b19]">Studio notes</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#654f31]">
                <li>QR styles apply live and carry into SVG and PNG exports.</li>
                <li>Scan-safe mode exports black-on-white QR and barcode assets for phones.</li>
                <li>Use PNG for sharing and SVG for production handoff.</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
