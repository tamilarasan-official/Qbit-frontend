import { NextResponse, type NextRequest } from 'next/server'
import { API_URL } from '@/lib/api/core'

/**
 * Session refresh + role-based redirects, run on every matched request.
 *
 * Two changes from the Supabase version worth knowing about:
 *
 * 1. The old middleware issued a `profiles` SELECT on EVERY request to read the
 *    user's role -- a database round trip on the critical path of every page
 *    load and every navigation. The role now travels in the signed access
 *    token, so the backend answers this from the JWT.
 *
 * 2. Redirects here are UX only, exactly as before. They are not a security
 *    boundary and never were: the API enforces authorization independently, so
 *    bypassing this middleware gains an attacker nothing.
 */

interface SessionUser {
  id: string
  email: string | null
  role?: string
}

const PUBLIC_PREFIXES = ['/login', '/auth', '/error']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/** Copy Set-Cookie headers from an API response onto the Next response. */
function forwardCookies(from: Response, to: NextResponse): void {
  const setCookie = from.headers.getSetCookie?.() ?? []
  for (const cookie of setCookie) {
    to.headers.append('set-cookie', cookie)
  }
}

async function loadUser(
  request: NextRequest
): Promise<{ user: SessionUser | null; upstream: Response | null }> {
  const cookie = request.headers.get('cookie') ?? ''

  const attempt = (path: string, method: 'GET' | 'POST') =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: { cookie, 'content-type': 'application/json' },
      cache: 'no-store',
    })

  try {
    const response = await attempt('/auth/user', 'GET')
    if (response.ok) {
      const payload = (await response.json()) as { user: SessionUser | null }
      if (payload.user) return { user: payload.user, upstream: null }
    }

    // Access token missing or expired -- try the refresh token once. This is
    // what keeps a user signed in past the 15-minute access token lifetime.
    const refreshed = await attempt('/auth/refresh', 'POST')
    if (refreshed.ok) {
      const payload = (await refreshed.clone().json()) as { user: SessionUser | null }
      return { user: payload.user, upstream: refreshed }
    }

    return { user: null, upstream: null }
  } catch {
    // API unreachable. Fail closed on protected routes rather than letting an
    // outage act as an authentication bypass.
    return { user: null, upstream: null }
  }
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const { user, upstream } = await loadUser(request)

  const withCookies = (response: NextResponse): NextResponse => {
    if (upstream) forwardCookies(upstream, response)
    return response
  }

  if (!user) {
    if (isPublicPath(pathname)) return withCookies(NextResponse.next({ request }))

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withCookies(NextResponse.redirect(url))
  }

  const role = user.role?.toLowerCase() ?? 'student'

  const redirectTo = (target: string): NextResponse => {
    const url = request.nextUrl.clone()
    url.pathname = target
    return withCookies(NextResponse.redirect(url))
  }

  // Mentors land on their own dashboard; admins and students stay on '/'.
  if (pathname === '/' && role === 'mentor') return redirectTo('/mentor')

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return redirectTo(role === 'mentor' ? '/mentor' : '/')
  }

  if (pathname.startsWith('/mentor') && role !== 'admin' && role !== 'mentor') {
    return redirectTo('/')
  }

  if (pathname.startsWith('/coursemaster') && role !== 'admin' && role !== 'coursemaster') {
    return redirectTo('/')
  }

  return withCookies(NextResponse.next({ request }))
}
