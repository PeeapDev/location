'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Setting {
  key: string;
  value: any;
  description: string | null;
  category: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

interface LockdownStatus {
  is_locked: boolean;
  reason: string | null;
  updated_at: string | null;
}

const categoryLabels: Record<string, string> = {
  system: 'System',
  security: 'Security',
  registration: 'Registration',
  api: 'API',
  scoring: 'Scoring',
};

const categoryIcons: Record<string, JSX.Element> = {
  system: <SystemIcon className="w-5 h-5" />,
  security: <ShieldIcon className="w-5 h-5" />,
  registration: <FormIcon className="w-5 h-5" />,
  api: <ApiIcon className="w-5 h-5" />,
  scoring: <ChartIcon className="w-5 h-5" />,
};

export default function SystemSettingsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lockdownStatus, setLockdownStatus] = useState<LockdownStatus | null>(null);
  const [lockdownReason, setLockdownReason] = useState('');
  const [showLockdownModal, setShowLockdownModal] = useState(false);

  // Editable values
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
    loadLockdownStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsData, categoriesData] = await Promise.all([
        settingsApi.list(),
        settingsApi.getCategories(),
      ]);
      setSettings(settingsData);
      setCategories(categoriesData.categories || []);
      if (categoriesData.categories?.length > 0 && !activeCategory) {
        setActiveCategory(categoriesData.categories[0]);
      }

      // Initialize edited values
      const values: Record<string, any> = {};
      settingsData.forEach((s: Setting) => {
        values[s.key] = s.value;
      });
      setEditedValues(values);

      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Settings not initialized yet
        setSettings([]);
        setCategories([]);
      } else {
        setError(err.response?.data?.detail || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLockdownStatus = async () => {
    try {
      const status = await settingsApi.getLockdownStatus();
      setLockdownStatus(status);
    } catch (err) {
      // Ignore - lockdown status may not be available
    }
  };

  const handleSaveSetting = async (key: string) => {
    try {
      setSaving(key);
      await settingsApi.update(key, editedValues[key]);
      setSuccess(`Setting "${key}" updated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will initialize default settings. Existing settings will not be overwritten. Continue?')) {
      return;
    }
    try {
      const result = await settingsApi.initializeDefaults();
      setSuccess(`Initialized ${result.created.length} new settings`);
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize settings');
    }
  };

  const handleActivateLockdown = async () => {
    try {
      await settingsApi.activateLockdown(lockdownReason);
      setSuccess('Emergency lockdown activated');
      setShowLockdownModal(false);
      setLockdownReason('');
      loadLockdownStatus();
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to activate lockdown');
    }
  };

  const handleDeactivateLockdown = async () => {
    if (!confirm('Are you sure you want to deactivate the emergency lockdown?')) {
      return;
    }
    try {
      await settingsApi.deactivateLockdown();
      setSuccess('Emergency lockdown deactivated');
      loadLockdownStatus();
      loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to deactivate lockdown');
    }
  };

  const renderSettingInput = (setting: Setting) => {
    const value = editedValues[setting.key];
    const originalValue = settings.find((s) => s.key === setting.key)?.value;
    const hasChanged = JSON.stringify(value) !== JSON.stringify(originalValue);

    // Boolean settings
    if (typeof originalValue === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditedValues({ ...editedValues, [setting.key]: !value })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              value ? 'bg-xeeno-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">{value ? 'Enabled' : 'Disabled'}</span>
          {hasChanged && (
            <button
              onClick={() => handleSaveSetting(setting.key)}
              disabled={saving === setting.key}
              className="ml-auto px-3 py-1 bg-xeeno-primary text-white text-sm rounded-lg hover:bg-xeeno-primary/90 disabled:opacity-50"
            >
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    // Number settings
    if (typeof originalValue === 'number') {
      return (
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value}
            onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: parseFloat(e.target.value) || 0 })}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
          />
          {hasChanged && (
            <button
              onClick={() => handleSaveSetting(setting.key)}
              disabled={saving === setting.key}
              className="px-3 py-1 bg-xeeno-primary text-white text-sm rounded-lg hover:bg-xeeno-primary/90 disabled:opacity-50"
            >
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    // String settings
    if (typeof originalValue === 'string') {
      return (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
          />
          {hasChanged && (
            <button
              onClick={() => handleSaveSetting(setting.key)}
              disabled={saving === setting.key}
              className="px-3 py-1 bg-xeeno-primary text-white text-sm rounded-lg hover:bg-xeeno-primary/90 disabled:opacity-50"
            >
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    // Object settings (JSON)
    if (typeof originalValue === 'object' && originalValue !== null) {
      return (
        <div className="space-y-2">
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditedValues({ ...editedValues, [setting.key]: parsed });
              } catch {
                // Invalid JSON, keep as-is
              }
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
          />
          {hasChanged && (
            <button
              onClick={() => handleSaveSetting(setting.key)}
              disabled={saving === setting.key}
              className="px-3 py-1 bg-xeeno-primary text-white text-sm rounded-lg hover:bg-xeeno-primary/90 disabled:opacity-50"
            >
              {saving === setting.key ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    return <span className="text-gray-400 text-sm">Unknown type</span>;
  };

  const filteredSettings = activeCategory
    ? settings.filter((s) => s.category === activeCategory)
    : settings;

  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure system behavior and security policies.
          </p>
        </div>
        {isSuperadmin && (
          <button
            onClick={handleInitializeDefaults}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Initialize Defaults
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">&times;</button>
        </div>
      )}

      {/* Lockdown Banner */}
      {lockdownStatus?.is_locked && (
        <div className="bg-red-600 text-white rounded-xl p-4">
          <div className="flex items-center gap-4">
            <ShieldIcon className="w-8 h-8" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Emergency Lockdown Active</h3>
              <p className="text-red-100">{lockdownStatus.reason || 'No reason provided'}</p>
            </div>
            {isSuperadmin && (
              <button
                onClick={handleDeactivateLockdown}
                className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                Deactivate Lockdown
              </button>
            )}
          </div>
        </div>
      )}

      {/* Emergency Lockdown Card */}
      {isSuperadmin && !lockdownStatus?.is_locked && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <ShieldIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Emergency Lockdown</h3>
              <p className="text-sm text-gray-500">
                Activate emergency lockdown to disable all non-superadmin access to the system.
              </p>
            </div>
            <button
              onClick={() => setShowLockdownModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Activate Lockdown
            </button>
          </div>
        </div>
      )}

      {/* Settings Content */}
      <div className="flex gap-6">
        {/* Category Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCategory === category
                    ? 'bg-xeeno-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {categoryIcons[category] || <SettingsIcon className="w-5 h-5" />}
                <span>{categoryLabels[category] || category}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-xeeno-primary mx-auto"></div>
            </div>
          ) : filteredSettings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <SettingsIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium">No settings found</p>
              <p className="text-sm">Click &quot;Initialize Defaults&quot; to create default settings.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSettings.map((setting) => (
                <div key={setting.key} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{setting.key}</h4>
                      <p className="text-sm text-gray-500">{setting.description || 'No description'}</p>
                    </div>
                  </div>
                  {isSuperadmin ? (
                    renderSettingInput(setting)
                  ) : (
                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      {typeof setting.value === 'object'
                        ? JSON.stringify(setting.value)
                        : String(setting.value)}
                    </div>
                  )}
                  {setting.updated_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last updated: {new Date(setting.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lockdown Modal */}
      {showLockdownModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-red-600">Activate Emergency Lockdown</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                This will immediately disable all non-superadmin access to the system. Only superadmins will be able to log in and use the system.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for lockdown *</label>
                <textarea
                  value={lockdownReason}
                  onChange={(e) => setLockdownReason(e.target.value)}
                  placeholder="Security breach detected, system maintenance, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowLockdownModal(false); setLockdownReason(''); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateLockdown}
                disabled={!lockdownReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Activate Lockdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function FormIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ApiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
