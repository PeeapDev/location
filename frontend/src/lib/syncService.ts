/**
 * Sync Service - Handles online/offline sync with server
 *
 * Features:
 * - Detects online/offline status
 * - Syncs data in background
 * - Progressive loading with chunks
 * - Retry with exponential backoff
 */

import { offlineDb, Zone, Ward } from './offlineDb';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Sync configuration
const SYNC_CONFIG = {
  ZONES_PER_CHUNK: 2000,
  RETRY_DELAYS: [1000, 2000, 5000, 10000, 30000], // Exponential backoff
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  STALE_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours
};

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'complete';

export interface SyncProgress {
  status: SyncStatus;
  progress: number; // 0-100
  message: string;
  zonesLoaded: number;
  wardsLoaded: number;
  totalZones: number;
  totalWards: number;
  error?: string;
}

type SyncListener = (progress: SyncProgress) => void;

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private currentProgress: SyncProgress = {
    status: 'idle',
    progress: 0,
    message: 'Ready',
    zonesLoaded: 0,
    wardsLoaded: 0,
    totalZones: 0,
    totalWards: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners({ ...this.currentProgress, status: 'idle', message: 'Back online' });
        this.syncIfNeeded();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners({ ...this.currentProgress, status: 'offline', message: 'Offline mode' });
      });
    }
  }

  /**
   * Subscribe to sync progress updates
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Send current status immediately
    listener(this.currentProgress);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(progress: SyncProgress): void {
    this.currentProgress = progress;
    this.listeners.forEach(listener => listener(progress));
  }

  /**
   * Check if online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Check if data is stale
   */
  async isDataStale(): Promise<boolean> {
    const lastSync = await offlineDb.getMetadata('last_sync');
    if (!lastSync) return true;

    const lastSyncTime = lastSync.value as number;
    return Date.now() - lastSyncTime > SYNC_CONFIG.STALE_THRESHOLD;
  }

  /**
   * Check if sync is needed and perform it
   */
  async syncIfNeeded(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    const stats = await offlineDb.getStats();
    const isStale = await this.isDataStale();

    // Sync if no data or data is stale
    if (stats.zones === 0 || isStale) {
      await this.performFullSync();
    }
  }

  /**
   * Perform full data sync
   */
  async performFullSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    let retryCount = 0;

    try {
      this.notifyListeners({
        status: 'syncing',
        progress: 0,
        message: 'Starting sync...',
        zonesLoaded: 0,
        wardsLoaded: 0,
        totalZones: 0,
        totalWards: 0,
      });

      // Step 1: Sync wards first (smaller dataset)
      await this.syncWards();

      // Step 2: Sync zones in chunks
      await this.syncZonesInChunks();

      // Mark sync complete
      await offlineDb.setMetadata('last_sync', Date.now());
      await offlineDb.setMetadata('sync_version', '1.0');

      const stats = await offlineDb.getStats();
      this.notifyListeners({
        status: 'complete',
        progress: 100,
        message: `Sync complete! ${stats.zones} zones, ${stats.wards} wards`,
        zonesLoaded: stats.zones,
        wardsLoaded: stats.wards,
        totalZones: stats.zones,
        totalWards: stats.wards,
      });

    } catch (error) {
      console.error('Sync error:', error);

      // Retry with exponential backoff
      if (retryCount < SYNC_CONFIG.RETRY_DELAYS.length) {
        const delay = SYNC_CONFIG.RETRY_DELAYS[retryCount];
        retryCount++;

        this.notifyListeners({
          status: 'error',
          progress: this.currentProgress.progress,
          message: `Sync failed. Retrying in ${delay / 1000}s...`,
          zonesLoaded: this.currentProgress.zonesLoaded,
          wardsLoaded: this.currentProgress.wardsLoaded,
          totalZones: this.currentProgress.totalZones,
          totalWards: this.currentProgress.totalWards,
          error: (error as Error).message,
        });

        setTimeout(() => this.performFullSync(), delay);
      } else {
        this.notifyListeners({
          status: 'error',
          progress: this.currentProgress.progress,
          message: 'Sync failed. Working offline.',
          zonesLoaded: this.currentProgress.zonesLoaded,
          wardsLoaded: this.currentProgress.wardsLoaded,
          totalZones: this.currentProgress.totalZones,
          totalWards: this.currentProgress.totalWards,
          error: (error as Error).message,
        });
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync wards
   */
  private async syncWards(): Promise<void> {
    this.notifyListeners({
      ...this.currentProgress,
      message: 'Loading wards...',
      progress: 5,
    });

    const response = await fetch(`${API_BASE}/api/v1/zones/districts`);
    if (!response.ok) throw new Error('Failed to fetch wards');

    const districts = await response.json();

    // Transform districts to wards format
    const wards: Ward[] = districts.map((d: any) => ({
      ward_id: `W-${d.district_code}`,
      ward_name: d.district_name,
      ward_code: `${d.district_code}`,
      district_code: d.district_code,
      district_name: d.district_name,
      region_code: 0,
      region_name: d.region_name,
      center_lat: null,
      center_lng: null,
      geohash: null,
      zone_count: d.zone_count,
      address_count: d.address_count,
    }));

    await offlineDb.storeWards(wards);

    this.notifyListeners({
      ...this.currentProgress,
      wardsLoaded: wards.length,
      totalWards: wards.length,
      message: `Loaded ${wards.length} districts`,
      progress: 10,
    });
  }

  /**
   * Sync zones in chunks
   */
  private async syncZonesInChunks(): Promise<void> {
    // Get total count first
    const countResponse = await fetch(`${API_BASE}/api/v1/zones?page_size=1`);
    if (!countResponse.ok) throw new Error('Failed to fetch zone count');

    const countData = await countResponse.json();
    const totalZones = countData.total_count;

    this.notifyListeners({
      ...this.currentProgress,
      totalZones,
      message: `Loading ${totalZones} zones...`,
      progress: 15,
    });

    // Load in chunks
    let offset = 0;
    let zonesLoaded = 0;

    while (offset < totalZones) {
      const response = await fetch(
        `${API_BASE}/api/v1/zones?page_size=${SYNC_CONFIG.ZONES_PER_CHUNK}&offset=${offset}`
      );

      if (!response.ok) throw new Error(`Failed to fetch zones at offset ${offset}`);

      const data = await response.json();
      const zones: Zone[] = data.zones.map((z: any) => ({
        zone_code: z.zone_code,
        primary_code: z.primary_code,
        zone_name: z.zone_name || '',
        district_name: z.district_name,
        region_name: z.region_name,
        segment_type: z.segment_type || 'mixed',
        plus_code: z.plus_code,
        geohash: z.geohash,
        center_lat: z.center_lat,
        center_lng: z.center_lng,
        ward_id: z.ward_id,
        address_count: z.address_count || 0,
        search_text: z.search_text,
        alternate_names: z.alternate_names,
        landmarks: z.landmarks,
      }));

      await offlineDb.storeZones(zones);

      zonesLoaded += zones.length;
      offset += SYNC_CONFIG.ZONES_PER_CHUNK;

      const progress = 15 + (zonesLoaded / totalZones) * 85;

      this.notifyListeners({
        ...this.currentProgress,
        zonesLoaded,
        totalZones,
        message: `Loading zones... ${zonesLoaded}/${totalZones}`,
        progress: Math.round(progress),
      });

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Start background sync interval
   */
  startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncIfNeeded();
    }, SYNC_CONFIG.SYNC_INTERVAL);

    // Initial sync check
    this.syncIfNeeded();
  }

  /**
   * Stop background sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Force a full resync
   */
  async forceResync(): Promise<void> {
    await offlineDb.clearAll();
    await this.performFullSync();
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncProgress {
    return this.currentProgress;
  }
}

// Singleton instance
export const syncService = new SyncService();

export default syncService;
