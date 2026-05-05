"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon } from "@primer/octicons-react";

const REGISTER_URL = "https://app.featuresignals.com/register";

export function MobileCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past ~30% of viewport height (past hero)
      const shouldShow = window.scrollY > window.innerHeight * 0.3;
      // Also hide when near the footer (last 400px of page)
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 400;
      setVisible(shouldShow && !nearBottom);
    };

    handleScroll(); // Check initial state
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="mx-3 mb-3 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-floating-large)] p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--fgColor-default)] truncate">
                Start building for free
              </p>
              <p className="text-xs text-[var(--fgColor-muted)] truncate">
                No credit card &middot; 14-day Pro trial
              </p>
            </div>
            <a
              href={REGISTER_URL}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-md px-4 h-9 text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Start Free
              <ArrowRightIcon size={14} />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
