"use client";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useAppStore } from "@/stores/app-store";
import { capitalize } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Bell, HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function Header() {
  const user = useAppStore((s) => s.user);
  const opsRole = useAppStore((s) => s.opsRole);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter current page
      console.log("Searching for:", searchQuery);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 md:px-6">
      {/* Left section: Mobile navigation + Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile navigation toggle - only visible on mobile/tablet */}
        <MobileNavigation showMenuButton={isMobile || isTablet} />

        {/* Brand */}
        <div className="hidden md:block">
          <h2 className="text-sm font-medium text-gray-300">
            FeatureSignals Operations
          </h2>
        </div>

        {/* Mobile brand - only visible on mobile when not showing search */}
        {isMobile && !showSearch && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-white">Ops</span>
          </div>
        )}
      </div>

      {/* Center section: Search (desktop) or mobile search toggle */}
      <div className="flex-1 max-w-2xl mx-4">
        {showSearch || !isMobile ? (
          <form onSubmit={handleSearch} className="w-full">
            <Input
              type="search"
              placeholder="Search customers, environments, licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              size="sm"
              className="w-full"
              onBlur={() => {
                if (isMobile && !searchQuery) {
                  setShowSearch(false);
                }
              }}
              autoFocus={showSearch && isMobile}
            />
          </form>
        ) : null}
      </div>

      {/* Right section: User info and actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search toggle button - only on mobile when search is hidden */}
        {isMobile && !showSearch && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Help button - hidden on mobile when search is showing */}
        {(!isMobile || !showSearch) && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}

        {/* Notifications - hidden on mobile when search is showing */}
        {(!isMobile || !showSearch) && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          </Button>
        )}

        {/* User info - hidden on mobile when search is showing */}
        {(!isMobile || !showSearch) && (
          <div className="flex items-center gap-2">
            {opsRole && !isMobile && (
              <span className="hidden rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 md:inline-block">
                {capitalize(opsRole.ops_role.replace("_", " "))}
              </span>
            )}
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden lg:block">
                <span className="text-sm text-gray-300">{user?.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile user avatar - only when search is not showing */}
        {isMobile && !showSearch && user && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
      </div>
    </header>
  );
}
