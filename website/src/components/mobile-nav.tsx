"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  productItems,
  developerItems,
  type NavItem,
} from "@/data/nav-links";

function AccordionSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-slate-900 transition-colors hover:bg-slate-50"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-2 pl-3">
              {items.map((item) => {
                const Ico = item.icon;
                const Tag = item.external ? "a" : Link;
                const extra = item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <Tag
                    key={item.title}
                    href={item.href}
                    {...(extra as Record<string, string>)}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <Ico className="h-4 w-4 shrink-0 text-indigo-600" strokeWidth={1.5} />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-slate-700">
                          {item.title}
                        </span>
                        {item.external && (
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </Tag>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const directLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/changelog", label: "Changelog" },
];

export function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  const handleNavigate = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="flex items-center justify-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white/95 backdrop-blur-lg shadow-2xl"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <Link
                    href="/"
                    onClick={handleNavigate}
                    className="flex items-center gap-2 text-lg font-bold tracking-tight text-indigo-600"
                  >
                    <img
                      src="/favicon.svg"
                      alt="FeatureSignals"
                      className="h-6 w-6"
                    />
                    FeatureSignals
                  </Link>
                  <Dialog.Close asChild>
                    <button
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="space-y-1">
                    <AccordionSection
                      title="Product"
                      items={productItems}
                      onNavigate={handleNavigate}
                    />
                    <AccordionSection
                      title="Developers"
                      items={developerItems}
                      onNavigate={handleNavigate}
                    />
                    {directLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={handleNavigate}
                        className={cn(
                          "block rounded-lg px-3 py-3 text-base font-medium transition-colors",
                          pathname === link.href
                            ? "text-indigo-600"
                            : "text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                  <a
                    href="https://app.featuresignals.com/login"
                    className="block rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Log in
                  </a>
                  <a
                    href="https://app.featuresignals.com/register"
                    className="block rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700"
                  >
                    Get Started Free
                  </a>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
