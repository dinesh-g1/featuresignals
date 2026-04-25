/**
 * Server-only auth helpers for the Ops Portal.
 *
 * These functions use `next/headers` (Server Components only) and should
 * never be imported from a Client Component.
 *
 * @remarks
 * If you need auth in a Client Component, import from `@/lib/auth` instead.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface ServerSession {
  userId: string;
  email: string;
  role: "admin" | "support" | "billing" | "read-only";
}

/**
 * Reads the ops_access_token from httpOnly cookies.
 * Returns null if no token is present (user not logged in).
 */
export function getServerToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("ops_access_token")?.value ?? null;
}

/**
 * Reads the ops_refresh_token from httpOnly cookies.
 * Returns null if no refresh token is present.
 */
export function getServerRefreshToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("ops_refresh_token")?.value ?? null;
}

/**
 * Validates the session by checking for the presence of an access token.
 * This is a lightweight check – it does NOT verify the JWT signature
 * (that happens on the API server side).
 *
 * Returns the session info if valid, null otherwise.
 */
export function getServerSession(): ServerSession | null {
  const token = getServerToken();
  if (!token) return null;

  try {
    // Decode the JWT payload (without verifying signature – that's done server-side).
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf-8"),
    );
    return {
      userId: payload.user_id ?? payload.sub,
      email: payload.email,
      role: payload.role ?? "read-only",
    };
  } catch {
    return null;
  }
}

/**
 * Protects a server component route.
 * Redirects to /login if no valid session is found.
 */
export function requireAuth(): ServerSession {
  const session = getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
