/**
 * IndexedDB wrapper for offline-first data storage
 */

const DB_NAME = 'xeeno-map-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  GEODATA: 'geodata',
  REGIONS: 'regions',
  DISTRICTS: 'districts',
  ZONES: 'zones',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Geodata store (GADM boundaries)
      if (!db.objectStoreNames.contains(STORES.GEODATA)) {
        db.createObjectStore(STORES.GEODATA, { keyPath: 'id' });
      }

      // Regions store
      if (!db.objectStoreNames.contains(STORES.REGIONS)) {
        const regionsStore = db.createObjectStore(STORES.REGIONS, { keyPath: 'id' });
        regionsStore.createIndex('code', 'code', { unique: true });
        regionsStore.createIndex('is_active', 'is_active', { unique: false });
      }

      // Districts store
      if (!db.objectStoreNames.contains(STORES.DISTRICTS)) {
        const districtsStore = db.createObjectStore(STORES.DISTRICTS, { keyPath: 'id' });
        districtsStore.createIndex('region_id', 'region_id', { unique: false });
        districtsStore.createIndex('full_code', 'full_code', { unique: true });
        districtsStore.createIndex('is_active', 'is_active', { unique: false });
      }

      // Zones store
      if (!db.objectStoreNames.contains(STORES.ZONES)) {
        const zonesStore = db.createObjectStore(STORES.ZONES, { keyPath: 'id' });
        zonesStore.createIndex('district_id', 'district_id', { unique: false });
        zonesStore.createIndex('primary_code', 'primary_code', { unique: true });
        zonesStore.createIndex('is_active', 'is_active', { unique: false });
      }

      // Sync queue for offline mutations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }

      // Metadata store (last sync times, etc.)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      console.log('IndexedDB schema created/upgraded');
    };
  });
}

/**
 * Get the database instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Generic put operation
 */
export async function put<T>(storeName: StoreName, data: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Generic put many operation
 */
export async function putMany<T>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    for (const item of items) {
      store.put(item);
    }
  });
}

/**
 * Generic get operation
 */
export async function get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic get all operation
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all by index
 */
export async function getAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generic delete operation
 */
export async function remove(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear a store
 */
export async function clear(storeName: StoreName): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Count items in a store
 */
export async function count(storeName: StoreName): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
