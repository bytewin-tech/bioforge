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

const starterValues = [
  "https://bioforge.app/launch",
  "BF-2026-OVERNIGHT",
  "hello@bioforge.app",
];

type QrPreset = {
  name: string;
  description: string;
  style: QrStyleOptions;
};

type QrColorKey = "foreground" | "background" | "accent";

const qrPresets: QrPreset[] = [
  {
    name: "Ledger",
    description: "Paper, sage, rounded",
    style: {
      foreground: "#203f34",
      background: "#fff7df",
      accent: "#d46b45",
      dotStyle: "rounded",
      cornerStyle: "rounded",
      gradient: true,
      frameText: "Scan to open Bioforge",
    },
  },
  {
    name: "Field",
    description: "Crisp green stamp",
    style: {
      foreground: "#23391f",
      background: "#f6efd9",
      accent: "#6f8f62",
      dotStyle: "square",
      cornerStyle: "rounded",
      gradient: false,
      frameText: "Bioforge launch",
    },
  },
  {
    name: "Coastal",
    description: "Blue export proof",
    style: {
      foreground: "#263b4a",
      background: "#f8fbf8",
      accent: "#4e85a1",
      dotStyle: "dots",
      cornerStyle: "rounded",
      gradient: true,
      frameText: "Scan me",
    },
  },
];

const qrColorControls: { label: string; key: QrColorKey; fallback: string }[] = [
  { label: "Foreground", key: "foreground", fallback: "#101828" },
  { label: "Paper", key: "background", fallback: "#ffffff" },
  { label: "Accent", key: "accent", fallback: "#d46b45" },
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
        svg: barcodeSvg(barcode, qrStyle.foreground, qrStyle.background),
        error: "",
      };
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : "Could not generate this code.",
      };
    }
  }, [content, logoImage, mode, qrStyle]);

  const filenameBase = `bioforge-${mode}`;

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

  const hasOutput = Boolean(generated.svg && !generated.error);
  const currentType = mode === "qr" ? "QR matrix" : "Code 39";

  return (
    <main className="min-h-screen bg-[#d8c6a4] text-[#2f261a]">
      <div className="desk-surface pointer-events-none fixed inset-0" />
      <div className="desk-grid pointer-events-none fixed inset-0 opacity-[0.18]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1540px] flex-col p-2 sm:p-3 xl:p-4">
        <header className="paper-panel paper-panel-strong mb-3 flex h-auto min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#b95039] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#d8ae57] shadow-inner" />
              <span className="h-3 w-3 rounded-full bg-[#6f8f62] shadow-inner" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-lg font-semibold tracking-wide text-[#34281b]">
                Bioforge
              </p>
              <p className="hidden text-xs uppercase tracking-[0.22em] text-[#725f43] sm:block">
                Code workbench
              </p>
            </div>
          </div>
          <div className="order-3 grid w-full grid-cols-2 gap-1 rounded-md border border-[#9f8a62]/45 bg-[#f7eed8]/70 p-1 text-xs font-semibold text-[#57452d] shadow-sm sm:order-none sm:w-auto sm:flex sm:items-center">
            {(["qr", "barcode"] as CodeMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setNotice(null);
                }}
                className={`rounded px-3 py-2 transition sm:min-w-20 ${
                  mode === item
                    ? "bg-[#3e5f44] text-[#fff8df] shadow"
                    : "hover:bg-[#eadfc4]"
                }`}
              >
                {item === "qr" ? "QR" : "Barcode"}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {["SVG", "PNG", "Share"].map((label) => (
              <span
                key={label}
                className="rounded-md border border-[#a99163]/50 bg-[#fff8e6]/75 px-3 py-2 text-xs font-semibold text-[#5e4b31]"
              >
                {label}
              </span>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)_300px]">
          <aside className="paper-panel hidden min-h-0 flex-col justify-between p-4 lg:flex">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b5b3f]">
                  Workspaces
                </p>
                <span className="text-lg text-[#816d4a]">+</span>
              </div>
              {["Generator", "Preview", "Exports", "History", "Settings"].map((item, index) => (
                <div
                  key={item}
                  className={`mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    index === 0
                      ? "bg-[#d8e0c8] font-semibold text-[#27391f]"
                      : "text-[#5d4d36]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#6f8f62]" />
                  {item}
                </div>
              ))}
              <div className="mt-8 border-t border-[#b59f73]/45 pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#6b5b3f]">
                  Current Stack
                </p>
                <div className="rounded-md border border-[#a99163]/55 bg-[#f5ebd1]/80 p-3">
                  <p className="font-serif text-base font-semibold">Bioforge Codes</p>
                  <p className="mt-1 text-xs leading-5 text-[#766346]">
                    Browser-rendered QR codes and printable Code 39 assets.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["qr", "barcode", "svg", "png"].map((tag) => (
                <span key={tag} className="rounded bg-[#d2c098] px-2 py-1 text-[#59482e]">
                  {tag}
                </span>
              ))}
            </div>
          </aside>

          <div className="grid min-h-0 gap-3 xl:grid-rows-[1fr_auto]">
            <section className="paper-panel paper-panel-strong relative overflow-hidden p-3 sm:p-5">
              <div className="pointer-events-none absolute left-4 top-0 h-3 w-28 rounded-b-md bg-[#b95039]/45 shadow-sm sm:left-7 sm:w-36" />
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 pt-3">
                <div className="max-w-2xl">
                  <p className="stamp mb-3 inline-block rotate-[-2deg]">Field Test</p>
                  <h1 className="font-serif text-3xl font-semibold leading-tight tracking-wide text-[#332719] sm:text-4xl">
                    Bioforge Code Desk
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#67563b]">
                    Compose scan-ready QR codes or barcode labels with a live proof,
                    copy actions, and production exports in one workspace.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#665338] sm:hidden">
                    {["Compose", "Preview", "Export"].map((step) => (
                      <span key={step} className="rounded border border-[#b49c6c]/55 bg-[#f4ead0] px-2 py-2">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="legend-card hidden sm:block">
                  <p className="mb-2 font-serif text-sm font-semibold">Key</p>
                  {[
                    ["#6f8f62", "ready"],
                    ["#b95039", "notice"],
                    ["#4e85a1", "export"],
                  ].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(320px,1fr)]">
                <section className="desk-card relative p-4 sm:p-5">
                  <div className="binder-tab absolute -top-7 left-3 hidden px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#695337] xl:block">
                    01 Compose
                  </div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#806d4d]">
                        Input
                      </p>
                      <h2 className="font-serif text-xl font-semibold text-[#34281b]">
                        Content source
                      </h2>
                    </div>
                    <span className="rounded-full bg-[#dbe3ca] px-3 py-1 text-xs font-semibold text-[#385132]">
                      {currentType}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 rounded-md border border-[#b39d70]/60 bg-[#e6d9bc]/70 p-1">
                    {(["qr", "barcode"] as CodeMode[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMode(item);
                          setNotice(null);
                        }}
                        className={`rounded px-4 py-3 text-sm font-semibold transition ${
                          mode === item
                            ? "bg-[#2f4e37] text-[#fff8df] shadow"
                            : "text-[#5f4f37] hover:bg-[#f5edda]"
                        }`}
                      >
                        {item === "qr" ? "QR code" : "Barcode"}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="code-content" className="text-sm font-semibold text-[#4e3e29]">
                      Content
                    </label>
                    <span className="text-xs font-medium text-[#806d4d]">
                      {content.trim().length} chars
                    </span>
                  </div>
                  <textarea
                    id="code-content"
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      setNotice(null);
                    }}
                    placeholder={
                      mode === "qr" ? "Paste a URL or message" : "Enter a SKU like BF-2026-001"
                    }
                    className="mt-2 min-h-36 w-full resize-none rounded-md border border-[#ad966b]/70 bg-[#fff9e8]/85 px-4 py-4 text-base leading-7 text-[#312619] shadow-inner outline-none transition placeholder:text-[#9b8b6b] focus:border-[#55754c] focus:bg-[#fffdf3] sm:min-h-44"
                  />

                  {mode === "barcode" && content !== normalizedBarcode ? (
                    <p className="mt-2 text-xs font-medium text-[#9a5b20]">
                      Barcode output will use: {normalizedBarcode || "supported characters only"}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {starterValues.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setContent(value);
                          setNotice(null);
                        }}
                        className="max-w-full rounded-md border border-[#b8a272]/60 bg-[#efe4c9] px-3 py-2 text-left text-xs font-medium text-[#5d4c33] transition hover:border-[#7c9366] hover:bg-[#e1ebd0]"
                      >
                        {value}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={copyContent}
                      disabled={!content.trim()}
                      className="rounded-md border border-[#9e8a63]/70 bg-[#f7eed7] px-4 py-3 text-sm font-semibold text-[#3d301f] shadow-sm transition hover:bg-[#fff8e6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Copy content
                    </button>
                    <button
                      type="button"
                      onClick={shareCode}
                      disabled={!hasOutput}
                      className="rounded-md bg-[#2f4e37] px-4 py-3 text-sm font-semibold text-[#fff8df] shadow-sm transition hover:bg-[#3f6548] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Share
                    </button>
                  </div>
                </section>

                <section className="desk-card relative flex min-h-[390px] flex-col p-4 sm:min-h-[460px] sm:p-5">
                  <div className="binder-tab absolute -top-7 left-3 hidden px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#695337] xl:block">
                    02 Proof
                  </div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#806d4d]">
                      Preview
                    </p>
                    <h2 className="font-serif text-2xl font-semibold tracking-wide text-[#34281b]">
                      {mode === "qr" ? "QR code" : "Code 39"}
                    </h2>
                  </div>
                  <div className="rounded-md border border-[#9b845d]/50 bg-[#ede0c1] px-3 py-1 text-xs font-semibold text-[#4e3e29]">
                    {mode.toUpperCase()}
                  </div>
                </div>

                <div className="preview-board grid flex-1 place-items-center rounded-md border border-[#b49b6c]/70 p-4 shadow-[inset_0_0_22px_rgba(88,67,38,0.12)] sm:p-5">
                  {hasOutput ? (
                    <div
                      className={`w-full drop-shadow-sm ${
                        mode === "qr" ? "max-w-[260px] sm:max-w-[300px]" : "max-w-[360px]"
                      }`}
                      dangerouslySetInnerHTML={{ __html: generated.svg }}
                    />
                  ) : (
                    <div className="max-w-xs text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-md border border-dashed border-[#aa956d] bg-[#f5ecd6]" />
                      <p className="text-sm font-medium text-[#7a6647]">{generated.error}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={copySvg}
                    disabled={!hasOutput}
                    className="rounded-md bg-[#e9ddbf] px-3 py-3 text-sm font-semibold text-[#3f3221] transition hover:bg-[#ded0ad] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copy SVG
                  </button>
                  <button
                    type="button"
                    onClick={downloadSvg}
                    disabled={!hasOutput}
                    className="rounded-md bg-[#263b4a] px-3 py-3 text-sm font-semibold text-[#fff8df] transition hover:bg-[#345267] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={downloadPng}
                    disabled={!hasOutput}
                    className="rounded-md bg-[#263b4a] px-3 py-3 text-sm font-semibold text-[#fff8df] transition hover:bg-[#345267] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    PNG
                  </button>
                </div>

                {notice ? (
                  <p
                    className={`mt-3 rounded-md border px-4 py-3 text-sm font-medium ${
                      notice.tone === "success"
                        ? "border-[#95a777] bg-[#e7efd6] text-[#39502f]"
                        : "border-[#c99385] bg-[#f4ddd3] text-[#7e3427]"
                    }`}
                  >
                    {notice.text}
                  </p>
                ) : null}
              </section>
            </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1fr_0.9fr]">
                <div className="note-card">
                  <p className="mb-2 font-serif text-base font-semibold">Output Notes</p>
                  <ul className="space-y-1 text-xs leading-5 text-[#6a593d]">
                    <li>Mode: {currentType}</li>
                    <li>Content length: {content.trim().length} chars</li>
                    <li>Status: {hasOutput ? "ready to export" : "waiting for valid input"}</li>
                  </ul>
                </div>
                <div className="map-card">
                  <div className="h-full min-h-28 rounded border border-[#c2ad7f]/70 bg-[#f6efd9] p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#806d4d]">
                      Workflow Map
                    </p>
                    <div className="grid grid-cols-3 items-center gap-2 text-center text-xs font-semibold text-[#59482e]">
                      {["Compose", "Preview", "Export"].map((step) => (
                        <div key={step} className="rounded bg-[#e2d4b5] px-2 py-3">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="note-card bg-[#d88354]/80 text-[#3c2515]">
                  <p className="mb-2 font-serif text-base font-semibold">Compatibility</p>
                  <p className="text-xs leading-5">
                    Barcode mode normalizes unsupported text into Code 39 friendly
                    characters before rendering.
                  </p>
                </div>
              </div>
            </section>

            <section className="paper-panel grid gap-3 p-3 sm:grid-cols-[1fr_1.1fr_0.8fr]">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6b5b3f]">
                  Tool Trace
                </p>
                {["Read content", "Generate asset", "Prepare exports"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between border-t border-[#b79f70]/45 py-2 text-xs">
                    <span>{item}</span>
                    <span className="text-[#527247]">{index < 2 || hasOutput ? "done" : "idle"}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6b5b3f]">
                  Export Surfaces
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {["SVG", "PNG", "Share", "Copy"].map((item) => (
                    <div key={item} className="min-h-16 rounded-md border border-[#aa956b]/60 bg-[#f4ead1] p-2 text-xs font-semibold text-[#59482e]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6b5b3f]">
                  Status
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                  <span>Code</span>
                  <span className="flex gap-1">
                    <i className="h-2.5 w-2.5 rounded-full bg-[#6f8f62]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#6f8f62]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#d7c69d]" />
                  </span>
                  <span>Export</span>
                  <span className="flex gap-1">
                    <i className="h-2.5 w-2.5 rounded-full bg-[#4e85a1]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#4e85a1]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[#d7c69d]" />
                  </span>
                </div>
              </div>
            </section>
        </div>

          <aside className="paper-panel grid gap-3 p-3 lg:block lg:p-4">
            <div className="mb-4 border-b border-[#b79f70]/50 pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b5b3f]">
                    Customize
                  </p>
                  <p className="mt-1 text-xs text-[#806d4d]">
                    {mode === "qr" ? "QR styling controls" : "Barcode colors follow QR palette"}
                  </p>
                </div>
                <span className="rounded bg-[#d8e0c8] px-2 py-1 text-xs font-bold text-[#385132]">
                  Live
                </span>
              </div>

              <div className="mb-4 grid gap-2">
                {qrPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-md border border-[#aa956b]/60 bg-[#f8eed5] p-3 text-left transition hover:border-[#55754c] hover:bg-[#e8efd9]"
                  >
                    <span className="block font-serif text-base font-semibold text-[#34281b]">
                      {preset.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#6a593d]">{preset.description}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {qrColorControls.map(({ label, key, fallback }) => (
                  <label key={key} className="text-xs font-semibold text-[#59482e]">
                    <span className="mb-1 block truncate">{label}</span>
                    <input
                      type="color"
                      value={qrStyle[key] ?? fallback}
                      onChange={(event) => updateQrStyle({ [key]: event.target.value })}
                      className="h-10 w-full rounded border border-[#a98f5f]/60 bg-[#f8eed5] p-1"
                      aria-label={`${label} color`}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-[#59482e]">
                  <span className="mb-1 block">Modules</span>
                  <select
                    value={qrStyle.dotStyle ?? "square"}
                    onChange={(event) =>
                      updateQrStyle({ dotStyle: event.target.value as QrDotStyle })
                    }
                    className="h-10 w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-2"
                  >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                    <option value="dots">Dots</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#59482e]">
                  <span className="mb-1 block">Corners</span>
                  <select
                    value={qrStyle.cornerStyle ?? "square"}
                    onChange={(event) =>
                      updateQrStyle({ cornerStyle: event.target.value as QrCornerStyle })
                    }
                    className="h-10 w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-2"
                  >
                    <option value="square">Square</option>
                    <option value="rounded">Rounded</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-center justify-between rounded-md border border-[#aa956b]/60 bg-[#f8eed5] px-3 py-2 text-sm font-semibold text-[#4d3d29]">
                Gradient
                <input
                  type="checkbox"
                  checked={Boolean(qrStyle.gradient)}
                  onChange={(event) => updateQrStyle({ gradient: event.target.checked })}
                  className="h-4 w-4 accent-[#2f4e37]"
                />
              </label>

              <div className="mt-4 grid gap-2">
                <label className="text-xs font-semibold text-[#59482e]">
                  <span className="mb-1 block">Center initials</span>
                  <input
                    value={qrStyle.logoText ?? ""}
                    onChange={(event) => updateQrStyle({ logoText: event.target.value })}
                    maxLength={4}
                    placeholder="BF"
                    className="h-10 w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-3 text-sm outline-none focus:border-[#55754c]"
                  />
                </label>
                <label className="text-xs font-semibold text-[#59482e]">
                  <span className="mb-1 block">Logo image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                    className="w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-2 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-[#59482e]">
                  <span className="mb-1 block">Frame text</span>
                  <input
                    value={qrStyle.frameText ?? ""}
                    onChange={(event) => updateQrStyle({ frameText: event.target.value })}
                    maxLength={42}
                    placeholder="Scan to open Bioforge"
                    className="h-10 w-full rounded-md border border-[#a98f5f]/60 bg-[#fff8e6] px-3 text-sm outline-none focus:border-[#55754c]"
                  />
                </label>
              </div>
            </div>

            <div className="mb-3 border-b border-[#b79f70]/50 pb-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b5b3f]">
                  Activity
                </p>
                <span className="text-[#806d4d]">+</span>
              </div>
              <p className="rounded-md bg-[#efe2c3] px-3 py-2 text-sm font-semibold text-[#4d3d29]">
                # bioforge
              </p>
            </div>
            {[
              ["You", `Selected ${currentType}.`],
              ["Forge", hasOutput ? "Preview is ready." : generated.error],
              ["Export", "SVG, PNG, copy, and share actions are available."],
            ].map(([name, text], index) => (
              <div key={`${name}-${index}`} className="mb-4 flex gap-3 text-sm">
                <span className={`mt-1 h-8 w-8 shrink-0 rounded-full border border-[#9c875f] ${
                  index === 0 ? "bg-[#d8ae57]" : index === 1 ? "bg-[#8da778]" : "bg-[#6e9ab0]"
                }`} />
                <div>
                  <p className="font-semibold text-[#35291b]">{name}</p>
                  <p className="mt-1 leading-5 text-[#6a593d]">{text}</p>
                </div>
              </div>
            ))}
            <div className="mt-5 rounded-md border border-[#a98f5f]/60 bg-[#f8e6b2] p-4">
              <p className="mb-3 font-serif text-base font-semibold">Quick Commands</p>
              {["/qr create matrix", "/barcode create label", "/export png", "/copy svg"].map(
                (command) => (
                  <p key={command} className="border-t border-[#d0b879] py-2 text-xs text-[#5b492f]">
                    {command}
                  </p>
                ),
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
