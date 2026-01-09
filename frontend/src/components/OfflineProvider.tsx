'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useOfflineInit, useNetworkStatus, useSyncState } from '@/hooks/useOffline';

interface OfflineContextType {
  initialized: boolean;
  online: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  pendingCount: number;
  sync: () => Promise<{ synced: number; failed: number }>;
  refresh: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function useOfflineContext() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within OfflineProvider');
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { initialized, error } = useOfflineInit();
  const online = useNetworkStatus();
  const { status, pendingCount, sync, refresh } = useSyncState();

  if (error) {
    console.error('Offline initialization error:', error);
  }

  const value: OfflineContextType = {
    initialized,
    online,
    syncStatus: status,
    pendingCount,
    sync,
    refresh,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}
