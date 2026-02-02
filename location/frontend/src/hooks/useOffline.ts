/**
 * React hooks for offline-first data management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initOfflineStore,
  isOnline,
  onNetworkChange,
  fetchGeodata,
  getCachedRegions,
  getCachedDistrictsByRegion,
  getCachedZonesByDistrict,
  cacheRegions,
  cacheDistricts,
  cacheZones,
  addToSyncQueue,
  cacheZone,
  removeCachedZone,
  getSyncQueueCount,
  preloadGeodata,
  getStorageEstimate,
  CachedRegion,
  CachedDistrict,
  CachedZone,
} from '@/lib/offline-store';
import {
  initSyncService,
  subscribeSyncState,
  syncPendingItems,
  refreshAllData,
} from '@/lib/sync-service';
import { geographyApi } from '@/lib/api';

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());
    return onNetworkChange(setOnline);
  }, []);

  return online;
}

/**
 * Hook for sync state
 */
export function useSyncState() {
  const [syncState, setSyncState] = useState({
    status: 'idle' as 'idle' | 'syncing' | 'error',
    pendingCount: 0,
    lastSyncAt: null as number | null,
    error: null as string | null,
  });

  useEffect(() => {
    return subscribeSyncState(setSyncState);
  }, []);

  return {
    ...syncState,
    sync: syncPendingItems,
    refresh: refreshAllData,
  };
}

/**
 * Hook for initializing offline support
 */
export function useOfflineInit() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      try {
        await initOfflineStore();
        cleanup = initSyncService();
        setInitialized(true);
      } catch (err: any) {
        console.error('Failed to initialize offline support:', err);
        setError(err.message);
      }
    }

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return { initialized, error };
}

/**
 * Hook for loading geodata with offline support
 */
export function useGeodata(id: string, url: string) {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const online = useNetworkStatus();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchGeodata(id, url);
        if (!cancelled) {
          setData(result);
          if (!result && !online) {
            setError('No cached data available offline');
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, url, online]);

  return { data, loading, error };
}

/**
 * Hook for regions with offline support
 */
export function useRegions() {
  const [regions, setRegions] = useState<CachedRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const online = useNetworkStatus();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (online) {
        // Try to fetch from API
        const response = await geographyApi.listRegions({ page_size: 100 });
        await cacheRegions(response.items);
        setRegions(response.items);
      } else {
        // Use cached data
        const cached = await getCachedRegions();
        setRegions(cached);
        if (cached.length === 0) {
          setError('No cached regions available offline');
        }
      }
    } catch (err: any) {
      // Fallback to cache on error
      const cached = await getCachedRegions();
      setRegions(cached);
      if (cached.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [online]);

  useEffect(() => {
    load();
  }, [load]);

  return { regions, loading, error, reload: load };
}

/**
 * Hook for districts with offline support
 */
export function useDistricts(regionId: number | null) {
  const [districts, setDistricts] = useState<CachedDistrict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useNetworkStatus();

  const load = useCallback(async () => {
    if (!regionId) {
      setDistricts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (online) {
        const response = await geographyApi.listDistricts({ region_id: regionId, page_size: 100 });
        await cacheDistricts(response.items);
        setDistricts(response.items);
      } else {
        const cached = await getCachedDistrictsByRegion(regionId);
        setDistricts(cached);
        if (cached.length === 0) {
          setError('No cached districts available offline');
        }
      }
    } catch (err: any) {
      const cached = await getCachedDistrictsByRegion(regionId);
      setDistricts(cached);
      if (cached.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [regionId, online]);

  useEffect(() => {
    load();
  }, [load]);

  return { districts, loading, error, reload: load };
}

/**
 * Hook for zones with offline support
 */
export function useZones(districtId: number | null) {
  const [zones, setZones] = useState<CachedZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useNetworkStatus();

  const load = useCallback(async () => {
    if (!districtId) {
      setZones([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (online) {
        const response = await geographyApi.listZones({ district_id: districtId, page_size: 100 });
        await cacheZones(response.items);
        setZones(response.items);
      } else {
        const cached = await getCachedZonesByDistrict(districtId);
        setZones(cached);
        if (cached.length === 0) {
          setError('No cached zones available offline');
        }
      }
    } catch (err: any) {
      const cached = await getCachedZonesByDistrict(districtId);
      setZones(cached);
      if (cached.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [districtId, online]);

  useEffect(() => {
    load();
  }, [load]);

  // Create zone with offline support
  const createZone = useCallback(
    async (data: any) => {
      if (online) {
        const newZone = await geographyApi.createZone(data);
        await cacheZone(newZone);
        await load();
        return newZone;
      } else {
        // Queue for sync
        await addToSyncQueue('create', 'zones', data);
        // Optimistically add to local cache with temporary ID
        const tempZone: CachedZone = {
          ...data,
          id: Date.now(), // Temporary ID
          is_active: true,
          is_locked: false,
          address_count: 0,
          zone_number: 'XX',
          primary_code: 'PENDING',
        };
        await cacheZone(tempZone);
        setZones((prev) => [...prev, tempZone]);
        return tempZone;
      }
    },
    [online, load]
  );

  // Delete zone with offline support
  const deleteZone = useCallback(
    async (zoneId: number) => {
      if (online) {
        await geographyApi.deleteZone(zoneId);
        await removeCachedZone(zoneId);
        setZones((prev) => prev.filter((z) => z.id !== zoneId));
      } else {
        await addToSyncQueue('delete', 'zones', { id: zoneId });
        await removeCachedZone(zoneId);
        setZones((prev) => prev.filter((z) => z.id !== zoneId));
      }
    },
    [online]
  );

  return { zones, loading, error, reload: load, createZone, deleteZone };
}

/**
 * Hook for preloading offline data
 */
export function usePreloadOfflineData() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const preload = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      // Preload geodata
      setProgress({ current: 0, total: 5 });
      const geodataResult = await preloadGeodata();
      setProgress({ current: 1, total: 5 });

      if (!geodataResult.success) {
        console.warn('Some geodata failed to load:', geodataResult.failed);
      }

      // Preload regions
      const regionsResponse = await geographyApi.listRegions({ page_size: 100 });
      await cacheRegions(regionsResponse.items);
      setProgress({ current: 2, total: 5 });

      // Preload districts
      const districtsResponse = await geographyApi.listDistricts({ page_size: 100 });
      await cacheDistricts(districtsResponse.items);
      setProgress({ current: 3, total: 5 });

      // Preload zones
      const zonesResponse = await geographyApi.listZones({ page_size: 500 });
      await cacheZones(zonesResponse.items);
      setProgress({ current: 4, total: 5 });

      setProgress({ current: 5, total: 5 });
      setStatus('success');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  return { preload, status, progress, error };
}

/**
 * Hook for storage info
 */
export function useStorageInfo() {
  const [info, setInfo] = useState<{
    usage: number;
    quota: number;
    usagePercent: number;
    pendingSync: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const estimate = await getStorageEstimate();
    const pendingSync = await getSyncQueueCount();

    if (estimate) {
      setInfo({
        ...estimate,
        pendingSync,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { info, refresh };
}
