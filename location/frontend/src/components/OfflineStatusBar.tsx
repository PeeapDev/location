'use client';

import { useState } from 'react';
import { useOfflineContext } from './OfflineProvider';
import { usePreloadOfflineData, useStorageInfo } from '@/hooks/useOffline';

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
      />
    </svg>
  );
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

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

interface OfflineStatusBarProps {
  className?: string;
}

export function OfflineStatusBar({ className = '' }: OfflineStatusBarProps) {
  const { online, syncStatus, pendingCount, sync, refresh } = useOfflineContext();
  const { preload, status: preloadStatus, progress } = usePreloadOfflineData();
  const { info: storageInfo, refresh: refreshStorage } = useStorageInfo();
  const [showDetails, setShowDetails] = useState(false);

  const handleSync = async () => {
    await sync();
    refreshStorage();
  };

  const handlePreload = async () => {
    await preload();
    refreshStorage();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          online
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        }`}
      >
        {online ? (
          <WifiIcon className="w-4 h-4" />
        ) : (
          <WifiOffIcon className="w-4 h-4" />
        )}
        <span>{online ? 'Online' : 'Offline'}</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Offline Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {online ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-700">Connected to internet</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  <span className="text-amber-700">Working offline</span>
                </>
              )}
            </div>
          </div>

          {/* Sync status */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending changes</span>
              <span className="text-sm font-medium">{pendingCount}</span>
            </div>

            {pendingCount > 0 && online && (
              <button
                onClick={handleSync}
                disabled={syncStatus === 'syncing'}
                className="w-full py-2 px-3 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshIcon
                  className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                />
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>

          {/* Storage info */}
          {storageInfo && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Storage used</span>
                <span className="text-sm font-medium">
                  {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Preload button */}
          <div className="p-4">
            <button
              onClick={handlePreload}
              disabled={preloadStatus === 'loading' || !online}
              className="w-full py-2 px-3 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              {preloadStatus === 'loading'
                ? `Downloading... (${progress.current}/${progress.total})`
                : 'Download for Offline Use'}
            </button>
            {preloadStatus === 'success' && (
              <p className="text-xs text-green-600 text-center mt-2">
                All data cached for offline use!
              </p>
            )}
            {preloadStatus === 'error' && (
              <p className="text-xs text-red-600 text-center mt-2">
                Failed to download some data
              </p>
            )}
            {!online && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Connect to internet to download data
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline indicator for use in headers
 */
export function OfflineIndicator() {
  const { online, pendingCount } = useOfflineContext();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
        online ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {online ? (
        <>
          <CloudIcon className="w-3.5 h-3.5" />
          <span>{pendingCount} pending</span>
        </>
      ) : (
        <>
          <WifiOffIcon className="w-3.5 h-3.5" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
