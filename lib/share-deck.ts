import { Deck } from '@/types/vocab';
import { saveDeck } from './storage';

const SHARE_HASH_PREFIX = 'share=';

/**
 * Encode a deck for use in a share URL (hash fragment).
 * Decoded deck will be saved with a new id when opened by the recipient.
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
 * Call this when the user clicks "Copy to my decks".
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
 * Build the full URL for sharing a deck (for pasting into Google Slides, etc.).
 */
export function buildShareDeckUrl(deck: Deck): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const encoded = encodeDeckForShare(deck);
  return `${origin}/study#${SHARE_HASH_PREFIX}${encoded}`;
}
