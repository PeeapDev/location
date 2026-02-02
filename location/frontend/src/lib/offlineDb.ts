/**
 * Offline Database Engine using IndexedDB
 *
 * Features:
 * - Stores zones, wards, addresses locally
 * - Syncs with server when online
 * - Provides offline-first search
 * - Background sync with service worker
 */

const DB_NAME = 'postal_directory';
const DB_VERSION = 2;

// Store names
const STORES = {
  ZONES: 'zones',
  WARDS: 'wards',
  ADDRESSES: 'addresses',
  METADATA: 'metadata',
  PENDING_SYNC: 'pending_sync',
};

// Types
export interface Zone {
  zone_code: string;
  primary_code: string;
  zone_name: string;
  district_name: string;
  region_name: string;
  segment_type: string;
  plus_code: string | null;
  geohash: string | null;
  center_lat: number | null;
  center_lng: number | null;
  ward_id: string | null;
  address_count: number;
  search_text: string | null;
  alternate_names: string[] | null;
  landmarks: string[] | null;
}

export interface Ward {
  ward_id: string;
  ward_name: string;
  ward_code: string;
  district_code: number;
  district_name: string;
  region_code: number;
  region_name: string;
  center_lat: number | null;
  center_lng: number | null;
  geohash: string | null;
  zone_count: number;
  address_count: number;
}

export interface SyncMetadata {
  key: string;
  value: string | number | boolean;
  updated_at: number;
}

export interface PendingSync {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  created_at: number;
}

class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not available');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Zones store with indexes
        if (!db.objectStoreNames.contains(STORES.ZONES)) {
          const zonesStore = db.createObjectStore(STORES.ZONES, { keyPath: 'zone_code' });
          zonesStore.createIndex('primary_code', 'primary_code', { unique: false });
          zonesStore.createIndex('district_name', 'district_name', { unique: false });
          zonesStore.createIndex('ward_id', 'ward_id', { unique: false });
          zonesStore.createIndex('geohash', 'geohash', { unique: false });
          zonesStore.createIndex('plus_code', 'plus_code', { unique: false });
          zonesStore.createIndex('zone_name', 'zone_name', { unique: false });
        }

        // Wards store
        if (!db.objectStoreNames.contains(STORES.WARDS)) {
          const wardsStore = db.createObjectStore(STORES.WARDS, { keyPath: 'ward_id' });
          wardsStore.createIndex('district_name', 'district_name', { unique: false });
          wardsStore.createIndex('region_name', 'region_name', { unique: false });
          wardsStore.createIndex('geohash', 'geohash', { unique: false });
        }

        // Addresses store
        if (!db.objectStoreNames.contains(STORES.ADDRESSES)) {
          const addressesStore = db.createObjectStore(STORES.ADDRESSES, { keyPath: 'pda_id' });
          addressesStore.createIndex('zone_code', 'zone_code', { unique: false });
          addressesStore.createIndex('district', 'district', { unique: false });
          addressesStore.createIndex('geohash', 'geohash', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }

        // Pending sync store
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
          pendingStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get database instance
   */
  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // ==================== ZONES ====================

  /**
   * Store multiple zones
   */
  async storeZones(zones: Zone[]): Promise<void> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readwrite');
      const store = transaction.objectStore(STORES.ZONES);

      zones.forEach(zone => {
        store.put(zone);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all zones
   */
  async getAllZones(): Promise<Zone[]> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readonly');
      const store = transaction.objectStore(STORES.ZONES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get zone by code
   */
  async getZone(zoneCode: string): Promise<Zone | undefined> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readonly');
      const store = transaction.objectStore(STORES.ZONES);
      const request = store.get(zoneCode);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get zones by district
   */
  async getZonesByDistrict(districtName: string): Promise<Zone[]> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readonly');
      const store = transaction.objectStore(STORES.ZONES);
      const index = store.index('district_name');
      const request = index.getAll(districtName);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get zones by ward
   */
  async getZonesByWard(wardId: string): Promise<Zone[]> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readonly');
      const store = transaction.objectStore(STORES.ZONES);
      const index = store.index('ward_id');
      const request = index.getAll(wardId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search zones locally
   */
  async searchZones(query: string, limit: number = 30): Promise<Zone[]> {
    await this.init();
    const zones = await this.getAllZones();
    const queryLower = query.toLowerCase();

    // Score and filter zones
    const scored = zones
      .map(zone => {
        let score = 0;
        const zoneName = (zone.zone_name || '').toLowerCase();
        const searchText = (zone.search_text || '').toLowerCase();

        // Exact matches
        if (zone.zone_code === query.toUpperCase()) score += 100;
        if (zone.plus_code === query.toUpperCase()) score += 100;
        if (zoneName === queryLower) score += 90;

        // Prefix matches
        if (zone.zone_code.startsWith(query.toUpperCase())) score += 70;
        if (zoneName.startsWith(queryLower)) score += 60;

        // Contains matches
        if (zoneName.includes(queryLower)) score += 40;
        if (zone.district_name.toLowerCase().includes(queryLower)) score += 30;
        if (searchText.includes(queryLower)) score += 20;

        // Check alternate names and landmarks
        if (zone.alternate_names?.some(n => n.toLowerCase().includes(queryLower))) score += 50;
        if (zone.landmarks?.some(l => l.toLowerCase().includes(queryLower))) score += 45;

        return { zone, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.zone);

    return scored;
  }

  /**
   * Get zones near a geohash
   */
  async getZonesNearGeohash(geohash: string, limit: number = 20): Promise<Zone[]> {
    await this.init();
    const db = this.getDb();
    const prefix = geohash.substring(0, 4);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ZONES, 'readonly');
      const store = transaction.objectStore(STORES.ZONES);
      const index = store.index('geohash');
      const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
      const request = index.getAll(range, limit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== WARDS ====================

  /**
   * Store multiple wards
   */
  async storeWards(wards: Ward[]): Promise<void> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.WARDS, 'readwrite');
      const store = transaction.objectStore(STORES.WARDS);

      wards.forEach(ward => {
        store.put(ward);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all wards
   */
  async getAllWards(): Promise<Ward[]> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.WARDS, 'readonly');
      const store = transaction.objectStore(STORES.WARDS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get ward by ID
   */
  async getWard(wardId: string): Promise<Ward | undefined> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.WARDS, 'readonly');
      const store = transaction.objectStore(STORES.WARDS);
      const request = store.get(wardId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== METADATA ====================

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string | number | boolean): Promise<void> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.METADATA, 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      store.put({ key, value, updated_at: Date.now() });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<SyncMetadata | undefined> {
    await this.init();
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.METADATA, 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== STATS ====================

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    zones: number;
    wards: number;
    addresses: number;
    lastSync: number | null;
    dbSize: number;
  }> {
    await this.init();
    const db = this.getDb();

    const countStore = (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const [zones, wards, addresses, lastSyncMeta] = await Promise.all([
      countStore(STORES.ZONES),
      countStore(STORES.WARDS),
      countStore(STORES.ADDRESSES),
      this.getMetadata('last_sync'),
    ]);

    // Estimate database size
    let dbSize = 0;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      dbSize = estimate.usage || 0;
    }

    return {
      zones,
      wards,
      addresses,
      lastSync: lastSyncMeta ? (lastSyncMeta.value as number) : null,
      dbSize,
    };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.init();
    const db = this.getDb();

    const clearStore = (storeName: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    await Promise.all([
      clearStore(STORES.ZONES),
      clearStore(STORES.WARDS),
      clearStore(STORES.ADDRESSES),
      clearStore(STORES.METADATA),
      clearStore(STORES.PENDING_SYNC),
    ]);
  }
}

// Singleton instance
export const offlineDb = new OfflineDatabase();

export default offlineDb;
