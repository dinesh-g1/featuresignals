"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  GearIcon,
  CreditCardIcon,
  TeamIcon,
  LogOutIcon,
  PersonIcon,
  HelpCircleIcon,
  BookIcon,
  ExternalLinkIcon,
} from "@/components/icons/nav-icons";
import { DOCS_URL, WEBSITE_URL } from "@/lib/external-urls";
import { path } from "@/lib/paths";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  external?: boolean;
  divider?: boolean;
}

export function UserMenu() {
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = (user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(e.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const plan = organization?.plan || "free";

  const menuItems: (MenuItem | "divider")[] = [
    {
      label: user?.name || "User",
      icon: PersonIcon,
      onClick: () => {},
    },
    "divider",
    {
      label: "Settings",
      href: "/settings/general",
      icon: GearIcon,
    },
    {
      label: "Team",
      href: "/team",
      icon: TeamIcon,
    },
    {
      label: "Billing",
      href: "/settings/billing",
      icon: CreditCardIcon,
    },
    "divider",
    {
      label: "Documentation",
      href: DOCS_URL,
      icon: BookIcon,
      external: true,
    },
    {
      label: "Support",
      href: `${WEBSITE_URL}/support`,
      icon: HelpCircleIcon,
      external: true,
    },
    "divider",
    {
      label: "Sign out",
      icon: LogOutIcon,
      onClick: () => {
        setOpen(false);
        logout();
        router.push(path("/login"));
      },
    },
  ];

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-full p-1 transition-all",
          "hover:bg-[var(--signal-bg-secondary)] hover:ring-2 hover:ring-[var(--signal-border-emphasis)]",
          open &&
            "bg-[var(--signal-bg-secondary)] ring-2 ring-[var(--signal-fg-accent)]",
        )}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div
          className="h-7 w-7 rounded-full bg-[var(--signal-bg-accent-emphasis)] text-white flex items-center justify-center text-xs font-bold shadow-sm"
          title={user?.name || "User"}
        >
          {initials}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop for click-outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
            role="menu"
            aria-orientation="vertical"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-[var(--signal-border-subtle)]">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)] truncate mt-0.5">
                {user?.email || ""}
              </p>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  plan === "enterprise"
                    ? "bg-purple-100 text-purple-700"
                    : plan === "pro"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                )}
              >
                {plan}
              </span>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {menuItems.map((item, idx) => {
                if (item === "divider") {
                  return (
                    <div
                      key={`divider-${idx}`}
                      className="my-1 border-t border-[var(--signal-border-subtle)]"
                    />
                  );
                }

                const Icon = item.icon;
                const isSignOut = item.label === "Sign out";

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else if (item.href) {
                        setOpen(false);
                        if (item.external) {
                          window.open(item.href, "_blank", "noopener");
                        } else {
                          router.push(item.href);
                        }
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors text-left",
                      isSignOut
                        ? "text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)]"
                        : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
                    )}
                    role="menuitem"
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSignOut
                          ? "text-[var(--signal-fg-danger)]"
                          : "text-[var(--signal-fg-secondary)]",
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.external && (
                      <ExternalLinkIcon className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                    )}
                  </button>
                );


              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
