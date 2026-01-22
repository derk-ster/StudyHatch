'use client';

import type { GameSocketMessage } from '@/types/games';

type GameSocketOptions = {
  onMessage: (message: GameSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
};

const getWebSocketUrls = () => {
  if (typeof window === 'undefined') return [];
  const urls = new Set<string>();
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) urls.add(envUrl);

  const origin = window.location.origin;
  if (origin.startsWith('http')) {
    urls.add(origin.replace(/^http/, 'ws'));
  }

  const { hostname, protocol, port } = window.location;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '3001') {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    urls.add(`${wsProtocol}//${hostname}:3001`);
  }

  return Array.from(urls);
};

export const createGameSocket = (options: GameSocketOptions) => {
  const urls = getWebSocketUrls();
  let socket: WebSocket | null = null;
  let currentIndex = 0;
  let shouldReconnect = true;

  const connect = () => {
    if (!shouldReconnect) return;
    if (currentIndex >= urls.length) {
      options.onError?.(new Event('error'));
      return;
    }
    const url = urls[currentIndex];
    socket = new WebSocket(url);
    let opened = false;

    socket.addEventListener('open', () => {
      opened = true;
      options.onOpen?.();
    });

    socket.addEventListener('close', () => {
      if (!opened && shouldReconnect) {
        currentIndex += 1;
        connect();
        return;
      }
      options.onClose?.();
    });

    socket.addEventListener('error', (event) => {
      if (!opened && shouldReconnect) {
        currentIndex += 1;
        connect();
        return;
      }
      options.onError?.(event);
    });

    socket.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as GameSocketMessage;
        options.onMessage(parsed);
      } catch (error) {
        // ignore malformed messages
      }
    });
  };

  connect();

  const send = (type: string, payload?: Record<string, unknown>) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  const close = () => {
    shouldReconnect = false;
    socket?.close();
  };

  return { socket, send, close };
};
