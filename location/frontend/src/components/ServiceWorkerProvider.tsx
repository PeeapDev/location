'use client';

/**
 * Service Worker Provider
 *
 * Registers the service worker and provides offline context
 */

import { useEffect, createContext, useContext, ReactNode } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { syncService } from '@/lib/syncService';

interface OfflineContextType {
  isOnline: boolean;
  isOfflineReady: boolean;
  updateAvailable: boolean;
  update: () => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isOfflineReady: false,
  updateAvailable: false,
  update: () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const sw = useServiceWorker();

  // Start auto-sync when provider mounts
  useEffect(() => {
    syncService.startAutoSync();

    return () => {
      syncService.stopAutoSync();
    };
  }, []);

  const value: OfflineContextType = {
    isOnline: sw.isOnline,
    isOfflineReady: sw.isRegistered,
    updateAvailable: sw.updateAvailable,
    update: sw.update,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      {/* Offline indicator */}
      {!sw.isOnline && (
        <div className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-amber-500 text-white rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
          <span className="font-medium">You're offline - Using local data</span>
        </div>
      )}
      {/* Update available banner */}
      {sw.updateAvailable && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-indigo-600 text-white rounded-lg shadow-lg flex items-center gap-3">
          <span>A new version is available</span>
          <button
            onClick={sw.update}
            className="px-3 py-1 bg-white text-indigo-600 rounded font-medium hover:bg-indigo-50"
          >
            Update Now
          </button>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export default ServiceWorkerProvider;
