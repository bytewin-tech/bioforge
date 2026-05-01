"use client";

import { useMemo, useState } from "react";
import { barcodeSvg, normalizeBarcodeValue, qrSvg } from "@/lib/codes";

type CodeMode = "qr" | "barcode";
type Notice = { tone: "success" | "error"; text: string } | null;

const starterValues = [
  "https://bioforge.app/launch",
  "BF-2026-OVERNIGHT",
  "hello@bioforge.app",
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

  const normalizedBarcode = useMemo(() => normalizeBarcodeValue(content), [content]);
  const generated = useMemo(() => {
    const trimmed = content.trim();

    if (!trimmed) {
      return { svg: "", error: "Enter a URL, message, or SKU to start." };
    }

    try {
      if (mode === "qr") {
        return { svg: qrSvg(trimmed), error: "" };
      }

      const barcode = normalizeBarcodeValue(trimmed);
      if (!barcode) {
        return { svg: "", error: "Barcode supports A-Z, 0-9, spaces, and - . / $ + %." };
      }

      return { svg: barcodeSvg(barcode), error: "" };
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : "Could not generate this code.",
      };
    }
  }, [content, mode]);

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

  const hasOutput = Boolean(generated.svg && !generated.error);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07110f] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(31,214,153,0.28),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(88,166,255,0.22),transparent_30%),linear-gradient(145deg,#07110f_0%,#10141f_48%,#050608_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-2xl shadow-emerald-500/15 backdrop-blur">
              <span className="h-4 w-4 rounded-[4px] bg-emerald-300 shadow-[10px_0_0_#93c5fd,0_10px_0_#ffffff]" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                Bioforge
              </p>
              <p className="text-xs text-white/45">QR and barcode studio</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 backdrop-blur sm:block">
            No signup. No long encoded URLs.
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-100">
              Live preview and export-ready assets
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Forge codes people actually want to scan.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
              Turn any URL, launch note, contact detail, or SKU into a crisp QR code or
              printable Code 39 barcode. Everything renders in your browser.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 text-sm text-white/70">
              {["Instant preview", "SVG + PNG", "Web Share"].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 backdrop-blur"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
              <section className="rounded-[1.5rem] border border-white/10 bg-[#0d1515]/80 p-4 sm:p-5">
                <div className="mb-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/24 p-1">
                  {(["qr", "barcode"] as CodeMode[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setMode(item);
                        setNotice(null);
                      }}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        mode === item
                          ? "bg-white text-slate-950 shadow-lg shadow-emerald-500/10"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {item === "qr" ? "QR code" : "Barcode"}
                    </button>
                  ))}
                </div>

                <label htmlFor="code-content" className="text-sm font-medium text-white/80">
                  Content
                </label>
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
                  className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/60 focus:bg-white/[0.09]"
                />

                {mode === "barcode" && content !== normalizedBarcode ? (
                  <p className="mt-2 text-xs text-amber-100/80">
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
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/62 transition hover:border-white/25 hover:text-white"
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
                    className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copy content
                  </button>
                  <button
                    type="button"
                    onClick={shareCode}
                    disabled={!hasOutput}
                    className="rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Share
                  </button>
                </div>
              </section>

              <section className="flex min-h-[430px] flex-col rounded-[1.5rem] border border-white/10 bg-[#f8fbf8] p-4 text-slate-950 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Preview</p>
                    <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                      {mode === "qr" ? "QR code" : "Code 39"}
                    </h2>
                  </div>
                  <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    {mode.toUpperCase()}
                  </div>
                </div>

                <div className="grid flex-1 place-items-center rounded-3xl border border-slate-200 bg-white p-5 shadow-inner">
                  {hasOutput ? (
                    <div
                      className={`w-full ${mode === "qr" ? "max-w-[280px]" : "max-w-[360px]"}`}
                      dangerouslySetInnerHTML={{ __html: generated.svg }}
                    />
                  ) : (
                    <div className="max-w-xs text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-dashed border-slate-300 bg-slate-50" />
                      <p className="text-sm font-medium text-slate-500">{generated.error}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={copySvg}
                    disabled={!hasOutput}
                    className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copy SVG
                  </button>
                  <button
                    type="button"
                    onClick={downloadSvg}
                    disabled={!hasOutput}
                    className="rounded-xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={downloadPng}
                    disabled={!hasOutput}
                    className="rounded-xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    PNG
                  </button>
                </div>

                {notice ? (
                  <p
                    className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
                      notice.tone === "success"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    {notice.text}
                  </p>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
