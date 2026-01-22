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

const shouldUsePolling = () => {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_WS_URL) return false;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false;
  }
  return true;
};

export const createGameSocket = (options: GameSocketOptions) => {
  const usePollingOnly = shouldUsePolling();
  const urls = usePollingOnly ? [] : getWebSocketUrls();
  let socket: WebSocket | null = null;
  let currentIndex = 0;
  let shouldReconnect = true;
  let polling = false;
  let pollInterval: number | null = null;
  let activeCode: string | null = null;

  const startPolling = (code: string) => {
    if (!code || pollInterval) return;
    activeCode = code;
    pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/games?code=${encodeURIComponent(code)}`);
        if (!response.ok) return;
        const data = (await response.json()) as GameSocketMessage;
        options.onMessage(data);
      } catch (error) {
        // ignore polling errors
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollInterval) {
      window.clearInterval(pollInterval);
      pollInterval = null;
    }
    activeCode = null;
  };

  const sendPolling = async (type: string, payload?: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });
      const data = (await response.json()) as GameSocketMessage;
      options.onMessage(data);
      if (!response.ok) {
        return;
      }
      if (data.type === 'session_joined') {
        startPolling(data.payload.code);
      }
      if (data.type === 'session_state' && data.payload?.code) {
        startPolling(data.payload.code);
      }
    } catch (error) {
      options.onError?.(new Event('error'));
    }
  };

  const connect = () => {
    if (!shouldReconnect) return;
    if (currentIndex >= urls.length) {
      if (usePollingOnly) {
        polling = true;
        options.onOpen?.();
        return;
      }
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
    if (polling) {
      sendPolling(type, payload);
      return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  const close = () => {
    shouldReconnect = false;
    stopPolling();
    socket?.close();
  };

  return { socket, send, close };
};
