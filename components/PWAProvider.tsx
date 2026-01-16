'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentSession } from '@/lib/auth';
import { syncToAccount } from '@/lib/storage-sync';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PWAContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => void;
};

const PWAContext = createContext<PWAContextValue | undefined>(undefined);

const INSTALL_TOAST_KEY = 'studyhatch-install-toast-dismissed';

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showBrowserInstallHelp, setShowBrowserInstallHelp] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const media = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => setIsInstalled(isStandaloneMode());
    media.addEventListener('change', handleDisplayModeChange);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setShowInstallToast(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      media.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
      setCanInstall(true);

      const dismissed = localStorage.getItem(INSTALL_TOAST_KEY) === 'true';
      if (!dismissed) {
        setShowInstallToast(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const iosEligible = isIosDevice() && !isStandaloneMode();
    if (iosEligible) {
      setCanInstall(true);
      const dismissed = localStorage.getItem(INSTALL_TOAST_KEY) === 'true';
      if (!dismissed) {
        setShowInstallToast(true);
      }
    }
  }, []);

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!('serviceWorker' in navigator)) return;

    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      return;
    }

    let refreshing = false;
    let updateInterval: number | null = null;
    let visibilityHandler: (() => void) | null = null;
    let focusHandler: (() => void) | null = null;
    let controllerHandler: (() => void) | null = null;

    const swPath = `${basePath}/sw.js`;
    navigator.serviceWorker.register(swPath).then((reg) => {
      setRegistration(reg);
      reg.update();

      if (reg.waiting) {
        setUpdateAvailable(true);
        if (isStandaloneMode()) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            if (isStandaloneMode() && reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        });
      });

      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          reg.update();
        }
      };

      focusHandler = () => {
        reg.update();
      };

      updateInterval = window.setInterval(() => {
        reg.update();
      }, 30 * 60 * 1000);

      window.addEventListener('visibilitychange', visibilityHandler);
      window.addEventListener('focus', focusHandler);
    }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });

    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
    }).catch(() => undefined);

    controllerHandler = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', controllerHandler);

    return () => {
      if (visibilityHandler) {
        window.removeEventListener('visibilitychange', visibilityHandler);
      }
      if (focusHandler) {
        window.removeEventListener('focus', focusHandler);
      }
      if (controllerHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerHandler);
      }
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      const session = getCurrentSession();
      if (session && !session.isGuest) {
        syncToAccount(session.userId);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (isStandaloneMode()) return;

    if (isIosDevice()) {
      setShowIosHelp(true);
      setShowInstallToast(false);
      return;
    }

    if (!deferredPrompt) {
      setShowBrowserInstallHelp(true);
      setShowInstallToast(false);
      return;
    }

    setShowInstallToast(false);
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(() => {
      setDeferredPrompt(null);
      setCanInstall(false);
    });
  }, [deferredPrompt]);

  const dismissInstallToast = () => {
    localStorage.setItem(INSTALL_TOAST_KEY, 'true');
    setShowInstallToast(false);
  };

  const applyUpdate = () => {
    if (!registration?.waiting) return;
    setUpdateAvailable(false);
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  useEffect(() => {
    if (!updateAvailable) return;
    if (isStandaloneMode()) {
      applyUpdate();
    }
  }, [updateAvailable, registration]);

  const contextValue = useMemo(() => ({
    canInstall: canInstall && !isInstalled,
    isInstalled,
    promptInstall,
  }), [canInstall, isInstalled, promptInstall]);

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {showInstallToast && !isInstalled && (
        <div className="fixed bottom-6 right-6 z-[99999] max-w-sm rounded-xl bg-gray-900/95 border border-white/10 p-4 shadow-xl animate-slide-up">
          <div className="text-sm text-white/90 font-semibold mb-1">Install StudyHatch</div>
          <div className="text-xs text-white/70 mb-3">
            Add StudyHatch to your home screen for offline access and faster launches.
          </div>
          <div className="flex gap-2">
            <button
              onClick={promptInstall}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold"
            >
              Install App
            </button>
            <button
              onClick={dismissInstallToast}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {showIosHelp && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-gray-900 border border-white/10 p-6 animate-slide-up">
            <div className="text-lg font-semibold mb-2">Install StudyHatch on iOS</div>
            <div className="text-sm text-white/70 mb-4">
              Tap the Share button in Safari, then choose "Add to Home Screen."
            </div>
            <button
              onClick={() => setShowIosHelp(false)}
              className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showBrowserInstallHelp && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-gray-900 border border-white/10 p-6 animate-slide-up">
            <div className="text-lg font-semibold mb-2">Install StudyHatch</div>
            <div className="text-sm text-white/70 mb-4">
              If the install prompt doesn&apos;t appear, use your browser menu to install the app.
              In Chrome or Edge, click the install icon in the address bar or open the menu and select "Install StudyHatch."
            </div>
            <button
              onClick={() => setShowBrowserInstallHelp(false)}
              className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-gray-900 border border-white/10 p-6 animate-slide-up">
            <div className="text-lg font-semibold mb-2">Update available</div>
            <div className="text-sm text-white/70 mb-4">
              A new StudyHatch update is available. Tap to refresh.
            </div>
            <button
              onClick={applyUpdate}
              className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}

      {isOffline && (
        <div className="fixed bottom-6 left-6 z-[99999] rounded-full bg-black/70 px-4 py-2 text-xs text-white/80 border border-white/10">
          Offline mode: changes sync when you reconnect.
        </div>
      )}
    </PWAContext.Provider>
  );
}
