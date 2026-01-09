'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PendingAddress {
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
  created_by: string | null;
}

export default function PendingVerificationPage() {
  const [addresses, setAddresses] = useState<PendingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<PendingAddress | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadPendingAddresses();
  }, [page]);

  const loadPendingAddresses = async () => {
    try {
      setLoading(true);
      // API call to get pending addresses
      const response = await api.get('/address/pending', {
        params: { page, page_size: pageSize },
      });
      setAddresses(response.data.items || []);
      setTotal(response.data.total || 0);
      setError(null);
    } catch (err: any) {
      // If endpoint doesn't exist yet, show empty state
      if (err.response?.status === 404) {
        setAddresses([]);
        setTotal(0);
      } else {
        setError(err.response?.data?.detail || 'Failed to load pending addresses');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pdaId: string) => {
    try {
      await api.post(`/address/${pdaId}/approve`);
      loadPendingAddresses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve address');
    }
  };

  const handleReject = async () => {
    if (!selectedAddress) return;
    try {
      await api.post(`/address/${selectedAddress.pda_id}/reject`, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      setSelectedAddress(null);
      setRejectReason('');
      loadPendingAddresses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject address');
    }
  };

  const openRejectModal = (address: PendingAddress) => {
    setSelectedAddress(address);
    setShowRejectModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Verification</h1>
          <p className="text-gray-600 mt-1">
            Review and verify submitted addresses. {total} pending.
          </p>
        </div>
        <button
          onClick={loadPendingAddresses}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshIcon className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Pending</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">High Confidence</p>
          <p className="text-2xl font-bold text-green-600">
            {addresses.filter((a) => a.confidence_score >= 0.8).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Medium Confidence</p>
          <p className="text-2xl font-bold text-yellow-600">
            {addresses.filter((a) => a.confidence_score >= 0.5 && a.confidence_score < 0.8).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Low Confidence</p>
          <p className="text-2xl font-bold text-red-600">
            {addresses.filter((a) => a.confidence_score < 0.5).length}
          </p>
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
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addresses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <CheckCircleIcon className="w-12 h-12 text-green-400 mb-3" />
                      <p className="font-medium">All caught up!</p>
                      <p className="text-sm">No pending addresses to verify.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                addresses.map((address) => (
                  <tr key={address.pda_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm">{address.pda_id}</span>
                      <p className="text-xs text-gray-500">Zone: {address.zone_code}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">
                        {address.street_name || address.building_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {address.landmark_primary || `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {address.address_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(
                          address.confidence_score
                        )}`}
                      >
                        {Math.round(address.confidence_score * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{formatDate(address.created_at)}</p>
                      <p className="text-xs text-gray-500">{address.created_by || 'System'}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(address.pda_id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(address)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Reject
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

      {/* Reject Modal */}
      {showRejectModal && selectedAddress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reject Address</h3>
              <p className="text-sm text-gray-500 mt-1">
                PDA-ID: {selectedAddress.pda_id}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAddress(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
