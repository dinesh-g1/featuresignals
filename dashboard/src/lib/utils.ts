import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// timeAgo returns a human-readable relative time string (e.g. "2 hours ago").
export function timeAgo(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

// formatDateTime returns a localized date + time string (e.g. "4/15/2026, 3:30:00 PM").
export function formatDateTime(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleString();
}

// formatDate returns a localized date string (e.g. "Apr 15, 2026").
export function formatDate(dateInput: string | Date): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// suggestSlug generates a URL-friendly slug from a name string.
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// safeApiCall wraps an async API call and returns [result, error] tuple
// to avoid .catch(() => {}) anti-pattern.
export async function safeApiCall<T>(
  fn: () => Promise<T>,
): Promise<[T | undefined, Error | undefined]> {
  try {
    const result = await fn();
    return [result, undefined];
  } catch (err) {
    return [undefined, err instanceof Error ? err : new Error(String(err))];
  }
}
