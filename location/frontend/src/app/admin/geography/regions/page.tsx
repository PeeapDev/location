'use client';

import { useState, useEffect } from 'react';
import { geographyApi } from '@/lib/api';

interface Region {
  id: number;
  code: string;
  name: string;
  short_code: string;
  description: string | null;
  is_active: boolean;
  is_locked: boolean;
  district_count: number;
  created_at: string;
}

interface District {
  id: number;
  region_id: number;
  code: string;
  full_code: string;
  name: string;
  short_code: string;
  capital: string | null;
  description: string | null;
  population: number | null;
  area_sq_km: number | null;
  is_active: boolean;
  is_locked: boolean;
  zone_count: number;
  region_name: string;
  region_code: string;
  created_at: string;
}

export default function RegionsDistrictsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);

  // Form states
  const [regionForm, setRegionForm] = useState({ name: '', short_code: '', description: '' });
  const [districtForm, setDistrictForm] = useState({
    region_id: 0,
    name: '',
    short_code: '',
    capital: '',
    description: '',
    population: '',
    area_sq_km: '',
  });

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    loadDistricts();
  }, [selectedRegion]);

  const loadRegions = async () => {
    try {
      const response = await geographyApi.listRegions();
      setRegions(response.items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      const params = selectedRegion ? { region_id: selectedRegion } : {};
      const response = await geographyApi.listDistricts(params);
      setDistricts(response.items);
    } catch (err: any) {
      console.error('Failed to load districts:', err);
    }
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await geographyApi.createRegion(regionForm);
      setShowRegionModal(false);
      setRegionForm({ name: '', short_code: '', description: '' });
      loadRegions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create region');
    }
  };

  const handleUpdateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegion) return;
    try {
      await geographyApi.updateRegion(editingRegion.id, regionForm);
      setShowRegionModal(false);
      setEditingRegion(null);
      setRegionForm({ name: '', short_code: '', description: '' });
      loadRegions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update region');
    }
  };

  const handleDeleteRegion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this region?')) return;
    try {
      await geographyApi.deleteRegion(id);
      loadRegions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete region');
    }
  };

  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await geographyApi.createDistrict({
        ...districtForm,
        region_id: districtForm.region_id || selectedRegion!,
        population: districtForm.population ? parseInt(districtForm.population) : undefined,
        area_sq_km: districtForm.area_sq_km ? parseInt(districtForm.area_sq_km) : undefined,
      });
      setShowDistrictModal(false);
      setDistrictForm({ region_id: 0, name: '', short_code: '', capital: '', description: '', population: '', area_sq_km: '' });
      loadDistricts();
      loadRegions(); // Refresh region counts
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create district');
    }
  };

  const handleDeleteDistrict = async (id: number) => {
    if (!confirm('Are you sure you want to delete this district?')) return;
    try {
      await geographyApi.deleteDistrict(id);
      loadDistricts();
      loadRegions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete district');
    }
  };

  const openEditRegion = (region: Region) => {
    setEditingRegion(region);
    setRegionForm({
      name: region.name,
      short_code: region.short_code,
      description: region.description || '',
    });
    setShowRegionModal(true);
  };

  const openCreateDistrict = (regionId?: number) => {
    setDistrictForm({
      region_id: regionId || selectedRegion || 0,
      name: '',
      short_code: '',
      capital: '',
      description: '',
      population: '',
      area_sq_km: '',
    });
    setShowDistrictModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-xeeno-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regions & Districts</h1>
          <p className="text-gray-600 mt-1">
            Define the geographic structure. System auto-generates codes.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Regions</h2>
            <button
              onClick={() => {
                setEditingRegion(null);
                setRegionForm({ name: '', short_code: '', description: '' });
                setShowRegionModal(true);
              }}
              className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors text-sm"
            >
              + Create Region
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {regions.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <p>No regions created yet.</p>
                <p className="text-sm mt-1">Create your first region to get started.</p>
              </div>
            ) : (
              regions.map((region) => (
                <div
                  key={region.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedRegion === region.id ? 'bg-xeeno-primary/5 border-l-4 border-xeeno-primary' : ''
                  }`}
                  onClick={() => setSelectedRegion(region.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {region.code}
                        </span>
                        <h3 className="font-medium text-gray-900">{region.name}</h3>
                        <span className="text-xs text-gray-500">({region.short_code})</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {region.district_count} district{region.district_count !== 1 ? 's' : ''}
                        {region.is_locked && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Locked
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!region.is_locked && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRegion(region);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRegion(region.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Districts Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Districts
              {selectedRegion && (
                <span className="text-gray-500 font-normal ml-2">
                  in {regions.find((r) => r.id === selectedRegion)?.name}
                </span>
              )}
            </h2>
            <button
              onClick={() => openCreateDistrict()}
              disabled={regions.length === 0}
              className="px-4 py-2 bg-xeeno-secondary text-white rounded-lg hover:bg-xeeno-secondary/90 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Create District
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {districts.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <p>No districts found.</p>
                <p className="text-sm mt-1">
                  {selectedRegion
                    ? 'Create a district for this region.'
                    : 'Select a region or create a district.'}
                </p>
              </div>
            ) : (
              districts.map((district) => (
                <div key={district.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {district.full_code}
                        </span>
                        <h3 className="font-medium text-gray-900">{district.name}</h3>
                        <span className="text-xs text-gray-500">({district.short_code})</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {district.capital && `Capital: ${district.capital} | `}
                        {district.zone_count} zone{district.zone_count !== 1 ? 's' : ''}
                        {district.is_locked && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Locked
                          </span>
                        )}
                      </p>
                      {!selectedRegion && (
                        <p className="text-xs text-gray-400 mt-1">
                          Region: {district.region_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!district.is_locked && (
                        <button
                          onClick={() => handleDeleteDistrict(district.id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Region Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRegion ? 'Edit Region' : 'Create Region'}
              </h3>
            </div>
            <form onSubmit={editingRegion ? handleUpdateRegion : handleCreateRegion}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regionForm.name}
                    onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                    placeholder="e.g., Western Area"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Code * (1-5 characters)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={regionForm.short_code}
                    onChange={(e) =>
                      setRegionForm({ ...regionForm, short_code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., WA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={regionForm.description}
                    onChange={(e) => setRegionForm({ ...regionForm, description: e.target.value })}
                    placeholder="Brief description of the region"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <strong>Note:</strong> The region code (1-9) will be auto-generated by the system.
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegionModal(false);
                    setEditingRegion(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors"
                >
                  {editingRegion ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* District Modal */}
      {showDistrictModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create District</h3>
            </div>
            <form onSubmit={handleCreateDistrict}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Region *
                  </label>
                  <select
                    required
                    value={districtForm.region_id || ''}
                    onChange={(e) =>
                      setDistrictForm({ ...districtForm, region_id: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                  >
                    <option value="">Select a region</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name} ({region.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={districtForm.name}
                    onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })}
                    placeholder="e.g., Bo District"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={districtForm.short_code}
                      onChange={(e) =>
                        setDistrictForm({ ...districtForm, short_code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., BO"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capital City
                    </label>
                    <input
                      type="text"
                      value={districtForm.capital}
                      onChange={(e) => setDistrictForm({ ...districtForm, capital: e.target.value })}
                      placeholder="e.g., Bo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Population
                    </label>
                    <input
                      type="number"
                      value={districtForm.population}
                      onChange={(e) =>
                        setDistrictForm({ ...districtForm, population: e.target.value })
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area (km²)
                    </label>
                    <input
                      type="number"
                      value={districtForm.area_sq_km}
                      onChange={(e) =>
                        setDistrictForm({ ...districtForm, area_sq_km: e.target.value })
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <strong>Note:</strong> The district code (0-9) will be auto-generated. Full code will
                  be: [Region Code][District Code], e.g., "23" for Region 2, District 3.
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDistrictModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-xeeno-secondary text-white rounded-lg hover:bg-xeeno-secondary/90 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
