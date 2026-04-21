"use client";

import * as React from "react";

/**
 * Hook for tracking media query state with SSR support.
 *
 * @param query - CSS media query string (e.g., "(max-width: 768px)")
 * @param defaultValue - Default value to use during SSR (defaults to false)
 * @returns Boolean indicating if the media query matches
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 */
export function useMediaQuery(
  query: string,
  defaultValue: boolean = false
): boolean {
  const [matches, setMatches] = React.useState<boolean>(defaultValue);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(query);

    // Update state with initial value
    setMatches(media.matches);

    // Create listener for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers support addEventListener
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup function
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Predefined media query hooks for common breakpoints.
 * Follows Tailwind's default breakpoints.
 */

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}

/**
 * Hook for mobile-first responsive design.
 * Returns true when viewport is at least the specified breakpoint.
 *
 * @param breakpoint - Minimum width in pixels
 * @returns Boolean indicating if viewport meets or exceeds breakpoint
 *
 * @example
 * const isMd = useBreakpoint(768); // true when width >= 768px
 */
export function useBreakpoint(breakpoint: number): boolean {
  return useMediaQuery(`(min-width: ${breakpoint}px)`);
}

/**
 * Hook for dark mode detection.
 *
 * @returns Boolean indicating if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Hook for reduced motion detection.
 *
 * @returns Boolean indicating if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Hook for high contrast mode detection.
 *
 * @returns Boolean indicating if user prefers high contrast
 */
export function usePrefersHighContrast(): boolean {
  return useMediaQuery("(prefers-contrast: high)");
}

/**
 * Hook for touch device detection (not 100% reliable but useful for UX).
 *
 * @returns Boolean indicating if device has touch capability
 */
export function useHasTouch(): boolean {
  return useMediaQuery("(hover: none) and (pointer: coarse)");
}

/**
 * Hook for hover capability detection.
 *
 * @returns Boolean indicating if device supports hover
 */
export function useHasHover(): boolean {
  return useMediaQuery("(hover: hover)");
}

/**
 * Hook for responsive design with multiple breakpoints.
 * Returns the current breakpoint category.
 *
 * @returns "mobile" | "tablet" | "desktop" | "large-desktop"
 */
export function useResponsiveBreakpoint(): "mobile" | "tablet" | "desktop" | "large-desktop" {
  const isLargeDesktop = useIsLargeDesktop();
  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();

  if (isLargeDesktop) return "large-desktop";
  if (isDesktop) return "desktop";
  if (isTablet) return "tablet";
  return "mobile";
}
