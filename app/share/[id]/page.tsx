import { redirect } from 'next/navigation';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Short share links: /share/deck-name-abc123 redirects to /study?share=deck-name-abc123
 * so the study page can load the shared deck. Keeps share URLs short and readable.
 */
export default async function ShareRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    redirect(basePath ? `${basePath}/study` : '/study');
  }
  const cleanId = id.trim().replace(/\/.*$/, '');
  const search = new URLSearchParams({ share: cleanId });
  redirect(`${basePath || ''}/study?${search.toString()}`);
}
