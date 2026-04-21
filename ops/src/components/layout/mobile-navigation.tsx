"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  Server,
  Users,
  DollarSign,
  Activity,
  Shield,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { capitalize } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const drawerVariants = cva(
  "fixed inset-y-0 z-50 flex flex-col bg-gray-900 border-r border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out",
  {
    variants: {
      side: {
        left: "left-0 w-64 -translate-x-full",
        right: "right-0 w-64 translate-x-full",
        top: "top-0 h-auto w-full -translate-y-full",
        bottom: "bottom-0 h-[85vh] w-full translate-y-full",
      },
      open: {
        true: "translate-x-0 translate-y-0",
        false: "",
      },
    },
    compoundVariants: [
      { side: "left", open: false, className: "-translate-x-full" },
      { side: "right", open: false, className: "translate-x-full" },
      { side: "top", open: false, className: "-translate-y-full" },
      { side: "bottom", open: false, className: "translate-y-full" },
    ],
    defaultVariants: {
      side: "left",
      open: false,
    },
  }
);

interface MobileNavigationProps {
  /** Position of the drawer */
  side?: "left" | "right" | "top" | "bottom";
  /** Whether to show the hamburger menu button */
  showMenuButton?: boolean;
  /** Class name for the container */
  className?: string;
  /** Class name for the overlay */
  overlayClassName?: string;
}

export function MobileNavigation({
  side = "left",
  showMenuButton = true,
  className,
  overlayClassName,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const pathname = usePathname();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const opsRole = useAppStore((s) => s.opsRole);
  const logout = useAppStore((s) => s.logout);

  const currentRole = opsRole?.ops_role || "viewer";

  // Navigation items matching sidebar
  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
      roles: ["all"],
    },
    {
      icon: Server,
      label: "Environments",
      href: "/environments",
      roles: ["founder", "engineer", "customer_success", "demo_team"],
    },
    {
      icon: Users,
      label: "Customers",
      href: "/customers",
      roles: ["founder", "engineer", "customer_success"],
    },
    {
      icon: Shield,
      label: "Licenses",
      href: "/licenses",
      roles: ["founder", "engineer"],
    },
    {
      icon: Activity,
      label: "Sandboxes",
      href: "/sandboxes",
      roles: ["all"],
    },
    {
      icon: Activity,
      label: "Observability",
      href: "/observability",
      roles: ["founder", "engineer"],
    },
    {
      icon: DollarSign,
      label: "Financial",
      href: "/financial",
      roles: ["founder", "finance"],
    },
    {
      icon: FileText,
      label: "Audit Log",
      href: "/audit",
      roles: ["founder", "engineer", "customer_success"],
    },
    {
      icon: Settings,
      label: "Ops Users",
      href: "/ops-users",
      roles: ["founder"],
    },
  ];

  const canSeeItem = (roles: string[]) => {
    if (roles.includes("all")) return true;
    return roles.includes(currentRole);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
    setIsOpen(false);
  };

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Only show on mobile/tablet
  if (!isMobile && !isTablet) {
    return showMenuButton ? (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    ) : null;
  }

  const DrawerContent = (
    <>
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600">
            <svg
              className="h-4 w-4 text-white"
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
          <span className="text-sm font-semibold text-white">Ops Portal</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          if (!canSeeItem(item.roles)) return null;

          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  isActive ? "text-blue-400" : "text-gray-500"
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          {opsRole && (
            <div className="mt-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                {capitalize(opsRole.ops_role.replace("_", " "))}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
          className="border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger menu button */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className={cn("md:hidden", className)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            overlayClassName
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          drawerVariants({ side: isMobile ? "left" : side, open: isOpen }),
          "z-50"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {DrawerContent}
      </div>
    </>
  );
}

// Hook for controlling mobile navigation
export function useMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
    isMobile,
  };
}

// Standalone drawer component for reuse
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right" | "top" | "bottom";
  title?: string;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
}

export function MobileDrawer({
  isOpen,
  onClose,
  side = "left",
  title,
  children,
  className,
  overlayClassName,
}: MobileDrawerProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          overlayClassName
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          drawerVariants({
            side: isMobile ? "left" : side,
            open: isOpen,
          }),
          "z-50",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
