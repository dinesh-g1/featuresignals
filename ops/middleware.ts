// ops/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js middleware for ops portal authentication.
 *
 * This provides server-side route protection for the ops portal.
 * Client-side protection is handled by the AuthGuard component.
 *
 * The middleware checks for the presence of an ops portal token
 * stored in a cookie. Token validation is done by the Go API server
 * when making actual API requests.
 */

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico']

// Paths that require @featuresignals.com domain email
const OPS_PATHS = [
  '/dashboard',
  '/environments',
  '/customers',
  '/licenses',
  '/sandboxes',
  '/financial',
  '/audit',
  '/ops-users',
  '/observability'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if this is an ops portal path
  const isOpsPath = OPS_PATHS.some(path => pathname.startsWith(path))

  // For non-ops paths, allow access
  if (!isOpsPath) {
    return NextResponse.next()
  }

  // Get the ops token from cookies
  const opsToken = request.cookies.get('ops_token')?.value

  // If no token, redirect to login
  if (!opsToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token exists, allow the request
  // Note: We don't validate the token here - that's done by the Go API
  // when the client makes requests. This just provides basic server-side
  // protection against unauthenticated access to protected pages.

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handled by Go server)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
