/**
 * Optimized Sync Service - Fast Loading with Background Sync
 *
 * Strategy:
 * 1. Load districts first (instant - ~16 items)
 * 2. Load priority zones (Freetown/Waterloo - ~500 items)
 * 3. Search is usable immediately
 * 4. Background loads remaining zones
 */

import { offlineDb, Zone, Ward } from './offlineDb';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Optimized sync configuration
const SYNC_CONFIG = {
  PRIORITY_CHUNK: 500,        // First load - priority zones
  BACKGROUND_CHUNK: 1000,     // Background chunks
  SYNC_INTERVAL: 10 * 60 * 1000, // 10 minutes
  STALE_THRESHOLD: 12 * 60 * 60 * 1000, // 12 hours
};

// Priority districts to load first (most used areas)
const PRIORITY_DISTRICTS = [
  'Western Area Urban',
  'Western Area Rural',
  'Bo',
  'Kenema',
];

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'error' | 'offline' | 'complete';

export interface SyncProgress {
  status: SyncStatus;
  progress: number;
  message: string;
  zonesLoaded: number;
  wardsLoaded: number;
  totalZones: number;
  totalWards: number;
  isSearchReady: boolean;  // Can user start searching?
  error?: string;
}

type SyncListener = (progress: SyncProgress) => void;

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private currentProgress: SyncProgress = {
    status: 'idle',
    progress: 0,
    message: 'Ready',
    zonesLoaded: 0,
    wardsLoaded: 0,
    totalZones: 0,
    totalWards: 0,
    isSearchReady: false,
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
        this.notifyListeners({ ...this.currentProgress, status: 'offline', message: 'Offline' });
      });
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProgress);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(progress: SyncProgress): void {
    this.currentProgress = progress;
    this.listeners.forEach(listener => listener(progress));
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async isDataStale(): Promise<boolean> {
    const lastSync = await offlineDb.getMetadata('last_sync');
    if (!lastSync) return true;
    return Date.now() - (lastSync.value as number) > SYNC_CONFIG.STALE_THRESHOLD;
  }

  async syncIfNeeded(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    const stats = await offlineDb.getStats();

    // If we have data, mark as ready immediately
    if (stats.zones > 0) {
      this.notifyListeners({
        ...this.currentProgress,
        status: 'ready',
        isSearchReady: true,
        zonesLoaded: stats.zones,
        message: `${stats.zones.toLocaleString()} zones ready`,
      });
    }

    const isStale = await this.isDataStale();
    if (stats.zones === 0 || isStale) {
      await this.performFastSync();
    }
  }

  /**
   * Fast sync - prioritizes getting search working quickly
   */
  async performFastSync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.abortController = new AbortController();

    try {
      // PHASE 1: Districts (instant)
      this.notifyListeners({
        status: 'syncing',
        progress: 5,
        message: 'Loading districts...',
        zonesLoaded: 0,
        wardsLoaded: 0,
        totalZones: 0,
        totalWards: 0,
        isSearchReady: false,
      });

      await this.syncWards();

      // PHASE 2: Priority zones (Freetown, Waterloo - most searched)
      this.notifyListeners({
        ...this.currentProgress,
        progress: 15,
        message: 'Loading popular areas...',
      });

      await this.syncPriorityZones();

      // Mark search as ready after priority load
      const stats = await offlineDb.getStats();
      this.notifyListeners({
        ...this.currentProgress,
        status: 'ready',
        progress: 40,
        message: `Search ready! ${stats.zones} zones loaded`,
        zonesLoaded: stats.zones,
        isSearchReady: true,
      });

      // PHASE 3: Background load remaining zones
      await this.syncRemainingZonesBackground();

      // Complete
      await offlineDb.setMetadata('last_sync', Date.now());
      const finalStats = await offlineDb.getStats();

      this.notifyListeners({
        status: 'complete',
        progress: 100,
        message: `${finalStats.zones.toLocaleString()} zones synced`,
        zonesLoaded: finalStats.zones,
        wardsLoaded: finalStats.wards,
        totalZones: finalStats.zones,
        totalWards: finalStats.wards,
        isSearchReady: true,
      });

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Sync aborted');
        return;
      }

      console.error('Sync error:', error);

      // Even on error, if we have some data, mark as ready
      const stats = await offlineDb.getStats();
      this.notifyListeners({
        status: stats.zones > 0 ? 'ready' : 'error',
        progress: this.currentProgress.progress,
        message: stats.zones > 0
          ? `${stats.zones} zones available (sync incomplete)`
          : 'Sync failed',
        zonesLoaded: stats.zones,
        wardsLoaded: stats.wards,
        totalZones: this.currentProgress.totalZones,
        totalWards: this.currentProgress.totalWards,
        isSearchReady: stats.zones > 0,
        error: (error as Error).message,
      });
    } finally {
      this.isSyncing = false;
      this.abortController = null;
    }
  }

  private async syncWards(): Promise<void> {
    const response = await fetch(`${API_BASE}/api/v1/zones/districts`, {
      signal: this.abortController?.signal,
    });

    if (!response.ok) throw new Error('Failed to fetch districts');

    const districts = await response.json();
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
      progress: 10,
      message: `${wards.length} districts loaded`,
    });
  }

  /**
   * Load priority zones first (Freetown, Waterloo - most searched)
   */
  private async syncPriorityZones(): Promise<void> {
    for (const district of PRIORITY_DISTRICTS) {
      if (this.abortController?.signal.aborted) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/v1/zones?district=${encodeURIComponent(district)}&page_size=${SYNC_CONFIG.PRIORITY_CHUNK}`,
          { signal: this.abortController?.signal }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const zones = this.mapZones(data.zones);
        await offlineDb.storeZones(zones);

        const stats = await offlineDb.getStats();
        this.notifyListeners({
          ...this.currentProgress,
          zonesLoaded: stats.zones,
          message: `Loading ${district}...`,
          progress: 15 + (PRIORITY_DISTRICTS.indexOf(district) / PRIORITY_DISTRICTS.length) * 25,
        });

      } catch (e) {
        console.warn(`Failed to load ${district}:`, e);
      }
    }
  }

  /**
   * Background load remaining zones without blocking UI
   */
  private async syncRemainingZonesBackground(): Promise<void> {
    // Get total count
    const countResponse = await fetch(`${API_BASE}/api/v1/zones?page_size=1`, {
      signal: this.abortController?.signal,
    });

    if (!countResponse.ok) return;

    const { total_count: totalZones } = await countResponse.json();
    const currentStats = await offlineDb.getStats();

    // If we already have all zones, skip
    if (currentStats.zones >= totalZones) return;

    this.notifyListeners({
      ...this.currentProgress,
      totalZones,
      message: `Syncing ${currentStats.zones}/${totalZones}...`,
    });

    // Load remaining in smaller chunks
    let offset = 0;

    while (offset < totalZones) {
      if (this.abortController?.signal.aborted) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/v1/zones?page_size=${SYNC_CONFIG.BACKGROUND_CHUNK}&offset=${offset}`,
          { signal: this.abortController?.signal }
        );

        if (!response.ok) break;

        const data = await response.json();
        const zones = this.mapZones(data.zones);
        await offlineDb.storeZones(zones);

        offset += SYNC_CONFIG.BACKGROUND_CHUNK;

        const stats = await offlineDb.getStats();
        const progress = 40 + (stats.zones / totalZones) * 60;

        this.notifyListeners({
          ...this.currentProgress,
          zonesLoaded: stats.zones,
          totalZones,
          progress: Math.min(99, Math.round(progress)),
          message: `${stats.zones.toLocaleString()}/${totalZones.toLocaleString()} zones`,
        });

        // Yield to UI - small delay
        await new Promise(r => setTimeout(r, 50));

      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        console.warn('Background sync chunk failed:', e);
        break;
      }
    }
  }

  private mapZones(zonesData: any[]): Zone[] {
    return zonesData.map((z: any) => ({
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
  }

  startAutoSync(): void {
    if (this.syncInterval) return;

    // Check existing data immediately
    this.checkExistingData();

    this.syncInterval = setInterval(() => {
      this.syncIfNeeded();
    }, SYNC_CONFIG.SYNC_INTERVAL);
  }

  /**
   * Quick check for existing data - makes search ready instantly if data exists
   */
  private async checkExistingData(): Promise<void> {
    const stats = await offlineDb.getStats();

    if (stats.zones > 0) {
      // Data exists - search is ready immediately
      this.notifyListeners({
        status: 'ready',
        progress: 100,
        message: `${stats.zones.toLocaleString()} zones ready`,
        zonesLoaded: stats.zones,
        wardsLoaded: stats.wards,
        totalZones: stats.zones,
        totalWards: stats.wards,
        isSearchReady: true,
      });

      // Check if refresh needed in background
      const isStale = await this.isDataStale();
      if (isStale && this.isOnline) {
        // Refresh in background without blocking
        setTimeout(() => this.performFastSync(), 1000);
      }
    } else {
      // No data - start sync
      this.syncIfNeeded();
    }
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    // Abort any running sync
    this.abortController?.abort();
  }

  async forceResync(): Promise<void> {
    this.abortController?.abort();
    await offlineDb.clearAll();
    await this.performFastSync();
  }

  getStatus(): SyncProgress {
    return this.currentProgress;
  }
}

export const syncService = new SyncService();
export default syncService;
