# Bioforge ✨

**AI-powered link-in-bio generator.** Paste any URL → get a stunning shareable page.

## Live

🔗 **https://outstanding-grace-production-c4f7.up.railway.app**

## How It Works

1. Enter any URL (Twitter/X profile, personal site, etc.)
2. Bioforge fetches the page metadata (title, description, image)
3. AI generates a beautiful link-in-bio page
4. Share the generated link — no signup, no database

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS** (gradient dark theme)
- **Cheerio + Axios** (web scraping)
- **Gemini 2.0 Flash** or **Groq Llama 3.1** (AI generation)
- **Railway** (deployment)

## Key Files

- `src/app/page.tsx` — Home page with URL input
- `src/app/generate/page.tsx` — Generates bio from URL
- `src/app/view/[encoded]/page.tsx` — Renders the link-in-bio page
- `src/lib/generate.ts` — Core logic (fetch + AI + extract)

## Environment Variables

```
GEMINI_API_KEY=...   # Google Gemini (free tier available)
# or
GROQ_API_KEY=...    # Groq (Llama 3.1 70B)
```

## Local Dev

```bash
npm install
npm run dev
```

## No Backend

All state is encoded in the URL using base64url. No database, no auth, no server-side storage.