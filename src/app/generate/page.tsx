import { generateBioLink } from '@/lib/generate';
import { redirect } from 'next/navigation';

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  if (!url) {
    redirect('/');
  }

  const bioData = await generateBioLink(url);

  // Encode result and redirect to view page
  const encoded = Buffer.from(JSON.stringify(bioData)).toString('base64url');
  redirect(`/view/${encoded}`);
}