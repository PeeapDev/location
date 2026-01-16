'use client';

import { useState, useEffect } from 'react';
import OfflineSearchDirectory from '@/components/OfflineSearchDirectory';
import SyncStatus from '@/components/SyncStatus';
import { useOffline } from '@/components/ServiceWorkerProvider';

// Types
interface PostalZone {
  zone_code: string;
  primary_code: string;
  zone_name: string;
  district_name: string;
  region_name: string;
  segment_type: string;
  address_count?: number;
  center_lat?: number;
  center_lng?: number;
}

interface Address {
  pda_id: string;
  postal_code: string;
  street: string;
  area: string;
  district: string;
  latitude?: number;
  longitude?: number;
}

interface POI {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  latitude: number;
  longitude: number;
  plus_code: string;
  zone_code: string;
  district_name: string;
  region_name: string;
  phone?: string;
  website?: string;
}

interface POICategory {
  category: string;
  count: number;
}

type TabType = 'search' | 'zones' | 'addresses' | 'pois' | 'lookup' | 'register';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DirectoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const { isOnline } = useOffline();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [zones, setZones] = useState<PostalZone[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [poiCategories, setPoiCategories] = useState<POICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [totalPois, setTotalPois] = useState(0);
  const [poiPage, setPoiPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Zone Lookup state
  const [lookupLat, setLookupLat] = useState('');
  const [lookupLng, setLookupLng] = useState('');
  const [lookupResult, setLookupResult] = useState<PostalZone | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Registration state
  const [regForm, setRegForm] = useState({
    latitude: '',
    longitude: '',
    street_address: '',
    building_name: '',
    landmark: '',
  });
  const [regResult, setRegResult] = useState<any>(null);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Load zones from API
  useEffect(() => {
    loadZones();
    loadAddresses();
    loadPois();
    loadPoiCategories();
  }, []);

  const loadZones = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/v1/geography/zones?page_size=200`);
      if (response.ok) {
        const data = await response.json();
        setZones(data.items || []);
      } else {
        setZones(FALLBACK_ZONES);
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
      setZones(FALLBACK_ZONES);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/addresses/?page_size=100`);
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  const loadPois = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      const params = new URLSearchParams({
        page_size: '50',
        page: page.toString()
      });
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedDistrict) params.append('district', selectedDistrict);

      const response = await fetch(`${API_BASE}/api/v1/pois?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setPois(prev => [...prev, ...(data.pois || [])]);
        } else {
          setPois(data.pois || []);
        }
        setTotalPois(data.total_count || 0);
        setPoiPage(page);
      }
    } catch (err) {
      console.error('Failed to load POIs:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePois = () => {
    loadPois(poiPage + 1, true);
  };

  const loadPoiCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/pois/categories`);
      if (response.ok) {
        const data = await response.json();
        setPoiCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load POI categories:', err);
    }
  };

  // Reload POIs when filters change
  useEffect(() => {
    if (activeTab === 'pois') {
      setPoiPage(1);
      loadPois(1, false);
    }
  }, [selectedCategory, selectedDistrict, activeTab]);

  // Get unique districts from zones
  const districts = Array.from(new Set(zones.map(z => z.district_name).filter(Boolean))).sort();

  // Filter zones
  const filteredZones = zones.filter(zone => {
    const matchesSearch = searchQuery === '' ||
      (zone.zone_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      zone.zone_code?.includes(searchQuery) ||
      zone.primary_code?.includes(searchQuery) ||
      (zone.district_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === '' || zone.district_name === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  // Filter addresses
  const filteredAddresses = addresses.filter(addr => {
    const matchesSearch = searchQuery === '' ||
      (addr.street?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      addr.pda_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addr.postal_code?.includes(searchQuery) ||
      (addr.area?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === '' || addr.district === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  // Zone lookup by coordinates
  const handleLookup = async () => {
    setLookupError('');
    setLookupResult(null);

    const lat = parseFloat(lookupLat);
    const lng = parseFloat(lookupLng);

    if (isNaN(lat) || isNaN(lng)) {
      setLookupError('Please enter valid coordinates');
      return;
    }

    // Sierra Leone bounds: lat 6 to 10, lng -14 to -10
    if (lat < 6 || lat > 10 || lng < -14 || lng > -10) {
      setLookupError('Coordinates are outside Sierra Leone');
      return;
    }

    // Try API lookup first
    try {
      const response = await fetch(`${API_BASE}/api/v1/geography/zones/lookup?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        setLookupResult(data);
        return;
      }
    } catch (err) {
      console.error('API lookup failed:', err);
    }

    // Fallback: Find nearest zone from loaded zones
    let nearestZone = zones[0];
    let minDist = Infinity;

    for (const zone of zones) {
      if (zone.center_lat && zone.center_lng) {
        const dist = Math.sqrt(
          Math.pow(zone.center_lat - lat, 2) + Math.pow(zone.center_lng - lng, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestZone = zone;
        }
      }
    }

    if (nearestZone) {
      setLookupResult(nearestZone);
    } else {
      setLookupError('No zone found for these coordinates');
    }
  };

  // Use current location
  const useCurrentLocation = (forLookup: boolean = true) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (forLookup) {
            setLookupLat(position.coords.latitude.toFixed(6));
            setLookupLng(position.coords.longitude.toFixed(6));
          } else {
            setRegForm(prev => ({
              ...prev,
              latitude: position.coords.latitude.toFixed(6),
              longitude: position.coords.longitude.toFixed(6),
            }));
          }
        },
        () => {
          if (forLookup) {
            setLookupError('Could not get your location');
          } else {
            setRegError('Could not get your location');
          }
        }
      );
    }
  };

  // Register new address
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegResult(null);
    setIsRegistering(true);

    try {
      const lat = parseFloat(regForm.latitude);
      const lng = parseFloat(regForm.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Please enter valid coordinates');
      }

      // Try API registration
      const response = await fetch(`${API_BASE}/api/v1/addresses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          street_address: regForm.street_address || undefined,
          building_name: regForm.building_name || undefined,
          landmark: regForm.landmark || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRegResult(data);
        setRegForm({ latitude: '', longitude: '', street_address: '', building_name: '', landmark: '' });
        loadAddresses();
      } else {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Postal Directory</h1>
              <p className="text-gray-600 mt-1">
                Search postal zones and addresses across Sierra Leone
                {!isOnline && <span className="ml-2 text-amber-600 font-medium">(Working Offline)</span>}
              </p>
            </div>
            <div className="hidden md:block">
              <SyncStatus compact />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'search', label: 'Search', icon: '🔍' },
              { id: 'zones', label: 'Postal Zones', count: zones.length },
              { id: 'addresses', label: 'Addresses', count: addresses.length },
              { id: 'pois', label: 'Places', count: totalPois || pois.length },
              { id: 'lookup', label: 'Zone Lookup' },
              { id: 'register', label: 'Register Address' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      {(activeTab === 'zones' || activeTab === 'addresses' || activeTab === 'pois') && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'zones' ? 'Search by zone name, code, postal code, or district...' :
                    activeTab === 'addresses' ? 'Search by address, PDA-ID, postal code, or area...' :
                    'Search by name, Plus Code, or location...'
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {activeTab === 'pois' && (
                <div className="w-full md:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Categories</option>
                    {poiCategories.map(cat => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ({cat.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="w-full md:w-64">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Districts</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Tab - Offline-First */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <OfflineSearchDirectory
              onSelectZone={(zone) => {
                console.log('Selected zone:', zone);
              }}
            />
          </div>
        )}

        {/* Zones Tab */}
        {activeTab === 'zones' && (
          <div>
            <div className="mb-4 text-sm text-gray-500">
              Showing {filteredZones.length} postal zones
            </div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-500">Loading zones...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Postal Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          District
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Region
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coordinates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredZones.map((zone, idx) => (
                        <tr key={zone.zone_code || idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800">
                              {zone.primary_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
                            {zone.zone_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {zone.zone_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {zone.district_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {zone.region_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                            {zone.center_lat && zone.center_lng
                              ? `${zone.center_lat.toFixed(4)}, ${zone.center_lng.toFixed(4)}`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              zone.segment_type === 'commercial' ? 'bg-amber-100 text-amber-800' :
                              zone.segment_type === 'residential' ? 'bg-green-100 text-green-800' :
                              zone.segment_type === 'government' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {zone.segment_type || 'mixed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div>
            <div className="mb-4 text-sm text-gray-500">
              Showing {filteredAddresses.length} addresses
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {filteredAddresses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2">No addresses registered yet</p>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Register an address
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PDA-ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Postal Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Street Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          District
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coordinates
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAddresses.map((addr, idx) => (
                        <tr key={addr.pda_id || idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-sm font-mono text-indigo-600">
                              {addr.pda_id}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800">
                              {addr.postal_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {addr.street || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {addr.area || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {addr.district || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                            {addr.latitude && addr.longitude
                              ? `${addr.latitude.toFixed(4)}, ${addr.longitude.toFixed(4)}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POIs Tab */}
        {activeTab === 'pois' && (
          <div>
            <div className="mb-4 text-sm text-gray-500">
              Showing {pois.length} of {totalPois} places {selectedCategory && `in ${selectedCategory}`}
            </div>

            {/* Category Quick Filters */}
            {poiCategories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {poiCategories.slice(0, 8).map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      selectedCategory === cat.category
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ({cat.count})
                  </button>
                ))}
              </div>
            )}

            {pois.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="mt-2 text-gray-500">No places found</p>
                <p className="text-sm text-gray-400 mt-1">Run the OSM import script to populate places</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pois.filter(poi =>
                  !searchQuery ||
                  (poi.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                  (poi.plus_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                  (poi.subcategory?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                ).map(poi => (
                  <div key={poi.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{poi.name || 'Unnamed'}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {poi.subcategory?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || poi.category}
                        </p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        poi.category === 'healthcare' ? 'bg-red-100 text-red-800' :
                        poi.category === 'education' ? 'bg-blue-100 text-blue-800' :
                        poi.category === 'government' ? 'bg-purple-100 text-purple-800' :
                        poi.category === 'finance' ? 'bg-green-100 text-green-800' :
                        poi.category === 'food' ? 'bg-orange-100 text-orange-800' :
                        poi.category === 'shopping' ? 'bg-yellow-100 text-yellow-800' :
                        poi.category === 'tourism' ? 'bg-pink-100 text-pink-800' :
                        poi.category === 'transport' ? 'bg-cyan-100 text-cyan-800' :
                        poi.category === 'religious' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {poi.category}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm">
                      {poi.plus_code && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Plus Code:</span>
                          <code className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {poi.plus_code}
                          </code>
                        </div>
                      )}
                      {poi.zone_code && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Zone:</span>
                          <span className="font-mono text-xs">{poi.zone_code}</span>
                        </div>
                      )}
                      {poi.district_name && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">District:</span>
                          <span>{poi.district_name}</span>
                        </div>
                      )}
                      {poi.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Phone:</span>
                          <a href={`tel:${poi.phone}`} className="text-indigo-600 hover:underline">{poi.phone}</a>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-400">
                      <span>{poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}</span>
                      <a
                        href={`/poi/${poi.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View Details
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {pois.length > 0 && pois.length < totalPois && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMorePois}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    `Load More (${totalPois - pois.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Zone Lookup Tab */}
        {activeTab === 'lookup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Find Postal Zone by Coordinates</h2>
              <p className="text-gray-600 mb-6">
                Enter GPS coordinates to find the postal zone for any location in Sierra Leone.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={lookupLat}
                      onChange={(e) => setLookupLat(e.target.value)}
                      placeholder="e.g., 8.479"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={lookupLng}
                      onChange={(e) => setLookupLng(e.target.value)}
                      placeholder="e.g., -13.227"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleLookup}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Find Postal Zone
                  </button>
                  <button
                    onClick={() => useCurrentLocation(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Use My Location
                  </button>
                </div>

                {lookupError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {lookupError}
                  </div>
                )}

                {lookupResult && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-2">Postal Zone</div>
                      <div className="text-5xl font-bold text-indigo-600 mb-4">
                        {lookupResult.primary_code}
                      </div>
                      <div className="text-xl font-semibold text-gray-900 mb-1">
                        {lookupResult.zone_name}
                      </div>
                      <div className="text-gray-600">
                        {lookupResult.district_name}{lookupResult.region_name ? `, ${lookupResult.region_name}` : ''}
                      </div>
                      {lookupResult.center_lat && lookupResult.center_lng && (
                        <div className="mt-3 text-sm text-gray-500 font-mono">
                          Center: {lookupResult.center_lat.toFixed(4)}, {lookupResult.center_lng.toFixed(4)}
                        </div>
                      )}
                      <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white border">
                        {lookupResult.segment_type}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick test coordinates for Sierra Leone */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Test Locations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Central Freetown', lat: '8.479', lng: '-13.230' },
                      { name: 'Cline Town', lat: '8.478', lng: '-13.198' },
                      { name: 'Lumley Beach', lat: '8.428', lng: '-13.292' },
                      { name: 'Waterloo', lat: '8.332', lng: '-13.062' },
                      { name: 'Makeni', lat: '8.890', lng: '-12.050' },
                      { name: 'Bo City', lat: '7.965', lng: '-11.740' },
                      { name: 'Kenema', lat: '7.878', lng: '-11.192' },
                      { name: 'Koidu', lat: '8.645', lng: '-10.970' },
                    ].map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => {
                          setLookupLat(loc.lat);
                          setLookupLng(loc.lng);
                        }}
                        className="text-left px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                      >
                        <span className="font-medium">{loc.name}</span>
                        <span className="text-gray-500 text-xs block">
                          {loc.lat}, {loc.lng}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Register New Address</h2>
              <p className="text-gray-600 mb-6">
                Register a new physical address to receive a unique PDA-ID and postal code.
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="text"
                      value={regForm.latitude}
                      onChange={(e) => setRegForm(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="e.g., 8.479"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="text"
                      value={regForm.longitude}
                      onChange={(e) => setRegForm(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="e.g., -13.227"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => useCurrentLocation(false)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  Use my current location
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={regForm.street_address}
                    onChange={(e) => setRegForm(prev => ({ ...prev, street_address: e.target.value }))}
                    placeholder="e.g., 15 Siaka Stevens Street"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Building Name
                  </label>
                  <input
                    type="text"
                    value={regForm.building_name}
                    onChange={(e) => setRegForm(prev => ({ ...prev, building_name: e.target.value }))}
                    placeholder="e.g., State House"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nearest Landmark
                  </label>
                  <input
                    type="text"
                    value={regForm.landmark}
                    onChange={(e) => setRegForm(prev => ({ ...prev, landmark: e.target.value }))}
                    placeholder="e.g., Near Cotton Tree"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {isRegistering ? 'Registering...' : 'Register Address'}
                </button>

                {regError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {regError}
                  </div>
                )}

                {regResult && (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="mt-2 text-lg font-medium text-green-900">Address Registered!</h3>
                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <div className="text-sm text-gray-600">Your PDA-ID</div>
                        <div className="text-2xl font-mono font-bold text-indigo-600 mt-1">
                          {regResult.pda_id}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">Postal Code</div>
                        <div className="text-3xl font-bold text-gray-900">
                          {regResult.postal_code}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Postal Code Format Info - Sierra Leone */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Understanding Sierra Leone Postal Codes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Format: XYZZ</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>X</strong> = Region (1-5)</li>
                <li><strong>Y</strong> = District within region (0-9)</li>
                <li><strong>ZZ</strong> = Zone within district (00-99)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Region Codes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>1</strong> = Western Area (10xx-11xx)</li>
                <li><strong>2</strong> = Northern Province (21xx-25xx)</li>
                <li><strong>3</strong> = North West Province (31xx-32xx)</li>
                <li><strong>4</strong> = Southern Province (41xx-44xx)</li>
                <li><strong>5</strong> = Eastern Province (51xx-53xx)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">PDA-ID Format</h4>
            <p className="text-sm text-gray-600">
              Each address receives a unique Physical Digital Address ID: <code className="bg-gray-100 px-2 py-1 rounded">SL-XYZZ-NNN-NNNNNN-C</code>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Example: SL-1100-001-000001-2 (Sierra Leone, Zone 1100, Segment 001, Address 000001, Check digit 2)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback zones data for Sierra Leone if API fails
const FALLBACK_ZONES: PostalZone[] = [
  { zone_code: '1100-001', primary_code: '1100', zone_name: 'Central Freetown CBD', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'commercial', center_lat: 8.479, center_lng: -13.230 },
  { zone_code: '1100-002', primary_code: '1100', zone_name: 'Tower Hill', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'government', center_lat: 8.484, center_lng: -13.228 },
  { zone_code: '1101-001', primary_code: '1101', zone_name: 'Cline Town', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'mixed', center_lat: 8.478, center_lng: -13.198 },
  { zone_code: '1102-001', primary_code: '1102', zone_name: 'Congo Town', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.492, center_lng: -13.212 },
  { zone_code: '1103-001', primary_code: '1103', zone_name: 'Brookfields', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.465, center_lng: -13.248 },
  { zone_code: '1104-001', primary_code: '1104', zone_name: 'Hill Station', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.448, center_lng: -13.270 },
  { zone_code: '1105-001', primary_code: '1105', zone_name: 'Lumley', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'mixed', center_lat: 8.428, center_lng: -13.292 },
  { zone_code: '1106-001', primary_code: '1106', zone_name: 'Goderich', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.405, center_lng: -13.322 },
  { zone_code: '1107-001', primary_code: '1107', zone_name: 'Kissy', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.488, center_lng: -13.185 },
  { zone_code: '1108-001', primary_code: '1108', zone_name: 'Wellington', district_name: 'Western Area Urban', region_name: 'Western Area', segment_type: 'residential', center_lat: 8.490, center_lng: -13.165 },
  { zone_code: '1000-001', primary_code: '1000', zone_name: 'Waterloo Town', district_name: 'Western Area Rural', region_name: 'Western Area', segment_type: 'mixed', center_lat: 8.332, center_lng: -13.062 },
  { zone_code: '2100-001', primary_code: '2100', zone_name: 'Makeni City Center', district_name: 'Bombali', region_name: 'Northern Province', segment_type: 'commercial', center_lat: 8.890, center_lng: -12.050 },
  { zone_code: '2300-001', primary_code: '2300', zone_name: 'Kabala Town', district_name: 'Koinadugu', region_name: 'Northern Province', segment_type: 'mixed', center_lat: 9.590, center_lng: -11.550 },
  { zone_code: '2400-001', primary_code: '2400', zone_name: 'Magburaka Town', district_name: 'Tonkolili', region_name: 'Northern Province', segment_type: 'mixed', center_lat: 8.720, center_lng: -11.950 },
  { zone_code: '3100-001', primary_code: '3100', zone_name: 'Kambia Town', district_name: 'Kambia', region_name: 'North West Province', segment_type: 'mixed', center_lat: 9.125, center_lng: -12.920 },
  { zone_code: '3200-001', primary_code: '3200', zone_name: 'Port Loko Town', district_name: 'Port Loko', region_name: 'North West Province', segment_type: 'mixed', center_lat: 8.770, center_lng: -12.785 },
  { zone_code: '4100-001', primary_code: '4100', zone_name: 'Bo City Center', district_name: 'Bo', region_name: 'Southern Province', segment_type: 'commercial', center_lat: 7.965, center_lng: -11.740 },
  { zone_code: '4200-001', primary_code: '4200', zone_name: 'Bonthe Town', district_name: 'Bonthe', region_name: 'Southern Province', segment_type: 'mixed', center_lat: 7.535, center_lng: -12.505 },
  { zone_code: '4300-001', primary_code: '4300', zone_name: 'Moyamba Town', district_name: 'Moyamba', region_name: 'Southern Province', segment_type: 'mixed', center_lat: 8.162, center_lng: -12.435 },
  { zone_code: '4400-001', primary_code: '4400', zone_name: 'Pujehun Town', district_name: 'Pujehun', region_name: 'Southern Province', segment_type: 'mixed', center_lat: 7.352, center_lng: -11.720 },
  { zone_code: '5100-001', primary_code: '5100', zone_name: 'Kailahun Town', district_name: 'Kailahun', region_name: 'Eastern Province', segment_type: 'mixed', center_lat: 8.280, center_lng: -10.575 },
  { zone_code: '5200-001', primary_code: '5200', zone_name: 'Kenema City Center', district_name: 'Kenema', region_name: 'Eastern Province', segment_type: 'commercial', center_lat: 7.878, center_lng: -11.192 },
  { zone_code: '5300-001', primary_code: '5300', zone_name: 'Koidu City Center', district_name: 'Kono', region_name: 'Eastern Province', segment_type: 'commercial', center_lat: 8.645, center_lng: -10.970 },
];
