'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * When isVisible becomes true, smoothly scrolls the popup element into view
 * so it's on screen. Use the returned ref on the popup container (e.g. modal
 * panel or toast div). Applies to all popups site-wide.
 */
export function useScrollPopupIntoView<T extends HTMLElement = HTMLDivElement>(
  isVisible: boolean
): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!isVisible) return;
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isVisible]);
  return ref as RefObject<T>;
}
