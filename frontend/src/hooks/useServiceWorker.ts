/**
 * Service Worker Registration Hook
 *
 * Registers the service worker for offline support
 */

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    registration: null,
    updateAvailable: false,
  });

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    // Register SW
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[App] Service Worker registered:', registration.scope);

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });
      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    };

    registerSW();

    // Online/offline listeners
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update service worker
  const update = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [state.registration]);

  // Cache zone data
  const cacheZones = useCallback(
    (url: string) => {
      if (state.registration?.active) {
        state.registration.active.postMessage({ type: 'CACHE_ZONES', url });
      }
    },
    [state.registration]
  );

  // Clear cache
  const clearCache = useCallback(() => {
    if (state.registration?.active) {
      state.registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }, [state.registration]);

  return {
    ...state,
    update,
    cacheZones,
    clearCache,
  };
}

export default useServiceWorker;
