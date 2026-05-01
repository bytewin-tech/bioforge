# Bioforge

Premium QR and barcode generator for URLs, text, contact details, and simple SKUs.

## What It Does

1. Enter arbitrary URL/text for a QR code, or SKU-style text for a Code 39 barcode.
2. See a live browser-rendered preview.
3. Copy the source content or SVG markup.
4. Download SVG/PNG assets, or use the Web Share API when supported.

Bioforge does not create persistent short links because this repo has no backend storage. Legacy encoded link-in-bio routes now redirect to the generator instead of producing long base64 URLs.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS
- Local QR encoder and Code 39 SVG renderer in `src/lib/codes.ts`

## Key Files

- `src/app/page.tsx` - mobile-first generator UI and browser actions
- `src/lib/codes.ts` - QR and barcode SVG generation
- `src/app/generate/page.tsx` - legacy redirect
- `src/app/view/[encoded]/page.tsx` - legacy redirect

## Local Dev

```bash
npm install
npm run dev
```
