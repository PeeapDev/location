'use client';

import { useState, useEffect } from 'react';
import { apiKeysApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface APIKey {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  allowed_endpoints: string[];
  allowed_ips: string[];
  total_requests: number;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  user_email: string | null;
}

interface CreateKeyResponse {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

const scopeColors: Record<string, string> = {
  read: 'bg-green-100 text-green-800',
  write: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export default function APIKeysPage() {
  const { user } = useAuthStore();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<CreateKeyResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [keyUsage, setKeyUsage] = useState<any>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    scopes: ['read'] as string[],
    expires_in_days: 90,
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeysApi.list();
      setKeys(response);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await apiKeysApi.create({
        name: createForm.name,
        description: createForm.description || undefined,
        scopes: createForm.scopes,
        expires_in_days: createForm.expires_in_days,
      });
      setNewKey(response);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', scopes: ['read'], expires_in_days: 90 });
      loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create API key');
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    try {
      await apiKeysApi.revoke(keyId);
      loadKeys();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke API key');
    }
  };

  const handleViewUsage = async (key: APIKey) => {
    try {
      const usage = await apiKeysApi.getUsage(key.id);
      setKeyUsage(usage);
      setSelectedKey(key);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load usage stats');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for programmatic access to the Xeeno Map API.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create API Key
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* New Key Display */}
      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <KeyIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900">API Key Created Successfully</h3>
              <p className="text-sm text-green-700 mt-1">
                Copy your API key now. You won&apos;t be able to see it again!
              </p>
              <div className="mt-4 p-3 bg-white border border-green-200 rounded-lg font-mono text-sm break-all">
                {newKey.key}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => copyToClipboard(newKey.key)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setNewKey(null)}
                  className="px-4 py-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-sm"
                >
                  I&apos;ve saved it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scopes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
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
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <KeyIcon className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="font-medium">No API keys</p>
                      <p className="text-sm">Create your first API key to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{key.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{key.key_prefix}...</p>
                      {key.user_email && user?.role === 'superadmin' && (
                        <p className="text-xs text-gray-400">{key.user_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              scopeColors[scope] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{key.total_requests.toLocaleString()} requests</p>
                      <p className="text-xs text-gray-500">
                        Last: {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {key.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600">
                        {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewUsage(key)}
                          className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                          Stats
                        </button>
                        {key.is_active && (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors text-sm"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create API Key</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="My API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What is this key for?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
                <div className="flex gap-3">
                  {['read', 'write', 'admin'].map((scope) => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.scopes.includes(scope)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateForm({ ...createForm, scopes: [...createForm.scopes, scope] });
                          } else {
                            setCreateForm({
                              ...createForm,
                              scopes: createForm.scopes.filter((s) => s !== scope),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-xeeno-primary focus:ring-xeeno-primary"
                        disabled={scope === 'admin' && user?.role !== 'superadmin'}
                      />
                      <span className={`text-sm capitalize ${scope === 'admin' && user?.role !== 'superadmin' ? 'text-gray-400' : ''}`}>
                        {scope}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
                <select
                  value={createForm.expires_in_days}
                  onChange={(e) => setCreateForm({ ...createForm, expires_in_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || createForm.scopes.length === 0}
                className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats Modal */}
      {selectedKey && keyUsage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
              <button
                onClick={() => { setSelectedKey(null); setKeyUsage(null); }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500 mb-4">
                Key: <span className="font-mono">{selectedKey.key_prefix}...</span> ({selectedKey.name})
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{keyUsage.total_requests.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{keyUsage.requests_today.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{keyUsage.requests_this_week.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{keyUsage.requests_this_month.toLocaleString()}</p>
                </div>
              </div>
              {keyUsage.last_used_at && (
                <div className="mt-4 text-sm text-gray-500">
                  <p>Last used: {formatDate(keyUsage.last_used_at)}</p>
                  {keyUsage.last_used_ip && <p>From IP: {keyUsage.last_used_ip}</p>}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => { setSelectedKey(null); setKeyUsage(null); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
