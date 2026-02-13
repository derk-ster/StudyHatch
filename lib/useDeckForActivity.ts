'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDeckById } from '@/lib/storage';
import { getSharePayloadFromHash, decodeSharePayload } from '@/lib/share-deck';
import type { Deck } from '@/types/vocab';

/**
 * Resolve deck for activity pages. When deckId is 'shared-preview', reads deck from
 * URL hash (#share=...) so shared-link users can do activities without copying first.
 * Progress for shared-preview is not persisted (session-only).
 */
export function useDeckForActivity(deckId: string | null): Deck | null {
  const [hashPayload, setHashPayload] = useState<string | null>(null);

  useEffect(() => {
    if (deckId === 'shared-preview' && typeof window !== 'undefined') {
      setHashPayload(getSharePayloadFromHash());
    } else {
      setHashPayload(null);
    }
  }, [deckId]);

  return useMemo((): Deck | null => {
    if (!deckId) return null;
    if (deckId === 'shared-preview') {
      if (!hashPayload) return null;
      try {
        const rawPayload = decodeURIComponent(hashPayload);
        return decodeSharePayload(rawPayload);
      } catch {
        return decodeSharePayload(hashPayload);
      }
    }
    return getDeckById(deckId) ?? null;
  }, [deckId, hashPayload]);
}

/** True when the deck is from a share link preview (don't persist progress). */
export function isPreviewDeck(deck: { id: string } | null): boolean {
  return deck?.id === 'shared-preview';
}
