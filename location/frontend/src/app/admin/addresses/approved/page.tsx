'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { geographyApi } from '@/lib/api';

interface ApprovedAddress {
  pda_id: string;
  zone_code: string;
  latitude: number;
  longitude: number;
  street_name: string | null;
  building_name: string | null;
  landmark_primary: string | null;
  address_type: string;
  verification_status: string;
  confidence_score: number;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

interface Zone {
  id: number;
  primary_code: string;
  name: string | null;
  district_name: string;
}

export default function ApprovedAddressesPage() {
  const [addresses, setAddresses] = useState<ApprovedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterType, setFilterType] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const pageSize = 20;

  useEffect(() => {
    loadZones();
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [page, filterZone, filterType]);

  const loadZones = async () => {
    try {
      const response = await geographyApi.listZones({ page_size: 100 });
      setZones(response.items);
    } catch (err) {
      console.error('Failed to load zones:', err);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const params: any = { page, page_size: pageSize, status: 'verified' };
      if (filterZone) params.zone_code = filterZone;
      if (filterType) params.address_type = filterType;

      const response = await api.get('/address/list', { params });
      setAddresses(response.data.items || []);
      setTotal(response.data.total || 0);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAddresses([]);
        setTotal(0);
      } else {
        setError(err.response?.data?.detail || 'Failed to load addresses');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAddresses();
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/address/search', {
        query: searchQuery,
        filters: { verification_status: 'verified' },
        limit: pageSize,
      });
      setAddresses(response.data.addresses || []);
      setTotal(response.data.addresses?.length || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const copyPdaId = (pdaId: string) => {
    navigator.clipboard.writeText(pdaId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approved Addresses</h1>
          <p className="text-gray-600 mt-1">
            Browse and manage verified addresses. {total} total.
          </p>
        </div>
        <button
          onClick={() => {
            // Export functionality
          }}
          className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500">&times;</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by PDA-ID, street name, or landmark..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select
              value={filterZone}
              onChange={(e) => {
                setFilterZone(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone.primary_code} value={zone.primary_code}>
                  {zone.primary_code} - {zone.name || zone.district_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="government">Government</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Addresses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDA-ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-xeeno-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : addresses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <p className="font-medium">No addresses found</p>
                    <p className="text-sm">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                addresses.map((address) => (
                  <tr key={address.pda_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{address.pda_id}</span>
                        <button
                          onClick={() => copyPdaId(address.pda_id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy PDA-ID"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">
                        {address.street_name || address.building_name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {address.landmark_primary || `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm">{address.zone_code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {address.address_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{formatDate(address.verified_at)}</p>
                      <p className="text-xs text-gray-500">{address.verified_by || '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/address/${address.pda_id}`, '_blank')}
                          className="px-3 py-1.5 text-xeeno-primary text-sm hover:bg-xeeno-primary/5 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps?q=${address.latitude},${address.longitude}`,
                              '_blank'
                            )
                          }
                          className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Map
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
