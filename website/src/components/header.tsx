"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown, ExternalLink, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { appUrl } from "@/lib/urls";
import {
  platformItems,
  learnMoreItems,
  productFooterLinks,
  developerItems,
  developerFooterItem,
  type NavItem,
} from "@/data/nav-links";
import { MobileNav } from "./mobile-nav";

const topLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

function NavListItem({ item }: { item: NavItem }) {
  const Ico = item.icon;
  const Wrapper = item.external ? "a" : Link;
  const extra = item.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <NavigationMenu.Link asChild>
      <Wrapper
        href={item.href}
        {...(extra as Record<string, string>)}
        className="group flex items-start gap-3 rounded-lg p-3 transition-colors duration-150 hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors duration-150 group-hover:bg-indigo-100">
          <Ico className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-slate-900">
              {item.title}
            </span>
            {item.external && (
              <ExternalLink className="h-3 w-3 text-slate-400" />
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {item.description}
          </p>
        </div>
      </Wrapper>
    </NavigationMenu.Link>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700"
        >
          <img src="/favicon.svg" alt="FeatureSignals" className="h-7 w-7" />
          FeatureSignals
        </Link>

        <NavigationMenu.Root className="hidden items-center lg:flex">
          <NavigationMenu.List className="flex items-center gap-1">
            {/* Product Mega Menu */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="group flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 data-[state=open]:bg-slate-50 data-[state=open]:text-slate-900">
                Product
                <ChevronDown
                  className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="absolute left-0 top-0 w-[680px] data-[motion=from-end]:animate-enterFromRight data-[motion=from-start]:animate-enterFromLeft data-[motion=to-end]:animate-exitToRight data-[motion=to-start]:animate-exitToLeft">
                <div className="grid grid-cols-[1fr_auto] divide-x divide-slate-100">
                  {/* Left: Platform */}
                  <div className="p-3">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Platform
                    </p>
                    <div className="space-y-0.5">
                      {platformItems.map((item) => (
                        <NavListItem key={item.title} item={item} />
                      ))}
                    </div>
                  </div>
                  {/* Right: Learn More */}
                  <div className="w-[240px] p-3">
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Learn More
                    </p>
                    <div className="space-y-0.5">
                      {learnMoreItems.map((item) => (
                        <NavListItem key={item.title} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Footer row */}
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-2.5">
                  {productFooterLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800"
                    >
                      {link.title}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Developers Menu */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="group flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 data-[state=open]:bg-slate-50 data-[state=open]:text-slate-900">
                Developers
                <ChevronDown
                  className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="absolute left-0 top-0 w-[380px] data-[motion=from-end]:animate-enterFromRight data-[motion=from-start]:animate-enterFromLeft data-[motion=to-end]:animate-exitToRight data-[motion=to-start]:animate-exitToLeft">
                <div className="flex flex-col gap-1 p-3">
                  {developerItems.map((item) => (
                    <NavListItem key={item.title} item={item} />
                  ))}
                </div>
                <div className="border-t border-slate-100 px-6 py-2.5">
                  <a
                    href={developerFooterItem.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800"
                  >
                    {developerFooterItem.title}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Top-level links */}
            {topLinks.map((link) => (
              <NavigationMenu.Item key={link.href}>
                <NavigationMenu.Link asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      pathname === link.href || pathname === `${link.href}/`
                        ? "text-indigo-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {link.label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            ))}

            <NavigationMenu.Indicator className="top-full z-10 flex h-2.5 items-end justify-center overflow-hidden transition-[width,transform_250ms_ease] data-[state=hidden]:animate-fadeOut data-[state=visible]:animate-fadeIn">
              <div className="relative top-[70%] h-2.5 w-2.5 rotate-45 rounded-tl-sm bg-white border border-slate-200" />
            </NavigationMenu.Indicator>
          </NavigationMenu.List>

          <div className="perspective-[2000px] absolute left-0 top-full flex w-full justify-center">
            <NavigationMenu.Viewport className="relative mt-2.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-[top_center] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-[width,height] duration-300 ease-out sm:w-[var(--radix-navigation-menu-viewport-width)]" />
          </div>
        </NavigationMenu.Root>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={appUrl.login}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900"
          >
            Log in
          </a>
          <a
            href={appUrl.register}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all duration-150 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25 active:scale-[0.98]"
          >
            Start Free
          </a>
        </div>

        <MobileNav pathname={pathname} />
      </div>
    </header>
  );
}
