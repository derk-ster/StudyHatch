import { Deck } from '@/types/vocab';
import { saveDeck } from './storage';

const SHARE_HASH_PREFIX = 'share=';

/**
 * Encode a deck for use in a share URL (hash fragment).
 * Recipients see a preview and must click "Copy to my decks" to save — no auto-save on open.
 */
export function encodeDeckForShare(deck: Deck): string {
  const payload: Omit<Deck, 'id'> & { id?: string } = {
    name: deck.name,
    description: deck.description,
    cards: deck.cards,
    createdDate: deck.createdDate,
    targetLanguage: deck.targetLanguage || 'es',
    visibility: 'private',
  };
  const json = JSON.stringify(payload);
  return typeof btoa !== 'undefined' ? btoa(encodeURIComponent(json)) : '';
}

const PREVIEW_DECK_ID = 'shared-preview';

/**
 * Decode a share payload from the URL without saving. Returns a deck suitable for preview.
 * Use when showing "Copy to my decks" so the user can choose whether to save.
 */
export function decodeSharePayload(encoded: string): Deck | null {
  if (typeof window === 'undefined' || !encoded) return null;
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json) as Partial<Deck> & { cards: Deck['cards']; name: string };
    if (!parsed.name || !Array.isArray(parsed.cards)) return null;
    return {
      id: PREVIEW_DECK_ID,
      name: parsed.name,
      description: parsed.description,
      cards: parsed.cards,
      createdDate: parsed.createdDate ?? Date.now(),
      targetLanguage: parsed.targetLanguage ?? 'es',
      visibility: 'private',
      source: 'shared',
    };
  } catch {
    return null;
  }
}

/**
 * Decode a share payload, save the deck with a new id, and return the new deck id.
 * Only call this from a user click handler (e.g. "Copy to my decks"). Never call from useEffect or on load.
 */
export function decodeAndSaveSharedDeck(encoded: string): string | null {
  if (typeof window === 'undefined' || !encoded) return null;
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json) as Partial<Deck> & { cards: Deck['cards']; name: string };
    if (!parsed.name || !Array.isArray(parsed.cards)) return null;
    const newId = `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deck: Deck = {
      id: newId,
      name: parsed.name,
      description: parsed.description,
      cards: parsed.cards,
      createdDate: parsed.createdDate ?? Date.now(),
      targetLanguage: parsed.targetLanguage ?? 'es',
      visibility: 'private',
      source: 'shared', // View-only: from teacher/Share Decks link; students can practice but not edit.
    };
    saveDeck(deck);
    return newId;
  } catch {
    return null;
  }
}

/** Stable id for a share payload so we can track "already copied" per link (one copy per student). */
export function getSharePayloadStableId(payload: string): string {
  if (!payload) return '';
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  }
  return `share-${Math.abs(h).toString(36)}`;
}

/**
 * Get the share payload from the current URL hash if present (e.g. #share=BASE64).
 */
export function getSharePayloadFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash?.slice(1) || '';
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  return hash.slice(SHARE_HASH_PREFIX.length).trim() || null;
}

/**
 * Build the full URL for sharing a deck (long form, payload in hash). Kept for backward compatibility.
 */
export function buildShareDeckUrl(deck: Deck): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const encoded = encodeDeckForShare(deck);
  return `${origin}/study#${SHARE_HASH_PREFIX}${encoded}`;
}

const SHARE_API = '/api/share';

/**
 * Create a short share link (e.g. /study?share=3-2-tecnologia-a1b2c3) by storing the payload on the server.
 * Returns the full short URL. Use this when copying "Copy share link" so links are readable.
 */
export async function getShortShareUrl(deck: Deck): Promise<string> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH || '') : '';
  const encoded = encodeDeckForShare(deck);
  const res = await fetch(`${origin}${basePath}${SHARE_API}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: encoded }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to create share link');
  }
  const data = (await res.json()) as { id: string };
  return `${origin}${basePath}/study?share=${encodeURIComponent(data.id)}`;
}

/**
 * Check if the current URL uses a short share id (?share=...) rather than hash payload (#share=...).
 */
export function getShortShareIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('share');
  return id && id.length > 0 && id.length < 200 ? id : null;
}
