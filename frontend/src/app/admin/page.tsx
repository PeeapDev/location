'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, getAuthHeaders } from '@/lib/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DashboardStats {
  total_addresses: number;
  verified_addresses: number;
  pending_addresses: number;
  rejected_addresses: number;
  total_zones: number;
  zones_with_addresses: number;
  total_regions: number;
  total_districts: number;
  total_users: number;
  active_users: number;
}

interface TrendDataPoint {
  date: string;
  count: number;
}

interface RegistrationTrends {
  daily: TrendDataPoint[];
  total_this_week: number;
  total_this_month: number;
  change_percent: number;
}

interface VerificationStats {
  total_verified: number;
  total_pending: number;
  total_rejected: number;
  avg_confidence_score: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  low_confidence_count: number;
  type_breakdown: { address_type: string; count: number; percentage: number }[];
}

interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
  user: string | null;
}

interface ZoneCoverage {
  zone_code: string;
  zone_name: string | null;
  district_name: string;
  region_name: string;
  address_count: number;
  verified_count: number;
  pending_count: number;
}

interface ZoneCoverageResponse {
  zones: ZoneCoverage[];
  total_zones: number;
  zones_with_addresses: number;
  coverage_percent: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<RegistrationTrends | null>(null);
  const [verification, setVerification] = useState<VerificationStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [zoneCoverage, setZoneCoverage] = useState<ZoneCoverageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const headers = getAuthHeaders();

    try {
      // Load all analytics data in parallel
      const [dashboardRes, trendsRes, verificationRes, activityRes, zoneCoverageRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/analytics/dashboard`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/registrations?days=30`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/verification`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/recent-activity?limit=10`, { headers }),
        fetch(`${API_BASE}/api/v1/analytics/zone-coverage?limit=10`, { headers }),
      ]);

      if (dashboardRes.ok) {
        setStats(await dashboardRes.json());
      }
      if (trendsRes.ok) {
        setTrends(await trendsRes.json());
      }
      if (verificationRes.ok) {
        setVerification(await verificationRes.json());
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.activities || []);
      }
      if (zoneCoverageRes.ok) {
        setZoneCoverage(await zoneCoverageRes.json());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name}</p>
        </div>
        {trends && (
          <div className="text-right">
            <p className="text-sm text-gray-500">This month</p>
            <p className="text-2xl font-bold text-gray-900">{trends.total_this_month} addresses</p>
            <p className={`text-sm ${trends.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trends.change_percent >= 0 ? '+' : ''}{trends.change_percent}% vs last month
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Addresses"
          value={stats?.total_addresses || 0}
          icon={<AddressIcon />}
          color="blue"
        />
        <StatCard
          title="Verified"
          value={stats?.verified_addresses || 0}
          icon={<CheckIcon />}
          color="green"
        />
        <StatCard
          title="Pending Review"
          value={stats?.pending_addresses || 0}
          icon={<ClockIcon />}
          color="yellow"
          href="/admin/addresses/pending"
        />
        <StatCard
          title="Postal Zones"
          value={stats?.total_zones || 0}
          icon={<ZoneIcon />}
          color="purple"
          href="/admin/geography/zones"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Regions"
          value={stats?.total_regions || 0}
          icon={<MapIcon />}
          color="indigo"
          href="/admin/geography/regions"
        />
        <StatCard
          title="Districts"
          value={stats?.total_districts || 0}
          icon={<MapIcon />}
          color="cyan"
        />
        <StatCard
          title="Users"
          value={stats?.total_users || 0}
          icon={<UsersIcon />}
          color="pink"
          href="/admin/users"
        />
        <StatCard
          title="Zone Coverage"
          value={stats?.total_zones ? Math.round((stats.zones_with_addresses / stats.total_zones) * 100) : 0}
          suffix="%"
          icon={<ChartIcon />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Registration Trend (30 days)</h2>
          {trends && <TrendChart data={trends.daily} />}
        </div>

        {/* Verification Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Verification Status</h2>
          {verification && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Confidence</span>
                <span className="text-lg font-bold">{Math.round(verification.avg_confidence_score * 100)}%</span>
              </div>
              <div className="space-y-2">
                <ProgressBar label="High (80%+)" value={verification.high_confidence_count} total={stats?.total_addresses || 1} color="green" />
                <ProgressBar label="Medium (50-80%)" value={verification.medium_confidence_count} total={stats?.total_addresses || 1} color="yellow" />
                <ProgressBar label="Low (<50%)" value={verification.low_confidence_count} total={stats?.total_addresses || 1} color="red" />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">By Type</h3>
                <div className="space-y-1">
                  {verification.type_breakdown.slice(0, 4).map((type) => (
                    <div key={type.address_type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{type.address_type}</span>
                      <span className="font-medium">{type.count} ({type.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              href="/admin/addresses/pending"
              icon={<ReviewIcon />}
              title="Review Pending Addresses"
              description={`${stats?.pending_addresses || 0} addresses waiting for review`}
            />
            <QuickAction
              href="/admin/geography/zones"
              icon={<ZoneIcon />}
              title="Manage Zones"
              description="Draw and edit postal zones on the map"
            />
            <QuickAction
              href="/register"
              icon={<AddressIcon />}
              title="Register Address"
              description="Register a new address in the system"
            />
            {user?.is_superadmin && (
              <QuickAction
                href="/admin/users"
                icon={<UsersIcon />}
                title="Manage Users"
                description={`${stats?.total_users || 0} users in the system`}
              />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/admin/system/audit" className="text-sm text-xeeno-primary hover:underline">
              View all
            </Link>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 6).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className={`w-2 h-2 mt-1.5 rounded-full ${
                    activity.type === 'address_verified' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{activity.description}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(activity.timestamp).toLocaleString()}
                      {activity.user && ` by ${activity.user}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Zone Coverage Section */}
      {zoneCoverage && zoneCoverage.zones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Zone Coverage</h2>
              <p className="text-sm text-gray-500">
                {zoneCoverage.zones_with_addresses} of {zoneCoverage.total_zones} zones ({zoneCoverage.coverage_percent}% covered)
              </p>
            </div>
            <Link href="/admin/geography/zones" className="text-sm text-xeeno-primary hover:underline">
              View map
            </Link>
          </div>

          {/* Coverage Progress Bar */}
          <div className="mb-6">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-xeeno-primary to-xeeno-secondary rounded-full transition-all"
                style={{ width: `${zoneCoverage.coverage_percent}%` }}
              />
            </div>
          </div>

          {/* Top Zones Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Zone</th>
                  <th className="text-left py-2 font-medium text-gray-500">District</th>
                  <th className="text-right py-2 font-medium text-gray-500">Total</th>
                  <th className="text-right py-2 font-medium text-gray-500">Verified</th>
                  <th className="text-right py-2 font-medium text-gray-500">Pending</th>
                </tr>
              </thead>
              <tbody>
                {zoneCoverage.zones.map((zone) => (
                  <tr key={zone.zone_code} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2">
                      <span className="font-medium text-gray-900">{zone.zone_code}</span>
                      {zone.zone_name && (
                        <span className="text-gray-500 ml-1">- {zone.zone_name}</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">{zone.district_name}</td>
                    <td className="py-2 text-right font-medium">{zone.address_count}</td>
                    <td className="py-2 text-right">
                      <span className="text-green-600">{zone.verified_count}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-yellow-600">{zone.pending_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Trend Chart Component
function TrendChart({ data }: { data: TrendDataPoint[] }) {
  if (!data || data.length === 0) return <p className="text-gray-500">No data</p>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const lastWeek = data.slice(-7);

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="flex items-end gap-1 h-32">
        {data.map((point, idx) => (
          <div
            key={point.date}
            className="flex-1 bg-xeeno-primary/20 hover:bg-xeeno-primary/40 rounded-t transition-colors relative group"
            style={{ height: `${Math.max((point.count / maxCount) * 100, 2)}%` }}
          >
            {point.count > 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {point.count} on {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{new Date(data[0]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1]?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      {/* Summary */}
      <div className="flex gap-4 pt-2 border-t border-gray-100 text-sm">
        <div>
          <span className="text-gray-500">Last 7 days: </span>
          <span className="font-medium">{lastWeek.reduce((sum, d) => sum + d.count, 0)}</span>
        </div>
        <div>
          <span className="text-gray-500">Total: </span>
          <span className="font-medium">{data.reduce((sum, d) => sum + d.count, 0)}</span>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  href,
  suffix,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href?: string;
  suffix?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    pink: 'bg-pink-100 text-pink-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  const content = (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}{suffix}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Quick Action Component
function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

// Icons
function AddressIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ZoneIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
