export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { Deck } from '@/types/vocab';

const REDIS_KEY = 'studyhatch:public-decks';
const MEMORY_STORE_KEY = '__studyhatchPublicDecks';

const hasRedisUrl = Boolean(process.env.REDIS_URL);

const redisClient = (() => {
  if (!hasRedisUrl) return null;
  const url = process.env.REDIS_URL as string;
  const useTls = url.startsWith('rediss://');
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    lazyConnect: false,
    connectTimeout: 5000,
    commandTimeout: 5000,
    ...(useTls ? { tls: {} } : {}),
  });
})();

function getMemoryStore(): Deck[] {
  const g = globalThis as typeof globalThis & { [key: string]: Deck[] };
  if (!g[MEMORY_STORE_KEY]) {
    g[MEMORY_STORE_KEY] = [];
  }
  return g[MEMORY_STORE_KEY];
}

async function getFromRedis(): Promise<Deck[]> {
  if (!redisClient) return getMemoryStore();
  try {
    const raw = await redisClient.get(REDIS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Deck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return getMemoryStore();
  }
}

async function saveToRedis(decks: Deck[]): Promise<void> {
  const mem = getMemoryStore();
  if (redisClient) {
    try {
      await redisClient.set(REDIS_KEY, JSON.stringify(decks));
      mem.length = 0;
      mem.push(...decks);
      return;
    } catch {
      // fallback to memory
    }
  }
  mem.length = 0;
  mem.push(...decks);
}

/** GET: list all public decks (same list on every device when using Redis) */
export async function GET() {
  try {
    const decks = await getFromRedis();
    return NextResponse.json(decks);
  } catch (e) {
    console.error('Public decks GET error:', e);
    return NextResponse.json([], { status: 200 });
  }
}

/** POST: add or update a public deck (body: full Deck JSON) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const deck = body as Deck;
    if (!deck?.id || !deck?.name || !Array.isArray(deck?.cards)) {
      return NextResponse.json(
        { error: 'Invalid deck: need id, name, and cards array' },
        { status: 400 }
      );
    }
    const publicDeck: Deck = {
      ...deck,
      visibility: 'public',
    };
    const decks = await getFromRedis();
    const filtered = decks.filter((d) => d.id !== deck.id);
    filtered.push(publicDeck);
    await saveToRedis(filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Public decks POST error:', e);
    return NextResponse.json({ error: 'Failed to publish deck' }, { status: 500 });
  }
}

/** DELETE: remove a deck from public library (query: deckId=...) */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');
    if (!deckId) {
      return NextResponse.json({ error: 'Missing deckId' }, { status: 400 });
    }
    const decks = await getFromRedis();
    const filtered = decks.filter((d) => d.id !== deckId);
    await saveToRedis(filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Public decks DELETE error:', e);
    return NextResponse.json({ error: 'Failed to remove deck' }, { status: 500 });
  }
}
