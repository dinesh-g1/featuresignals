'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { getStoredUser, logout } from '@/lib/auth';
import type { OpsUser } from '@/types/api';

// ─── Breadcrumb Parsing ────────────────────────────────────────────────────

interface Breadcrumb {
  label: string;
  href: string;
}

function useBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);

  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href };
  });
}

// ─── SearchBar ─────────────────────────────────────────────────────────────

function SearchBar() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 max-w-md">
      <Search
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150',
          focused ? 'text-accent-primary' : 'text-text-muted',
        )}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search... (⌘K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          'w-full h-9 pl-10 pr-4 rounded-md bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted',
          'border-border-default transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary',
        )}
        aria-label="Search"
      />
    </div>
  );
}

// ─── UserMenu ──────────────────────────────────────────────────────────────

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<OpsUser | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'OP';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg p-1.5 transition-colors duration-150',
          'hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
          open && 'bg-bg-tertiary',
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-xs font-semibold text-white">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-text-primary leading-tight">
            {user?.name ?? 'Ops User'}
          </p>
          <p className="text-xs text-text-muted leading-tight capitalize">
            {user?.role?.replace('-', ' ') ?? 'Admin'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-muted transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-56 rounded-lg border border-border-default',
            'bg-bg-elevated shadow-xl z-50 py-1',
          )}
          role="menu"
        >
          <div className="px-3 py-2 border-b border-border-default">
            <p className="text-sm font-medium text-text-primary">{user?.name}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>

          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </button>

          <div className="border-t border-border-default mt-1 pt-1">
            <button
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-accent-danger hover:bg-bg-tertiary transition-colors"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border-default',
        'bg-bg-primary/80 backdrop-blur-md px-4 lg:px-6',
      )}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle ?? toggleSidebar}
        className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-text-muted select-none" aria-hidden="true">
                /
              </span>
            )}
            <span
              className={cn(
                'transition-colors',
                index === breadcrumbs.length - 1
                  ? 'text-text-primary font-medium'
                  : 'text-text-muted',
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <SearchBar />

      {/* Notification bell */}
      <button
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-danger" />
      </button>

      {/* User menu */}
      <UserMenu />
    </header>
  );
}
