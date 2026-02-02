/**
 * Sync service for handling offline mutations
 * Syncs pending changes when back online
 */

import { geographyApi } from './api';
import {
  getPendingSyncItems,
  updateSyncItemStatus,
  removeSyncItem,
  getSyncQueueCount,
  cacheZone,
  removeCachedZone,
  cacheRegions,
  cacheDistricts,
  cacheZones,
  isOnline,
  onNetworkChange,
} from './offline-store';

type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  error: string | null;
}

let syncState: SyncState = {
  status: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
};

const listeners: Set<(state: SyncState) => void> = new Set();

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(callback: (state: SyncState) => void): () => void {
  listeners.add(callback);
  callback(syncState);
  return () => listeners.delete(callback);
}

/**
 * Update sync state and notify listeners
 */
function updateState(updates: Partial<SyncState>): void {
  syncState = { ...syncState, ...updates };
  listeners.forEach((callback) => callback(syncState));
}

/**
 * Process a single sync item
 */
async function processSyncItem(item: any): Promise<boolean> {
  const { id, action, store, data } = item;

  try {
    await updateSyncItemStatus(id, 'syncing');

    switch (store) {
      case 'zones':
        if (action === 'create') {
          const newZone = await geographyApi.createZone(data);
          await cacheZone(newZone);
        } else if (action === 'update') {
          const updatedZone = await geographyApi.updateZone(data.id, data);
          await cacheZone(updatedZone);
        } else if (action === 'delete') {
          await geographyApi.deleteZone(data.id);
          await removeCachedZone(data.id);
        }
        break;

      case 'regions':
        if (action === 'create') {
          await geographyApi.createRegion(data);
        } else if (action === 'update') {
          await geographyApi.updateRegion(data.id, data);
        } else if (action === 'delete') {
          await geographyApi.deleteRegion(data.id);
        }
        break;

      case 'districts':
        if (action === 'create') {
          await geographyApi.createDistrict(data);
        } else if (action === 'update') {
          await geographyApi.updateDistrict(data.id, data);
        } else if (action === 'delete') {
          await geographyApi.deleteDistrict(data.id);
        }
        break;

      default:
        console.warn(`Unknown store type: ${store}`);
        return false;
    }

    await removeSyncItem(id);
    return true;
  } catch (error: any) {
    console.error(`Failed to sync item ${id}:`, error);
    await updateSyncItemStatus(id, 'failed', error.message);
    return false;
  }
}

/**
 * Sync all pending items
 */
export async function syncPendingItems(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    console.log('Offline - skipping sync');
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingSyncItems();
  if (pending.length === 0) {
    updateState({ status: 'idle', pendingCount: 0 });
    return { synced: 0, failed: 0 };
  }

  updateState({ status: 'syncing', pendingCount: pending.length });
  console.log(`Syncing ${pending.length} pending items...`);

  let synced = 0;
  let failed = 0;

  // Process items in order (FIFO)
  const sortedPending = pending.sort((a, b) => a.timestamp - b.timestamp);

  for (const item of sortedPending) {
    // Skip items that have failed too many times
    if (item.retryCount >= 3) {
      console.warn(`Skipping item ${item.id} - too many retries`);
      failed++;
      continue;
    }

    const success = await processSyncItem(item);
    if (success) {
      synced++;
    } else {
      failed++;
    }

    // Update pending count
    const remaining = await getSyncQueueCount();
    updateState({ pendingCount: remaining });
  }

  updateState({
    status: failed > 0 ? 'error' : 'idle',
    lastSyncAt: Date.now(),
    error: failed > 0 ? `${failed} items failed to sync` : null,
  });

  console.log(`Sync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Refresh all data from server
 */
export async function refreshAllData(): Promise<void> {
  if (!isOnline()) {
    console.log('Offline - cannot refresh data');
    return;
  }

  console.log('Refreshing all data from server...');

  try {
    // Fetch and cache regions
    const regionsResponse = await geographyApi.listRegions({ page_size: 100 });
    await cacheRegions(regionsResponse.items);

    // Fetch and cache districts
    const districtsResponse = await geographyApi.listDistricts({ page_size: 100 });
    await cacheDistricts(districtsResponse.items);

    // Fetch and cache zones
    const zonesResponse = await geographyApi.listZones({ page_size: 500 });
    await cacheZones(zonesResponse.items);

    console.log('All data refreshed successfully');
  } catch (error) {
    console.error('Error refreshing data:', error);
    throw error;
  }
}

/**
 * Initialize sync service
 * Sets up automatic sync when coming back online
 */
export function initSyncService(): () => void {
  console.log('Initializing sync service...');

  // Initial sync check
  getSyncQueueCount().then((count) => {
    updateState({ pendingCount: count });
    if (count > 0 && isOnline()) {
      syncPendingItems();
    }
  });

  // Listen for network changes
  const unsubscribe = onNetworkChange(async (online) => {
    console.log(`Network status: ${online ? 'online' : 'offline'}`);

    if (online) {
      // Sync pending items when back online
      await syncPendingItems();
    }
  });

  return unsubscribe;
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return syncState;
}
