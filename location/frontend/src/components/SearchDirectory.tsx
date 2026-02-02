'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SearchResult {
  zone_code: string;
  zone_name: string;
  district_name: string;
  region_name: string;
  segment_type: string;
  plus_code: string | null;
  geohash?: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  address_count: number;
  relevance_score: number;
  match_type: string;
}

interface District {
  district_name: string;
  region_name: string;
  zone_count: number;
}

interface SegmentType {
  type: string;
  count: number;
}

interface SearchDirectoryProps {
  onSelectZone?: (zone: SearchResult) => void;
}

export default function SearchDirectory({ onSelectZone }: SearchDirectoryProps) {
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [districts, setDistricts] = useState<District[]>([]);
  const [segmentTypes, setSegmentTypes] = useState<SegmentType[]>([]);

  // Search mode: 'code' for postal codes, 'meta' for location names
  const [searchMode, setSearchMode] = useState<'code' | 'meta'>('meta');

  // GPS search state
  const [gpsMode, setGpsMode] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(1000);
  const [gpsResults, setGpsResults] = useState<any[]>([]);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [districtsRes, typesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/search/districts`),
        fetch(`${API_BASE}/api/v1/search/segment-types`)
      ]);

      if (districtsRes.ok) {
        const data = await districtsRes.json();
        setDistricts(data);
      }

      if (typesRes.ok) {
        const data = await typesRes.json();
        setSegmentTypes(data);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  // Debounced search - uses meta-search for location names, quick search for codes
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);

    try {
      // Detect if search looks like a postal code (digits or format like 1100-001)
      const looksLikeCode = /^[\d\-]+$/.test(searchQuery.trim()) || /^\d{4}/.test(searchQuery.trim());
      const endpoint = looksLikeCode || searchMode === 'code'
        ? '/api/v1/search/quick'
        : '/api/v1/spatial/meta-search';

      // Build query params
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '30'
      });

      if (selectedDistrict) params.append('district', selectedDistrict);
      if (selectedRegion) params.append('region', selectedRegion.toString());
      if (selectedType && looksLikeCode) params.append('segment_type', selectedType);

      const response = await fetch(`${API_BASE}${endpoint}?${params}`);

      if (response.ok) {
        const data = await response.json();
        // Map meta-search results to match SearchResult interface
        const mappedResults = data.results.map((r: any) => ({
          ...r,
          match_type: r.match_source || r.match_type || 'contains',
          address_count: r.address_count || 0
        }));
        setResults(mappedResults);
        setTotalCount(data.total_count);
        setSearchTime(data.search_time_ms);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDistrict, selectedRegion, selectedType, searchMode]);

  // Autocomplete
  const performAutocomplete = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/search/autocomplete?q=${encodeURIComponent(searchQuery)}&limit=8`);

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Immediate autocomplete for fast feedback
    performAutocomplete(value);

    // Debounced full search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          performSearch(query);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion: any) => {
    setQuery(suggestion.zone_code);
    setShowSuggestions(false);
    performSearch(suggestion.zone_code);
  };

  // GPS-based search
  const performGpsSearch = async () => {
    if (!latitude || !longitude) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        lat: latitude,
        lng: longitude,
        radius_meters: radius.toString(),
        limit: '20'
      });

      const response = await fetch(`${API_BASE}/api/v1/search/nearby?${params}`);

      if (response.ok) {
        const data = await response.json();
        setGpsResults(data.results);
      }
    } catch (err) {
      console.error('GPS search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Get segment type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'commercial': return 'bg-amber-100 text-amber-800';
      case 'residential': return 'bg-green-100 text-green-800';
      case 'government': return 'bg-purple-100 text-purple-800';
      case 'industrial': return 'bg-red-100 text-red-800';
      case 'mixed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get match type badge
  const getMatchBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-500 text-white';
      case 'prefix': return 'bg-blue-500 text-white';
      case 'contains': return 'bg-gray-500 text-white';
      // Meta-search match sources
      case 'zone_name': return 'bg-green-500 text-white';
      case 'alternate_name': return 'bg-blue-500 text-white';
      case 'landmark': return 'bg-amber-500 text-white';
      case 'poi': return 'bg-purple-500 text-white';
      case 'reference': return 'bg-pink-500 text-white';
      case 'district': return 'bg-indigo-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Get match type label for display
  const getMatchLabel = (matchType: string) => {
    switch (matchType) {
      case 'zone_name': return 'name';
      case 'alternate_name': return 'alt name';
      case 'landmark': return 'landmark';
      case 'poi': return 'POI';
      case 'reference': return 'reference';
      case 'district': return 'district';
      default: return matchType;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Search Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Directory Search</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setGpsMode(false); setSearchMode('meta'); }}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              !gpsMode && searchMode === 'meta' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Search by location name, landmark, or reference"
          >
            Name Search
          </button>
          <button
            onClick={() => { setGpsMode(false); setSearchMode('code'); }}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              !gpsMode && searchMode === 'code' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Search by postal code or Plus Code"
          >
            Code Search
          </button>
          <button
            onClick={() => setGpsMode(true)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              gpsMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Search by GPS coordinates"
          >
            GPS Search
          </button>
        </div>
      </div>

      {/* Text Search Mode */}
      {!gpsMode && (
        <>
          {/* Main Search Input */}
          <div className="relative mb-4">
            <div className="flex">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={searchMode === 'meta'
                    ? "Search by location name, landmark, or area (e.g. 'Central Freetown', 'near market')..."
                    : "Search by postal code, zone code, or Plus Code (e.g. '1100', '1100-001', '6CW8')..."}
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
                {isLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ml-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
              >
                Filters {showAdvanced ? '▲' : '▼'}
              </button>
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.zone_code}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-0 ${
                      index === selectedIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-indigo-600">{suggestion.zone_code}</span>
                        <span className="mx-2 text-gray-400">-</span>
                        <span className="text-gray-900">{suggestion.zone_name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{suggestion.district_name}</span>
                    </div>
                    {suggestion.plus_code && (
                      <div className="text-xs text-gray-400 mt-1">Plus Code: {suggestion.plus_code}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      if (query) performSearch(query);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Districts</option>
                    {districts.map(d => (
                      <option key={d.district_name} value={d.district_name}>
                        {d.district_name} ({d.zone_count})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    value={selectedRegion || ''}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value ? parseInt(e.target.value) : null);
                      if (query) performSearch(query);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Regions</option>
                    <option value="1">1 - Western Area</option>
                    <option value="2">2 - Northern Province</option>
                    <option value="3">3 - North West Province</option>
                    <option value="4">4 - Southern Province</option>
                    <option value="5">5 - Eastern Province</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value);
                      if (query) performSearch(query);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Types</option>
                    {segmentTypes.map(t => (
                      <option key={t.type} value={t.type}>
                        {t.type} ({t.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDistrict('');
                  setSelectedRegion(null);
                  setSelectedType('');
                  if (query) performSearch(query);
                }}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Search Stats */}
          {(results.length > 0 || totalCount > 0) && (
            <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                Found <strong>{totalCount.toLocaleString()}</strong> results
                {results.length < totalCount && ` (showing ${results.length})`}
              </span>
              <span>Search time: {searchTime}ms</span>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.zone_code}
                  onClick={() => onSelectZone?.(result)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-indigo-600">{result.zone_code}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMatchBadge(result.match_type)}`}>
                          {getMatchLabel(result.match_type)}
                        </span>
                      </div>
                      <div className="text-gray-900 font-medium mt-1">{result.zone_name || 'Unnamed Zone'}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {result.district_name} &bull; {result.region_name}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
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
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.segment_type)}`}>
                        {result.segment_type}
                      </span>
                      <div className="text-sm text-gray-500 mt-2">
                        {result.address_count} address{result.address_count !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && !isLoading && results.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">No results found for &quot;{query}&quot;</p>
              <p className="text-sm">Try a different search term or adjust your filters</p>
            </div>
          )}
        </>
      )}

      {/* GPS Search Mode */}
      {gpsMode && (
        <>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">Find zones near GPS coordinates</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g., 8.4657"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g., -13.2317"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
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
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition"
                  title="Use my current location"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={performGpsSearch}
                  disabled={!latitude || !longitude || isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition"
                >
                  {isLoading ? 'Searching...' : 'Search Nearby'}
                </button>
              </div>
            </div>
          </div>

          {/* GPS Results */}
          {gpsResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">
                {gpsResults.length} zones found within {radius}m
              </h4>
              {gpsResults.map((result) => (
                <div
                  key={result.zone_code}
                  onClick={() => onSelectZone?.(result)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-blue-600">{result.zone_code}</span>
                        <span className="text-sm text-gray-500">
                          {result.distance_meters ? `${result.distance_meters.toFixed(0)}m away` : ''}
                        </span>
                      </div>
                      <div className="text-gray-900 font-medium mt-1">{result.zone_name}</div>
                      <div className="text-sm text-gray-500">{result.district_name}</div>
                      {result.plus_code && (
                        <div className="text-xs text-gray-400 mt-1 font-mono">
                          Plus Code: {result.plus_code}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.segment_type)}`}>
                      {result.segment_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
