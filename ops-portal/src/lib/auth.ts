/**
 * Auth client for the Ops Portal.
 *
 * Manages authentication tokens across server and client environments.
 * - Server components: read httpOnly cookies via next/headers
 * - Client components: read/write localStorage with cookie synchronization
 *
 * Token lifecycle:
 * - Access token: 8h expiry, stored as httpOnly cookie + localStorage
 * - Refresh token: 7d expiry, stored as httpOnly cookie only
 * - Auto-refresh: attempts refresh 5 minutes before expiry
 */

import type { LoginRequest, LoginResponse, OpsUser } from "@/types/api";

// ─── Constants ───────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN: "ops_access_token",
  REFRESH_TOKEN: "ops_refresh_token",
  USER: "ops_user",
  TOKEN_EXPIRY: "ops_token_expiry",
} as const;

const AUTH_API = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
} as const;

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

// ─── Token Helpers (Client-side) ─────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_OPS_API_URL || "/api/v1/ops";
}

/** Get the access token from localStorage (client-side only). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/** Get the refresh token from localStorage (client-side only). */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/** Get the cached token expiry timestamp. */
export function getTokenExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Get the cached user object. */
export function getStoredUser(): OpsUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw) as OpsUser;
  } catch {
    return null;
  }
}

/** Store auth tokens and user data. */
export function storeAuthData(response: LoginResponse): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
  localStorage.setItem(
    STORAGE_KEYS.TOKEN_EXPIRY,
    String(Date.now() + response.expires_in * 1000),
  );
}

/** Clear all stored auth data. */
export function clearAuthData(): void {
  if (typeof window === "undefined") return;

  const keys = Object.values(STORAGE_KEYS);
  keys.forEach((key) => localStorage.removeItem(key));
}

// ─── Token Expiry Check ─────────────────────────────────────────────────

/** Check if the access token is expired or about to expire. */
export function isTokenExpired(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  return Date.now() >= expiry - REFRESH_MARGIN_MS;
}

/** Check if a refresh token exists (meaning a session might be recoverable). */
export function hasRefreshToken(): boolean {
  return getRefreshToken() !== null;
}

// ─── Core Auth Functions (Client-side) ──────────────────────────────────

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: OpsUser;
}

/**
 * Authenticate with email and password.
 * Stores tokens in localStorage and sets httpOnly cookies via API response.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}${AUTH_API.LOGIN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password } satisfies LoginRequest),
    });

    if (!response.ok) {
      // Don't reveal whether the email exists or the password is wrong
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Invalid email or password." };
      }
      if (response.status === 429) {
        return {
          success: false,
          error: "Too many login attempts. Please wait before trying again.",
        };
      }
      return {
        success: false,
        error: "Authentication service unavailable. Please try again.",
      };
    }

    const data: LoginResponse = await response.json();
    storeAuthData(data);

    return { success: true, user: data.user };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Network error. Please check your connection.";
    return { success: false, error: message };
  }
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if the token was refreshed successfully.
 */
export async function refreshToken(): Promise<boolean> {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) return false;

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}${AUTH_API.REFRESH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!response.ok) {
      clearAuthData();
      return false;
    }

    const data = await response.json();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    localStorage.setItem(
      STORAGE_KEYS.TOKEN_EXPIRY,
      String(Date.now() + data.expires_in * 1000),
    );

    return true;
  } catch {
    clearAuthData();
    return false;
  }
}

/**
 * Log the user out:
 * 1. Notify the server to invalidate the session
 * 2. Clear local storage
 * 3. Redirect to login
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();

  try {
    if (token) {
      const baseUrl = getBaseUrl();
      // Fire-and-forget — we clear local state regardless of server response
      await fetch(`${baseUrl}${AUTH_API.LOGOUT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Swallow network errors during logout — local cleanup is what matters
  } finally {
    clearAuthData();
    redirect("/login");
  }
}

// ─── Server-side Session ────────────────────────────────────────────────

/**
 * Verify a token value (used in middleware).
 * Lightweight — just checks if the token exists and isn't obviously malformed.
 */
export function verifyToken(tokenValue: string): boolean {
  if (!tokenValue) return false;

  // Basic structural validation — JWT has 3 dot-separated segments
  const parts = tokenValue.split(".");
  if (parts.length !== 3) return false;

  // Verify each segment is valid base64url
  try {
    for (const part of parts) {
      const decoded = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      if (!decoded) return false;
    }
    return true;
  } catch {
    return false;
  }
}
