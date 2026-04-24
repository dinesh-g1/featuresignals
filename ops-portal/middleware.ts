import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login'];

/**
 * Middleware to protect Ops Portal routes.
 *
 * - Allows unauthenticated access to /login only.
 * - All other routes require a valid ops_access_token cookie.
 * - Redirects to /login with the original URL as a redirect parameter.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip middleware for static assets, Next.js internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.svg'
  ) {
    return NextResponse.next();
  }

  // Check for access token cookie
  const token = request.cookies.get('ops_access_token');

  if (!token?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic structural validation — JWT has 3 dot-separated segments
  const parts = token.value.split('.');
  if (parts.length !== 3) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate each segment is base64url-encoded
  try {
    for (const part of parts) {
      const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      if (!decoded) {
        throw new Error('Invalid base64url segment');
      }
    }
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.svg (logo file)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
};
