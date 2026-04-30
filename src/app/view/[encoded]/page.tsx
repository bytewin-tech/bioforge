import { notFound } from 'next/navigation';

interface Link {
  label: string;
  url: string;
  icon: string;
}

interface BioData {
  title: string;
  description: string;
  image: string;
  links: Link[];
}

function decodeBioData(encoded: string): BioData | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString());
  } catch {
    return null;
  }
}

export default async function ViewPage({
  params,
}: {
  params: Promise<{ encoded: string }>;
}) {
  const { encoded } = await params;
  const bio = decodeBioData(encoded);

  if (!bio) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <div className="max-w-md mx-auto pt-16 px-6 text-center">
        {/* Profile image */}
        {bio.image && (
          <div className="mb-6">
            <img
              src={bio.image}
              alt={bio.title}
              className="w-28 h-28 rounded-full mx-auto object-cover ring-4 ring-purple-500/50 shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Title & description */}
        <h1 className="text-3xl font-bold mb-2">{bio.title}</h1>
        {bio.description && (
          <p className="text-purple-200 text-sm mb-8 leading-relaxed">{bio.description}</p>
        )}

        {/* Links */}
        <div className="space-y-3">
          {bio.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-4 text-left transition-all duration-200 hover:scale-105"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
              <span className="ml-auto text-purple-300">→</span>
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-purple-400 text-xs">
          Made with 💜 by Bioforge
        </p>
      </div>
    </div>
  );
}