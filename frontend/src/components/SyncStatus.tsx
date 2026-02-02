'use client';

/**
 * Sync Status Component
 *
 * Shows:
 * - Online/offline indicator
 * - Sync progress bar
 * - Database stats
 * - Manual sync button
 */

import { useState, useEffect } from 'react';
import { syncService, SyncProgress } from '@/lib/syncService';
import { offlineDb } from '@/lib/offlineDb';

interface SyncStatusProps {
  compact?: boolean;
  showStats?: boolean;
}

export default function SyncStatus({ compact = false, showStats = true }: SyncStatusProps) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(syncService.getStatus());
  const [stats, setStats] = useState({ zones: 0, wards: 0, lastSync: null as Date | null });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to sync updates
    const unsubscribe = syncService.subscribe((progress) => {
      setSyncProgress(progress);
    });

    // Load initial stats
    loadStats();

    // Refresh stats periodically
    const interval = setInterval(loadStats, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const dbStats = await offlineDb.getStats();
    setStats({
      zones: dbStats.zones,
      wards: dbStats.wards,
      lastSync: dbStats.lastSync ? new Date(dbStats.lastSync) : null,
    });
  };

  const handleForceSync = async () => {
    await syncService.forceResync();
    loadStats();
  };

  const getStatusColor = () => {
    switch (syncProgress.status) {
      case 'complete': return 'bg-green-500';
      case 'ready': return 'bg-green-500';
      case 'syncing': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (syncProgress.status) {
      case 'complete':
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'syncing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Compact version for header/toolbar
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} title={syncProgress.message} />
        {syncProgress.status === 'syncing' && (
          <span className="text-xs text-gray-500">{syncProgress.progress}%</span>
        )}
        {syncProgress.status === 'offline' && (
          <span className="text-xs text-yellow-600">Offline</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${getStatusColor()} text-white`}>
            {getStatusIcon()}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {syncProgress.status === 'offline' ? 'Offline Mode' :
               syncProgress.status === 'syncing' ? 'Syncing...' :
               syncProgress.status === 'complete' ? 'All Synced' :
               syncProgress.status === 'ready' ? 'Search Ready' :
               syncProgress.status === 'error' ? 'Sync Error' : 'Ready'}
            </div>
            <div className="text-xs text-gray-500">
              {stats.zones > 0 ? `${stats.zones.toLocaleString()} zones cached` : 'No data cached'}
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Progress bar for syncing */}
      {syncProgress.status === 'syncing' && (
        <div className="px-3 pb-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${syncProgress.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {syncProgress.message}
          </div>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && showStats && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-lg font-bold text-indigo-600">{stats.zones.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Zones</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-lg font-bold text-indigo-600">{stats.wards}</div>
              <div className="text-xs text-gray-500">Districts</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-lg font-bold text-indigo-600">
                {stats.lastSync ? formatTimeAgo(stats.lastSync) : 'Never'}
              </div>
              <div className="text-xs text-gray-500">Last Sync</div>
            </div>
          </div>

          {/* Sync details */}
          {syncProgress.status === 'syncing' && (
            <div className="text-sm text-gray-600">
              <div>Zones: {syncProgress.zonesLoaded} / {syncProgress.totalZones}</div>
              <div>Districts: {syncProgress.wardsLoaded} / {syncProgress.totalWards}</div>
            </div>
          )}

          {/* Error message */}
          {syncProgress.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {syncProgress.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleForceSync}
              disabled={syncProgress.status === 'syncing'}
              className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {syncProgress.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={async () => {
                if (confirm('Clear all cached data?')) {
                  await offlineDb.clearAll();
                  loadStats();
                }
              }}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Clear Cache
            </button>
          </div>

          {/* Offline notice */}
          {syncProgress.status === 'offline' && (
            <div className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Working Offline</strong>
                <p className="mt-1">
                  Search uses cached data. Data will sync when you&apos;re back online.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: Format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
