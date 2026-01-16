'use client';

/**
 * Offline-First Search Directory Component
 *
 * Features:
 * - Works offline using IndexedDB
 * - Syncs in background when online
 * - Shows sync status
 * - GPS-based nearby search
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useOfflineSearch, SearchResult } from '@/hooks/useOfflineSearch';
import SyncStatus from './SyncStatus';

interface OfflineSearchDirectoryProps {
  onSelectZone?: (zone: SearchResult) => void;
}

export default function OfflineSearchDirectory({ onSelectZone }: OfflineSearchDirectoryProps) {
  const {
    results,
    isLoading,
    isOffline,
    error,
    search,
    searchNearby,
    syncStatus,
    dbStats,
  } = useOfflineSearch();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'gps'>('text');
  const [gpsCoords, setGpsCoords] = useState({ lat: '', lng: '' });
  const [radius, setRadius] = useState(2000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(value);
    }, 300);
  }, [search]);

  // GPS search
  const handleGpsSearch = useCallback(() => {
    const lat = parseFloat(gpsCoords.lat);
    const lng = parseFloat(gpsCoords.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      searchNearby(lat, lng, radius);
    }
  }, [gpsCoords, radius, searchNearby]);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          });
        },
        (err) => {
          alert('Could not get your location: ' + err.message);
        }
      );
    }
  };

  // Get segment type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'commercial': return 'bg-amber-100 text-amber-800';
      case 'residential': return 'bg-green-100 text-green-800';
      case 'government': return 'bg-purple-100 text-purple-800';
      case 'industrial': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync Status */}
      <SyncStatus showStats={true} />

      {/* Search Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Directory Search</h2>
            {isOffline && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                Offline
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSearchMode('text')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                searchMode === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Text Search
            </button>
            <button
              onClick={() => setSearchMode('gps')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                searchMode === 'gps'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              GPS Search
            </button>
          </div>
        </div>

        {/* Text Search Mode */}
        {searchMode === 'text' && (
          <>
            <div className="relative mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={isOffline
                  ? "Search cached zones by name, code, or district..."
                  : "Search by location name, postal code, Plus Code..."}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
              {isLoading ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {/* Offline notice */}
            {isOffline && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <strong>Offline Mode:</strong> Searching {dbStats.zones.toLocaleString()} cached zones.
                Connect to internet to sync latest data.
              </div>
            )}
          </>
        )}

        {/* GPS Search Mode */}
        {searchMode === 'gps' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">Find zones near GPS coordinates</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={gpsCoords.lat}
                  onChange={(e) => setGpsCoords(prev => ({ ...prev, lat: e.target.value }))}
                  placeholder="e.g., 8.4657"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={gpsCoords.lng}
                  onChange={(e) => setGpsCoords(prev => ({ ...prev, lng: e.target.value }))}
                  placeholder="e.g., -13.2317"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="500">500m</option>
                  <option value="1000">1km</option>
                  <option value="2000">2km</option>
                  <option value="5000">5km</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={getCurrentLocation}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                  title="Use my location"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={handleGpsSearch}
                  disabled={!gpsCoords.lat || !gpsCoords.lng || isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                >
                  {isLoading ? 'Searching...' : 'Search Nearby'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Results count */}
        {results.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Found <strong>{results.length}</strong> results
              {results[0]?.source === 'offline' && ' (offline data)'}
            </span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.zone_code}
                onClick={() => onSelectZone?.(result)}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-indigo-600">
                        {result.zone_code}
                      </span>
                      {result.source === 'offline' && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                          offline
                        </span>
                      )}
                    </div>
                    <div className="text-gray-900 font-medium mt-1">
                      {result.zone_name || 'Unnamed Zone'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {result.district_name} &bull; {result.region_name}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.plus_code && (
                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                          Plus: {result.plus_code}
                        </span>
                      )}
                      {result.geohash && (
                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                          Geo: {result.geohash}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.segment_type)}`}>
                      {result.segment_type}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      {result.address_count} addresses
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {query && !isLoading && results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">No results found for &quot;{query}&quot;</p>
            {isOffline && (
              <p className="text-sm mt-1">Try connecting to internet for more results</p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!query && results.length === 0 && searchMode === 'text' && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="mt-2">Enter a search term to find postal zones</p>
            <div className="mt-4 text-sm">
              <p>Try searching for:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {['Central Freetown', '1100', 'Lumley', 'Bo City'].map(term => (
                  <button
                    key={term}
                    onClick={() => handleInputChange(term)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
