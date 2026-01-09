'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { ROLE_LABELS } from '@/types/auth';

// Navigation structure following the principle:
// Humans decide structure, System assigns identity
interface NavItem {
  name: string;
  href: string;
  icon: ({ className }: { className?: string }) => JSX.Element;
  roles?: string[];
}

interface NavSection {
  name: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    name: 'Dashboard',
    items: [
      { name: 'Overview', href: '/admin', icon: DashboardIcon },
    ],
  },
  {
    name: 'Geography',
    items: [
      { name: 'Regions & Districts', href: '/admin/geography/regions', icon: RegionIcon, roles: ['superadmin'] },
      { name: 'Zones (Map)', href: '/admin/geography/zones', icon: ZoneIcon, roles: ['superadmin', 'admin'] },
    ],
  },
  {
    name: 'Addresses',
    items: [
      { name: 'Pending Verification', href: '/admin/addresses/pending', icon: PendingIcon, roles: ['superadmin', 'admin'] },
      { name: 'Approved Addresses', href: '/admin/addresses/approved', icon: ApprovedIcon, roles: ['superadmin', 'admin'] },
    ],
  },
  {
    name: 'System',
    items: [
      { name: 'API Keys', href: '/admin/api-keys', icon: KeyIcon, roles: ['superadmin', 'admin'] },
      { name: 'Settings', href: '/admin/system/settings', icon: RulesIcon, roles: ['superadmin'] },
      { name: 'Identifier Rules', href: '/admin/system/rules', icon: RulesIcon, roles: ['superadmin'] },
      { name: 'Audit Logs', href: '/admin/system/audit', icon: AuditIcon, roles: ['superadmin'] },
    ],
  },
  {
    name: 'Users & Roles',
    items: [
      { name: 'Manage Users', href: '/admin/users', icon: UsersIcon, roles: ['superadmin', 'admin'] },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Dashboard', 'Geography', 'Addresses', 'System', 'Users & Roles']);

  const toggleSection = (name: string) => {
    setExpandedSections((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Filter items based on user role
  const canAccess = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return user && roles.includes(user.role);
  };

  return (
    <aside className="w-64 bg-xeeno-dark min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-xeeno-secondary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">SL</span>
          </div>
          <div>
            <span className="text-white font-semibold block">Xeeno Map</span>
            <span className="text-gray-400 text-xs">Sierra Leone</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => canAccess(item.roles));
          if (visibleItems.length === 0) return null;

          const isExpanded = expandedSections.includes(section.name);

          return (
            <div key={section.name} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider"
              >
                <span>{section.name}</span>
                <ChevronIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Section Items */}
              {isExpanded && (
                <ul className="space-y-1 mt-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/admin' && pathname.startsWith(item.href));

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            isActive
                              ? 'bg-xeeno-primary text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-700">
        {user && (
          <div className="mb-3">
            <p className="text-white font-medium truncate text-sm">{user.full_name}</p>
            <p className="text-gray-400 text-xs truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-0.5 bg-xeeno-secondary/20 text-xeeno-secondary text-xs rounded">
                {ROLE_LABELS[user.role]}
              </span>
              {user.is_superadmin && (
                <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Full Access
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm"
        >
          <LogoutIcon className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

// Icons
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function RegionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ZoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ApprovedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RulesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
