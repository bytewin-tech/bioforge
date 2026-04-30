'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    const encoded = encodeURIComponent(url);
    router.push(`/generate?url=${encoded}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">✨</div>
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
          Bioforge
        </h1>
        <p className="text-purple-200 text-lg max-w-md mx-auto leading-relaxed">
          Paste any URL. Get a stunning AI-generated link-in-bio page. No signup needed.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="relative">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://twitter.com/username"
            className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 rounded-2xl px-5 py-4 pr-36 text-lg focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl px-5 py-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Forging...' : 'Generate ✨'}
          </button>
        </div>
      </form>

      {/* Example */}
      <p className="mt-4 text-purple-400 text-sm">
        Try: a Twitter/X profile, personal website, or any public page
      </p>

      {/* Features */}
      <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg">
        {[
          { icon: '⚡', label: 'Instant' },
          { icon: '🤖', label: 'AI-powered' },
          { icon: '🔗', label: 'Shareable' },
        ].map((f) => (
          <div key={f.label} className="text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-purple-200 text-sm">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}