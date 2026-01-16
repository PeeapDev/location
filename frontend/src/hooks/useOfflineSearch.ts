/**
 * Offline-First Search Hook
 *
 * Uses IndexedDB for offline search, falls back to API when online
 * Provides seamless search experience regardless of connectivity
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { offlineDb, Zone } from '@/lib/offlineDb';
import { syncService, SyncProgress } from '@/lib/syncService';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SearchResult {
  zone_code: string;
  zone_name: string;
  district_name: string;
  region_name: string;
  segment_type: string;
  plus_code: string | null;
  geohash: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  address_count: number;
  relevance_score: number;
  match_type: string;
  source: 'online' | 'offline';
}

export interface UseOfflineSearchResult {
  results: SearchResult[];
  isLoading: boolean;
  isOffline: boolean;
  isSearchReady: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  searchNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
  syncStatus: SyncProgress;
  dbStats: {
    zones: number;
    wards: number;
    lastSync: Date | null;
  };
}

export function useOfflineSearch(): UseOfflineSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncProgress>(syncService.getStatus());
  const [dbStats, setDbStats] = useState({ zones: 0, wards: 0, lastSync: null as Date | null });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setSyncStatus);

    // Update online status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    // Start auto sync
    syncService.startAutoSync();

    // Load initial stats
    loadDbStats();

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDbStats = async () => {
    const stats = await offlineDb.getStats();
    setDbStats({
      zones: stats.zones,
      wards: stats.wards,
      lastSync: stats.lastSync ? new Date(stats.lastSync) : null,
    });
  };

  /**
   * Main search function - uses offline DB when offline, API when online
   */
  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsLoading(true);
    setError(null);

    try {
      let searchResults: SearchResult[];

      if (isOffline || !navigator.onLine) {
        // Offline search using IndexedDB
        searchResults = await searchOffline(query);
      } else {
        // Online search with fallback
        try {
          searchResults = await searchOnline(query);
        } catch (apiError) {
          console.warn('API search failed, falling back to offline:', apiError);
          searchResults = await searchOffline(query);
        }
      }

      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError((err as Error).message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOffline]);

  /**
   * Search using IndexedDB
   */
  const searchOffline = async (query: string): Promise<SearchResult[]> => {
    const zones = await offlineDb.searchZones(query, 30);

    return zones.map(zone => ({
      zone_code: zone.zone_code,
      zone_name: zone.zone_name || '',
      district_name: zone.district_name,
      region_name: zone.region_name,
      segment_type: zone.segment_type || 'mixed',
      plus_code: zone.plus_code,
      geohash: zone.geohash,
      coordinates: zone.center_lat && zone.center_lng
        ? { latitude: zone.center_lat, longitude: zone.center_lng }
        : null,
      address_count: zone.address_count || 0,
      relevance_score: 0.8,
      match_type: 'offline',
      source: 'offline' as const,
    }));
  };

  /**
   * Search using API
   */
  const searchOnline = async (query: string): Promise<SearchResult[]> => {
    // Detect if query looks like a code or name
    const looksLikeCode = /^[\d\-]+$/.test(query.trim()) || /^\d{4}/.test(query.trim());
    const endpoint = looksLikeCode
      ? '/api/v1/search/quick'
      : '/api/v1/spatial/meta-search';

    const response = await fetch(`${API_BASE}${endpoint}?q=${encodeURIComponent(query)}&limit=30`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return data.results.map((r: any) => ({
      zone_code: r.zone_code,
      zone_name: r.zone_name || '',
      district_name: r.district_name,
      region_name: r.region_name,
      segment_type: r.segment_type || 'mixed',
      plus_code: r.plus_code,
      geohash: r.geohash,
      coordinates: r.coordinates,
      address_count: r.address_count || 0,
      relevance_score: r.relevance_score || 0.5,
      match_type: r.match_type || r.match_source || 'contains',
      source: 'online' as const,
    }));
  };

  /**
   * Search nearby zones by GPS coordinates
   */
  const searchNearby = useCallback(async (lat: number, lng: number, radius: number = 2000) => {
    setIsLoading(true);
    setError(null);

    try {
      let searchResults: SearchResult[];

      if (isOffline || !navigator.onLine) {
        // Offline nearby search using geohash
        const geohash = encodeGeohash(lat, lng, 6);
        const zones = await offlineDb.getZonesNearGeohash(geohash, 20);

        // Calculate distances and sort
        searchResults = zones
          .map(zone => ({
            zone_code: zone.zone_code,
            zone_name: zone.zone_name || '',
            district_name: zone.district_name,
            region_name: zone.region_name,
            segment_type: zone.segment_type || 'mixed',
            plus_code: zone.plus_code,
            geohash: zone.geohash,
            coordinates: zone.center_lat && zone.center_lng
              ? { latitude: zone.center_lat, longitude: zone.center_lng }
              : null,
            address_count: zone.address_count || 0,
            relevance_score: 0.8,
            match_type: 'nearby',
            source: 'offline' as const,
            distance: zone.center_lat && zone.center_lng
              ? haversineDistance(lat, lng, zone.center_lat, zone.center_lng)
              : Infinity,
          }))
          .filter(r => r.distance <= radius)
          .sort((a, b) => a.distance - b.distance);
      } else {
        // Online nearby search
        const response = await fetch(
          `${API_BASE}/api/v1/search/nearby?lat=${lat}&lng=${lng}&radius_meters=${radius}&limit=20`
        );

        if (!response.ok) throw new Error('Nearby search failed');

        const data = await response.json();

        searchResults = data.results.map((r: any) => ({
          zone_code: r.zone_code,
          zone_name: r.zone_name || '',
          district_name: r.district_name,
          region_name: r.region_name,
          segment_type: r.segment_type || 'mixed',
          plus_code: r.plus_code,
          geohash: r.geohash,
          coordinates: r.coordinates,
          address_count: 0,
          relevance_score: 1 - (r.distance_meters || 0) / radius,
          match_type: 'nearby',
          source: 'online' as const,
        }));
      }

      setResults(searchResults);
    } catch (err) {
      console.error('Nearby search error:', err);
      setError((err as Error).message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOffline]);

  return {
    results,
    isLoading,
    isOffline,
    isSearchReady: syncStatus.isSearchReady ?? dbStats.zones > 0,
    error,
    search,
    searchNearby,
    syncStatus,
    dbStats,
  };
}

// Helper: Encode geohash
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat: number, lng: number, precision: number = 6): string {
  let latRange = [-90.0, 90.0];
  let lngRange = [-180.0, 180.0];
  let geohash = '';
  let bits = 0;
  let bitCount = 0;
  let isLng = true;

  while (geohash.length < precision) {
    if (isLng) {
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        lngRange[0] = mid;
      } else {
        bits = bits << 1;
        lngRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latRange[0] = mid;
      } else {
        bits = bits << 1;
        latRange[1] = mid;
      }
    }

    isLng = !isLng;
    bitCount++;

    if (bitCount === 5) {
      geohash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return geohash;
}

// Helper: Calculate haversine distance
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default useOfflineSearch;
