'use client';

import { useState, useEffect } from 'react';
import { geographyApi } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth-store';
import SearchDirectory from '@/components/SearchDirectory';

// Types
interface PostalZone {
  id?: number;
  zone_code?: string;
  primary_code: string;
  zone_name?: string;
  name?: string;
  district_name?: string;
  region_name?: string;
  segment_type?: string;
  zone_type?: string;
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

type TabType = 'zones' | 'addresses' | 'lookup' | 'search';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminDirectoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [zones, setZones] = useState<PostalZone[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected district code, postal code and zone for detail view (3-level hierarchy)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string | null>(null);
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<PostalZone | null>(null);
  const [zoneAddresses, setZoneAddresses] = useState<Address[]>([]);
  const [loadingZoneAddresses, setLoadingZoneAddresses] = useState(false);

  // Zone Lookup state
  const [lookupLat, setLookupLat] = useState('');
  const [lookupLng, setLookupLng] = useState('');
  const [lookupResult, setLookupResult] = useState<PostalZone | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Load data lazily based on active tab
  useEffect(() => {
    if (activeTab === 'zones' && zones.length === 0) {
      loadZones();
    }
    if (activeTab === 'addresses' && addresses.length === 0) {
      loadAddresses();
    }
  }, [activeTab]);

  const loadZones = async () => {
    try {
      setIsLoading(true);
      // Load ALL zones (increased page_size to handle ~10k zones)
      const response = await fetch(`${API_BASE}/api/v1/zones?page_size=15000`);
      if (!response.ok) throw new Error('Failed to load zones');
      const data = await response.json();
      // Map API response to our zone format
      const mappedZones = (data.zones || []).map((z: any) => ({
        id: z.id,
        zone_code: z.zone_code || z.primary_code,
        primary_code: z.primary_code,
        segment: z.segment,
        zone_name: z.zone_name || z.name,
        district_name: z.district_name,
        region_name: z.region_name,
        segment_type: z.segment_type || z.zone_type || 'mixed',
        address_count: z.address_count || 0,
        center_lat: z.center_lat ? parseFloat(z.center_lat) : undefined,
        center_lng: z.center_lng ? parseFloat(z.center_lng) : undefined,
      }));
      setZones(mappedZones.length > 0 ? mappedZones : FALLBACK_ZONES);
    } catch (err) {
      console.error('Failed to load zones:', err);
      setZones(FALLBACK_ZONES);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/v1/addresses/pending?page_size=100`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  // Load addresses for a specific zone
  const loadZoneAddresses = async (zone: PostalZone) => {
    setLoadingZoneAddresses(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/v1/addresses/pending?postal_code=${zone.primary_code}&page_size=100`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setZoneAddresses(data.items || []);
      } else {
        setZoneAddresses([]);
      }
    } catch (err) {
      console.error('Failed to load zone addresses:', err);
      setZoneAddresses([]);
    } finally {
      setLoadingZoneAddresses(false);
    }
  };

  // Handle district click - show all areas within that district (Level 2)
  const handleDistrictCodeClick = (districtName: string) => {
    setSelectedDistrictCode(districtName);  // Now stores district name
    setSelectedPostalCode(null);
    setSelectedZone(null);
  };

  // Handle area click - show all sub-zones within that area (Level 3)
  const handlePostalCodeClick = (postalCode: string) => {
    setSelectedPostalCode(postalCode);
    setSelectedZone(null);  // Don't auto-select zone, show list
  };

  // Handle zone (sub-street) click - show zone details
  const handleZoneClick = (zone: PostalZone) => {
    setSelectedZone(zone);
    loadZoneAddresses(zone);
  };

  // Get district code from primary_code (first 2 digits)
  const getDistrictCode = (primaryCode: string) => primaryCode?.substring(0, 2) || '';

  // Get all zones for a district (by district_name)
  const getZonesForDistrict = (districtName: string) => {
    return zones.filter(z => z.district_name === districtName);
  };

  // Get all zones for a specific postal code (area)
  const getZonesForPostalCode = (postalCode: string) => {
    return zones.filter(z => z.primary_code === postalCode);
  };

  // Get unique areas (postal codes) within a district
  const getAreasInDistrict = (districtName: string) => {
    const districtZones = getZonesForDistrict(districtName);
    const areaMap = new Map<string, { postalCode: string; areaName: string; zoneCount: number; types: string[] }>();

    districtZones.forEach(z => {
      if (!areaMap.has(z.primary_code)) {
        // Get the first zone (usually segment 001) as the area name
        const areaZones = districtZones.filter(dz => dz.primary_code === z.primary_code);
        const mainZone = areaZones.find(az => az.segment === '001') || areaZones[0];
        areaMap.set(z.primary_code, {
          postalCode: z.primary_code,
          areaName: mainZone?.zone_name || z.primary_code,
          zoneCount: areaZones.length,
          types: Array.from(new Set(areaZones.map(az => az.segment_type).filter(Boolean)))
        });
      }
    });

    return Array.from(areaMap.values()).sort((a, b) => a.postalCode.localeCompare(b.postalCode));
  };

  // Group zones by district_name for hierarchical display (Level 1: Districts)
  const districtGroups = Array.from(new Set(zones.map(z => z.district_name).filter(Boolean))).map(districtName => {
    const zonesInDistrict = zones.filter(z => z.district_name === districtName);
    const firstZone = zonesInDistrict[0];
    // Get unique postal codes (areas) within this district
    const areas = getAreasInDistrict(districtName);
    return {
      districtCode: getDistrictCode(firstZone?.primary_code || ''),
      districtName: districtName,
      regionName: firstZone?.region_name || '',
      zoneCount: zonesInDistrict.length,
      areaCount: areas.length,
      areas: areas,
      types: Array.from(new Set(zonesInDistrict.map(z => z.segment_type || z.zone_type).filter(Boolean)))
    };
  }).sort((a, b) => a.districtCode.localeCompare(b.districtCode));

  // Get unique districts from zones for filter dropdown
  const districts = Array.from(new Set(zones.map(z => z.district_name).filter(Boolean))).sort();

  // Filter zones
  const filteredZones = zones.filter(zone => {
    const zoneName = zone.zone_name || zone.name || '';
    const matchesSearch = searchQuery === '' ||
      zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (zone.zone_code || '').includes(searchQuery) ||
      (zone.primary_code || '').includes(searchQuery) ||
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
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/v1/geography/zones/lookup?lat=${lat}&lng=${lng}`, {
        headers,
      });
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
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLookupLat(position.coords.latitude.toFixed(6));
          setLookupLng(position.coords.longitude.toFixed(6));
        },
        () => {
          setLookupError('Could not get your location');
        }
      );
    }
  };

  // Handle zone selection from search component
  const handleSearchZoneSelect = (searchResult: any) => {
    // Find the matching zone from our loaded zones
    const matchingZone = zones.find(z => z.zone_code === searchResult.zone_code);
    if (matchingZone) {
      setActiveTab('zones');
      setSelectedDistrictCode(matchingZone.district_name || null);
      setSelectedPostalCode(matchingZone.primary_code || null);
      setSelectedZone(matchingZone);
      loadZoneAddresses(matchingZone);
    } else {
      // Create a zone object from search result
      const zoneFromSearch: PostalZone = {
        zone_code: searchResult.zone_code,
        primary_code: searchResult.zone_code.split('-')[0] || searchResult.zone_code,
        zone_name: searchResult.zone_name,
        district_name: searchResult.district_name,
        region_name: searchResult.region_name,
        segment_type: searchResult.segment_type,
        center_lat: searchResult.coordinates?.latitude,
        center_lng: searchResult.coordinates?.longitude,
        address_count: searchResult.address_count
      };
      setActiveTab('zones');
      setSelectedDistrictCode(searchResult.district_name || null);
      setSelectedPostalCode(zoneFromSearch.primary_code || null);
      setSelectedZone(zoneFromSearch);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Postal Directory</h1>
        <p className="text-gray-600 mt-1">Browse and search postal zones and addresses across Sierra Leone</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { id: 'search', label: 'Search', icon: '🔍' },
            { id: 'zones', label: 'Postal Zones', count: zones.length },
            { id: 'addresses', label: 'Addresses', count: zones.reduce((sum, z) => sum + (z.address_count || 0), 0) },
            { id: 'lookup', label: 'Zone Lookup' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSelectedDistrictCode(null);
                setSelectedPostalCode(null);
                setSelectedZone(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {'icon' in tab && tab.icon && <span className="mr-1">{tab.icon}</span>}
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

      {/* Search & Filter - show for zones and addresses tabs only */}
      {(activeTab === 'zones' || activeTab === 'addresses') && !selectedDistrictCode && !selectedPostalCode && !selectedZone && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'zones'
                ? 'Search by zone name, code, postal code, or district...'
                : 'Search by address, PDA-ID, postal code, or area...'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
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
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div>
          <SearchDirectory onSelectZone={handleSearchZoneSelect} />
        </div>
      )}

      {/* Zones Tab - Level 1: Show All Districts */}
      {activeTab === 'zones' && !selectedDistrictCode && !selectedPostalCode && !selectedZone && (
        <div>
          <div className="mb-4 text-sm text-gray-500">
            Showing {districtGroups.length} districts with {zones.length.toLocaleString()} total zones - Click a district to view areas
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-500">Loading {zones.length > 0 ? `${zones.length.toLocaleString()} zones` : 'zones'}...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {districtGroups
                .filter(dg => {
                  if (!searchQuery && !selectedDistrict) return true;
                  const matchesSearch = searchQuery === '' ||
                    dg.districtCode.includes(searchQuery) ||
                    dg.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dg.regionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dg.areas.some(a => a.postalCode.includes(searchQuery) || a.areaName.toLowerCase().includes(searchQuery.toLowerCase()));
                  const matchesDistrict = selectedDistrict === '' || dg.districtName === selectedDistrict;
                  return matchesSearch && matchesDistrict;
                })
                .map((dg) => (
                <div
                  key={dg.districtName}
                  onClick={() => handleDistrictCodeClick(dg.districtName)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:border-indigo-300 border-2 border-transparent transition-all"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-2">{dg.districtCode}</div>
                    <div className="text-sm font-medium text-gray-900 mb-1">{dg.districtName}</div>
                    <div className="text-xs text-gray-500 mb-3">{dg.regionName}</div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                        {dg.areaCount} area{dg.areaCount !== 1 ? 's' : ''}
                      </span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {dg.zoneCount.toLocaleString()} sub-zones
                      </span>
                    </div>
                    {dg.types.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {dg.types.slice(0, 2).map(type => (
                          <span
                            key={type}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              type === 'commercial' ? 'bg-amber-100 text-amber-800' :
                              type === 'residential' ? 'bg-green-100 text-green-800' :
                              type === 'government' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zones Tab - Level 2: Show Postal Codes within Selected District */}
      {activeTab === 'zones' && selectedDistrictCode && !selectedPostalCode && !selectedZone && (
        <div>
          <button
            onClick={() => setSelectedDistrictCode(null)}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all districts
          </button>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              <span className="text-indigo-600">{selectedDistrictCode}</span>
              {districtGroups.find(d => d.districtName === selectedDistrictCode) && (
                <span className="text-gray-500 font-normal ml-2 text-base">
                  ({districtGroups.find(d => d.districtName === selectedDistrictCode)?.regionName})
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500">
              Showing {getAreasInDistrict(selectedDistrictCode).length} areas - Click an area to view streets/locations within it
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {getAreasInDistrict(selectedDistrictCode).map((area) => (
              <div
                key={area.postalCode}
                onClick={() => handlePostalCodeClick(area.postalCode)}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg hover:border-indigo-300 border-2 border-transparent transition-all"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">{area.postalCode}</div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{area.areaName}</div>
                  <div className="text-xs text-gray-500 mb-2">{area.zoneCount} sub-zones</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {area.types.slice(0, 2).map(type => (
                      <span
                        key={type}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          type === 'commercial' ? 'bg-amber-100 text-amber-800' :
                          type === 'residential' ? 'bg-green-100 text-green-800' :
                          type === 'government' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zones Tab - Level 3: Show Sub-zones (Streets) within Selected Area */}
      {activeTab === 'zones' && selectedPostalCode && !selectedZone && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedPostalCode(null)}
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to {selectedDistrictCode || 'areas'}
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Area <span className="text-indigo-600">{selectedPostalCode}</span>
              <span className="text-gray-500 font-normal ml-2 text-base">
                - {getZonesForPostalCode(selectedPostalCode)[0]?.zone_name || 'Unknown Area'}
              </span>
            </h2>
            <p className="text-sm text-gray-500">
              Showing {getZonesForPostalCode(selectedPostalCode).length} streets/locations - Each has a unique postal code for precise delivery
            </p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Street/Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Addresses</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getZonesForPostalCode(selectedPostalCode).map((zone, idx) => (
                  <tr key={zone.zone_code || idx} className="hover:bg-indigo-50 cursor-pointer" onClick={() => handleZoneClick(zone)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-bold bg-indigo-100 text-indigo-800 font-mono">
                        {zone.zone_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{zone.zone_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        zone.segment_type === 'commercial' ? 'bg-amber-100 text-amber-800' :
                        zone.segment_type === 'residential' ? 'bg-green-100 text-green-800' :
                        zone.segment_type === 'government' ? 'bg-purple-100 text-purple-800' :
                        zone.segment_type === 'industrial' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {zone.segment_type || 'mixed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{zone.address_count || 0}</td>
                    <td className="px-4 py-3">
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy Level 3 removed - now integrated above */}
      {false && activeTab === 'zones' && selectedPostalCode && !selectedZone && !selectedDistrictCode && (
        <div>
          <button
            onClick={() => setSelectedPostalCode(null)}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to postal codes
          </button>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Postal Code <span className="text-indigo-600">{selectedPostalCode}</span>
            </h2>
            <p className="text-sm text-gray-500">
              Showing {getZonesForPostalCode(selectedPostalCode).length} zones - Click a zone to view details
            </p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      Coordinates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getZonesForPostalCode(selectedPostalCode).map((zone, idx) => (
                    <tr
                      key={zone.zone_code || idx}
                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                      onClick={() => handleZoneClick(zone)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-800">
                          {zone.zone_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {zone.zone_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {zone.district_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
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
        </div>
      )}

      {/* Zone Detail View */}
      {activeTab === 'zones' && selectedZone && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 text-sm flex-wrap">
            <button
              onClick={() => {
                setSelectedZone(null);
                setSelectedPostalCode(null);
                setSelectedDistrictCode(null);
              }}
              className="text-indigo-600 hover:text-indigo-800"
            >
              All Districts
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button
              onClick={() => {
                setSelectedZone(null);
                setSelectedPostalCode(null);
              }}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {selectedDistrictCode || getDistrictCode(selectedZone.primary_code)} - {selectedZone.district_name}
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium">{selectedZone.primary_code} - {selectedZone.zone_name || selectedZone.name}</span>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {selectedZone.zone_name || selectedZone.name || 'Zone Details'}
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Postal Code</dt>
                    <dd className="text-2xl font-bold text-indigo-600">{selectedZone.primary_code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Zone Code</dt>
                    <dd className="font-mono">{selectedZone.zone_code || selectedZone.primary_code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">District</dt>
                    <dd>{selectedZone.district_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Region</dt>
                    <dd>{selectedZone.region_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (selectedZone.segment_type || selectedZone.zone_type) === 'commercial' ? 'bg-amber-100 text-amber-800' :
                        (selectedZone.segment_type || selectedZone.zone_type) === 'residential' ? 'bg-green-100 text-green-800' :
                        (selectedZone.segment_type || selectedZone.zone_type) === 'government' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedZone.segment_type || selectedZone.zone_type || 'mixed'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Coordinates</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedZone.center_lat && selectedZone.center_lng ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Latitude</div>
                          <div className="font-mono text-lg">{selectedZone.center_lat.toFixed(6)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Longitude</div>
                          <div className="font-mono text-lg">{selectedZone.center_lng.toFixed(6)}</div>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedZone.center_lat},${selectedZone.center_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View on Google Maps
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </>
                  ) : (
                    <p className="text-gray-500">No coordinates available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Addresses in this zone */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Addresses in this Zone</h3>
            </div>
            {loadingZoneAddresses ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : zoneAddresses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No addresses registered in this zone
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PDA-ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Street</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {zoneAddresses.map((addr, idx) => (
                      <tr key={addr.pda_id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-indigo-600">
                          {addr.pda_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{addr.street || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{addr.area || '-'}</td>
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
                <p className="mt-2">No addresses found</p>
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

      {/* Zone Lookup Tab */}
      {activeTab === 'lookup' && (
        <div className="max-w-2xl">
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
                  onClick={useCurrentLocation}
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
                      {lookupResult.zone_name || 'Zone'}
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
                      {lookupResult.segment_type || 'mixed'}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick test coordinates for Sierra Leone */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Test Locations (Sierra Leone)</h3>
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

      {/* Postal Code Format Info - Sierra Leone */}
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
