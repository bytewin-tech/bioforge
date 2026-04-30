import { load } from 'cheerio';
import axios from 'axios';

interface BioLinkData {
  title: string;
  description: string;
  image: string;
  links: Array<{ label: string; url: string; icon: string }>;
}

export async function generateBioLink(url: string): Promise<BioLinkData> {
  // Fetch and parse the URL
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    timeout: 10000,
  });

  const html = response.data;
  const $ = load(html);

  // Extract metadata
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    url;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  const image =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';

  // Call AI to generate bio link structure
  const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  const isGemini = Boolean(process.env.GEMINI_API_KEY);

  let links: Array<{ label: string; url: string; icon: string }> = [];

  if (apiKey) {
    try {
      const prompt = `You are designing a link-in-bio page for: ${url}
Title: ${title}
Description: ${description}

Return a JSON array of 4-6 social/contact links appropriate for this person/brand. Each link should have: label (e.g. "Twitter", "GitHub"), url (use "#" as placeholder if unknown), and icon (emoji).

Return ONLY valid JSON array like:
[
  {"label": "Twitter", "url": "https://twitter.com/...", "icon": "🐦"},
  {"label": "GitHub", "url": "https://github.com/...", "icon": "💻"}
]

If no specific links can be inferred, suggest generic ones like Website, Blog, Contact. Return valid JSON only.`;

      if (isGemini) {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
          },
          { timeout: 15000 }
        );
        const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) links = JSON.parse(jsonMatch[0]);
      } else {
        const res = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 15000,
          }
        );
        const text = res.data.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) links = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('AI generation failed:', e);
    }
  }

  // Fallback links if AI fails or no API key
  if (links.length === 0) {
    links = [
      { label: 'Website', url: url, icon: '🌐' },
      { label: 'Contact', url: `mailto:`, icon: '📧' },
    ];
  }

  return { title, description, image, links };
}