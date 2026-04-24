'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  Server,
  Play,
  CreditCard,
  Settings,
  HardDrive,
  ScrollText,
  HeartPulse,
  Cog,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItemConfig[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tenants', href: '/tenants', icon: Users },
  { label: 'Cells', href: '/cells', icon: Server },
  { label: 'Previews', href: '/previews', icon: Play },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Env Vars', href: '/env-vars', icon: Settings },
  { label: 'Backups', href: '/backups', icon: HardDrive },
  { label: 'Audit', href: '/audit', icon: ScrollText },
  { label: 'System', href: '/system', icon: HeartPulse },
  { label: 'Settings', href: '/settings', icon: Cog },
];

function NavItem({ item, collapsed }: { item: NavItemConfig; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-accent-primary/10 text-accent-primary'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-secondary',
        )}
        aria-hidden="true"
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-border-default bg-bg-secondary transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
      aria-label="Sidebar navigation"
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border-default px-4',
          sidebarCollapsed && 'justify-center px-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary">
            <span className="text-sm font-bold text-white">FS</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-base font-semibold text-text-primary">
              Ops Portal
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavItem item={item} collapsed={sidebarCollapsed} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border-default p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary',
            sidebarCollapsed && 'justify-center px-2',
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
