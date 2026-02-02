/**
 * Offline-first data store
 * Handles caching and syncing of geodata and API data
 */

import {
  initDB,
  get,
  put,
  putMany,
  getAll,
  getAllByIndex,
  remove,
  clear,
  STORES,
} from './db';

// Types for cached data
interface CachedGeodata {
  id: string;
  data: GeoJSON.FeatureCollection;
  cachedAt: number;
}

interface SyncQueueItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  error?: string;
}

interface Metadata {
  key: string;
  value: any;
}

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  GEODATA: 7 * 24 * 60 * 60 * 1000, // 7 days
  REGIONS: 24 * 60 * 60 * 1000, // 24 hours
  DISTRICTS: 24 * 60 * 60 * 1000, // 24 hours
  ZONES: 1 * 60 * 60 * 1000, // 1 hour (more frequently updated)
};

/**
 * Initialize offline store
 */
export async function initOfflineStore(): Promise<void> {
  await initDB();
  console.log('Offline store initialized');
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// =============================================================================
// Geodata (GADM boundaries)
// =============================================================================

/**
 * Get cached geodata
 */
export async function getCachedGeodata(id: string): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const cached = await get<CachedGeodata>(STORES.GEODATA, id);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.cachedAt > CACHE_EXPIRY.GEODATA) {
      console.log(`Geodata ${id} cache expired`);
      return null;
    }

    console.log(`Geodata ${id} loaded from cache`);
    return cached.data;
  } catch (error) {
    console.error('Error getting cached geodata:', error);
    return null;
  }
}

/**
 * Cache geodata
 */
export async function cacheGeodata(id: string, data: GeoJSON.FeatureCollection): Promise<void> {
  try {
    await put<CachedGeodata>(STORES.GEODATA, {
      id,
      data,
      cachedAt: Date.now(),
    });
    console.log(`Geodata ${id} cached successfully`);
  } catch (error) {
    console.error('Error caching geodata:', error);
  }
}

/**
 * Fetch geodata with offline-first approach
 */
export async function fetchGeodata(
  id: string,
  url: string
): Promise<GeoJSON.FeatureCollection | null> {
  // Try cache first
  const cached = await getCachedGeodata(id);

  if (!isOnline()) {
    if (cached) {
      console.log(`Offline: Using cached ${id}`);
      return cached;
    }
    console.warn(`Offline: No cached data for ${id}`);
    return null;
  }

  // If online, try to fetch fresh data
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    await cacheGeodata(id, data);
    return data;
  } catch (error) {
    console.warn(`Failed to fetch ${id}, using cache:`, error);
    return cached;
  }
}

// =============================================================================
// Regions
// =============================================================================

export interface CachedRegion {
  id: number;
  code: string;
  name: string;
  short_code: string;
  description?: string;
  is_active: boolean;
  is_locked: boolean;
  district_count: number;
  created_at: string;
  updated_at?: string;
  cachedAt?: number;
}

/**
 * Get all cached regions
 */
export async function getCachedRegions(): Promise<CachedRegion[]> {
  try {
    return await getAll<CachedRegion>(STORES.REGIONS);
  } catch (error) {
    console.error('Error getting cached regions:', error);
    return [];
  }
}

/**
 * Cache regions
 */
export async function cacheRegions(regions: CachedRegion[]): Promise<void> {
  try {
    const timestamp = Date.now();
    const withTimestamp = regions.map((r) => ({ ...r, cachedAt: timestamp }));
    await clear(STORES.REGIONS);
    await putMany(STORES.REGIONS, withTimestamp);
    await setMetadata('regions_last_sync', timestamp);
    console.log(`Cached ${regions.length} regions`);
  } catch (error) {
    console.error('Error caching regions:', error);
  }
}

/**
 * Check if regions cache is valid
 */
export async function isRegionsCacheValid(): Promise<boolean> {
  const lastSync = await getMetadata('regions_last_sync');
  if (!lastSync) return false;
  return Date.now() - lastSync < CACHE_EXPIRY.REGIONS;
}

// =============================================================================
// Districts
// =============================================================================

export interface CachedDistrict {
  id: number;
  region_id: number;
  code: string;
  full_code: string;
  name: string;
  short_code: string;
  capital?: string;
  description?: string;
  population?: number;
  area_sq_km?: number;
  is_active: boolean;
  is_locked: boolean;
  zone_count: number;
  region_name?: string;
  region_code?: string;
  cachedAt?: number;
}

/**
 * Get all cached districts
 */
export async function getCachedDistricts(): Promise<CachedDistrict[]> {
  try {
    return await getAll<CachedDistrict>(STORES.DISTRICTS);
  } catch (error) {
    console.error('Error getting cached districts:', error);
    return [];
  }
}

/**
 * Get cached districts by region
 */
export async function getCachedDistrictsByRegion(regionId: number): Promise<CachedDistrict[]> {
  try {
    return await getAllByIndex<CachedDistrict>(STORES.DISTRICTS, 'region_id', regionId);
  } catch (error) {
    console.error('Error getting cached districts by region:', error);
    return [];
  }
}

/**
 * Cache districts
 */
export async function cacheDistricts(districts: CachedDistrict[]): Promise<void> {
  try {
    const timestamp = Date.now();
    const withTimestamp = districts.map((d) => ({ ...d, cachedAt: timestamp }));
    await clear(STORES.DISTRICTS);
    await putMany(STORES.DISTRICTS, withTimestamp);
    await setMetadata('districts_last_sync', timestamp);
    console.log(`Cached ${districts.length} districts`);
  } catch (error) {
    console.error('Error caching districts:', error);
  }
}

// =============================================================================
// Zones
// =============================================================================

export interface CachedZone {
  id: number;
  district_id: number;
  zone_number: string;
  primary_code: string;
  name?: string;
  description?: string;
  zone_type: string;
  ward?: string;
  center_lat?: string;
  center_lng?: string;
  is_active: boolean;
  is_locked: boolean;
  address_count: number;
  district_name?: string;
  district_code?: string;
  region_name?: string;
  region_code?: string;
  geometry?: GeoJSON.Geometry | null;
  cachedAt?: number;
}

/**
 * Get all cached zones
 */
export async function getCachedZones(): Promise<CachedZone[]> {
  try {
    return await getAll<CachedZone>(STORES.ZONES);
  } catch (error) {
    console.error('Error getting cached zones:', error);
    return [];
  }
}

/**
 * Get cached zones by district
 */
export async function getCachedZonesByDistrict(districtId: number): Promise<CachedZone[]> {
  try {
    return await getAllByIndex<CachedZone>(STORES.ZONES, 'district_id', districtId);
  } catch (error) {
    console.error('Error getting cached zones by district:', error);
    return [];
  }
}

/**
 * Cache zones
 */
export async function cacheZones(zones: CachedZone[]): Promise<void> {
  try {
    const timestamp = Date.now();
    const withTimestamp = zones.map((z) => ({ ...z, cachedAt: timestamp }));
    await putMany(STORES.ZONES, withTimestamp);
    await setMetadata('zones_last_sync', timestamp);
    console.log(`Cached ${zones.length} zones`);
  } catch (error) {
    console.error('Error caching zones:', error);
  }
}

/**
 * Cache a single zone (after create/update)
 */
export async function cacheZone(zone: CachedZone): Promise<void> {
  try {
    await put(STORES.ZONES, { ...zone, cachedAt: Date.now() });
  } catch (error) {
    console.error('Error caching zone:', error);
  }
}

/**
 * Remove a zone from cache
 */
export async function removeCachedZone(zoneId: number): Promise<void> {
  try {
    await remove(STORES.ZONES, zoneId);
  } catch (error) {
    console.error('Error removing cached zone:', error);
  }
}

// =============================================================================
// Sync Queue (for offline mutations)
// =============================================================================

/**
 * Add an action to the sync queue
 */
export async function addToSyncQueue(
  action: 'create' | 'update' | 'delete',
  store: string,
  data: any
): Promise<void> {
  try {
    const item: SyncQueueItem = {
      action,
      store,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };
    await put(STORES.SYNC_QUEUE, item);
    console.log(`Added ${action} to sync queue for ${store}`);
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
}

/**
 * Get pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  try {
    const all = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return all.filter((item) => item.status === 'pending' || item.status === 'failed');
  } catch (error) {
    console.error('Error getting pending sync items:', error);
    return [];
  }
}

/**
 * Update sync item status
 */
export async function updateSyncItemStatus(
  id: number,
  status: 'pending' | 'syncing' | 'failed',
  error?: string
): Promise<void> {
  try {
    const item = await get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = status;
      if (error) item.error = error;
      if (status === 'failed') item.retryCount++;
      await put(STORES.SYNC_QUEUE, item);
    }
  } catch (error) {
    console.error('Error updating sync item status:', error);
  }
}

/**
 * Remove synced item from queue
 */
export async function removeSyncItem(id: number): Promise<void> {
  try {
    await remove(STORES.SYNC_QUEUE, id);
  } catch (error) {
    console.error('Error removing sync item:', error);
  }
}

/**
 * Get sync queue count
 */
export async function getSyncQueueCount(): Promise<number> {
  try {
    const items = await getPendingSyncItems();
    return items.length;
  } catch (error) {
    return 0;
  }
}

// =============================================================================
// Metadata
// =============================================================================

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: any): Promise<void> {
  try {
    await put<Metadata>(STORES.METADATA, { key, value });
  } catch (error) {
    console.error('Error setting metadata:', error);
  }
}

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<any> {
  try {
    const item = await get<Metadata>(STORES.METADATA, key);
    return item?.value;
  } catch (error) {
    console.error('Error getting metadata:', error);
    return null;
  }
}

// =============================================================================
// Bulk data operations
// =============================================================================

/**
 * Preload all geodata for offline use
 */
export async function preloadGeodata(): Promise<{
  success: boolean;
  cached: string[];
  failed: string[];
}> {
  const geodataFiles = [
    { id: 'gadm_country', url: '/geodata/gadm41_SLE_0.json' },
    { id: 'gadm_provinces', url: '/geodata/gadm41_SLE_1.json' },
    { id: 'gadm_districts', url: '/geodata/gadm41_SLE_2.json' },
    { id: 'gadm_chiefdoms', url: '/geodata/gadm41_SLE_3.json' },
  ];

  const cached: string[] = [];
  const failed: string[] = [];

  for (const { id, url } of geodataFiles) {
    const result = await fetchGeodata(id, url);
    if (result) {
      cached.push(id);
    } else {
      failed.push(id);
    }
  }

  return {
    success: failed.length === 0,
    cached,
    failed,
  };
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usagePercent: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    };
  }
  return null;
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  await clear(STORES.GEODATA);
  await clear(STORES.REGIONS);
  await clear(STORES.DISTRICTS);
  await clear(STORES.ZONES);
  await clear(STORES.METADATA);
  console.log('All cache cleared');
}
