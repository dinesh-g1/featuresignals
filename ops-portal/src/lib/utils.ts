/**
 * Utility functions for the Ops Portal.
 * All formatting and common helpers live here.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric amount as a currency string.
 *
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (defaults to EUR)
 * @param locale - Locale string for formatting (defaults to en-US)
 *
 * @example
 * formatCurrency(1847) // => "€1,847.00"
 * formatCurrency(42.5, 'USD') // => "$42.50"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a byte count into a human-readable string.
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places (defaults to 1)
 *
 * @example
 * formatBytes(0) // => "0 B"
 * formatBytes(1024) // => "1 KB"
 * formatBytes(1234567) // => "1.2 MB"
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

  return `${value} ${sizes[i]}`;
}

/**
 * Formats a date or timestamp as a relative time string (e.g., "2m ago", "3h ago").
 * Falls back to a formatted date if the time is more than 30 days away.
 *
 * @param date - Date, timestamp (ms), or ISO 8601 string
 *
 * @example
 * formatRelativeTime(new Date()) // => "just now"
 * formatRelativeTime(Date.now() - 120_000) // => "2m ago"
 * formatRelativeTime('2026-01-15T10:00:00Z') // => "Jan 15"
 */
export function formatRelativeTime(date: Date | number | string): string {
  const now = Date.now();
  const then = typeof date === 'string' ? new Date(date).getTime()
    : date instanceof Date ? date.getTime()
    : date;
  const diffMs = now - then;

  // Handle future dates or invalid dates
  if (diffMs < 0) return formatDate(then);
  if (!isFinite(diffMs)) return 'unknown';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  // For older dates, show the formatted date
  return formatDate(then);
}

/**
 * Formats a date/timestamp into a locale-friendly string.
 *
 * @param date - Date, timestamp (ms), or ISO 8601 string
 * @param options - Intl.DateTimeFormatOptions overrides
 *
 * @example
 * formatDate('2026-05-15T03:00:00Z') // => "May 15, 2026"
 * formatDate(Date.now(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
 * // => "May 15, 14:23"
 */
export function formatDate(
  date: Date | number | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  if (!isFinite(dateObj.getTime())) return 'Invalid date';

  const defaults: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options ?? defaults).format(dateObj);
}

/**
 * Creates a debounced version of a function.
 * The debounced function delays invoking `fn` until `ms` milliseconds
 * have elapsed since the last invocation.
 *
 * @param fn - The function to debounce
 * @param ms - The debounce delay in milliseconds
 *
 * @example
 * const handleSearch = debounce((query: string) => {
 *   api.search(query);
 * }, 300);
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, ms);
  };
}

/**
 * Generates a short unique identifier (8 characters).
 * Uses Math.random with base-36 encoding. Collision probability is
 * negligible for non-cryptographic use cases (e.g., request IDs in logs).
 */
export function shortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Truncates a string to the specified length, appending an ellipsis if truncated.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 *
 * @example
 * truncate('hello world', 5) // => "hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
