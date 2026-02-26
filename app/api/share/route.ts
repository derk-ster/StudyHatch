import { NextRequest, NextResponse } from 'next/server';
import { getSharePayload, setSharePayload, hasShareId } from '@/lib/share-store';

/** Slugify deck name for short readable id: lowercase, no accents, alphanumeric and dashes. Max 30 chars to keep links short. */
function slugify(name: string): string {
  const normalized = (name ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, 30) || 'deck';
}

function randomId(length: number): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/** POST: store payload, return short id. Body: { payload: string } (base64). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = typeof body.payload === 'string' ? body.payload.trim() : null;
    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    let deckName = 'deck';
    try {
      const json = decodeURIComponent(Buffer.from(payload, 'base64').toString('utf-8'));
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.name === 'string') deckName = parsed.name;
    } catch {
      // keep default
    }

    const baseSlug = slugify(deckName);
    let shortId = `${baseSlug}-${randomId(6)}`;
    let attempts = 0;
    while ((await hasShareId(shortId)) && attempts < 10) {
      shortId = `${baseSlug}-${randomId(6)}`;
      attempts++;
    }
    await setSharePayload(shortId, payload);
    return NextResponse.json({ id: shortId });
  } catch (e) {
    console.error('Share POST error:', e);
    const message = (e as Error).message || 'Failed to create share link';
    return NextResponse.json(
      { error: message.includes('REDIS_URL') ? message : 'Failed to create share link' },
      { status: 500 }
    );
  }
}
