import { type NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/api/core'

/**
 * Email confirmation / password-recovery link handler.
 *
 * Verifies the one-time token against the API and forwards the resulting
 * session cookies to the browser before redirecting.
 *
 * `next` is validated to be a relative path. Previously it was taken straight
 * from the query string and passed to redirect(), which is an open-redirect:
 * a link ending `?next=https://evil.example` would have bounced a freshly
 * authenticated user off-site.
 */

type OtpType = 'signup' | 'recovery' | 'email_change' | 'email'

const VALID_TYPES: readonly string[] = ['signup', 'recovery', 'email_change', 'email']

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  // Must be a site-relative path. `//host` is protocol-relative, so reject it.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeNext(searchParams.get('next'))

  if (!tokenHash || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/error', origin))
  }

  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token_hash: tokenHash, type: type as OtpType }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return NextResponse.redirect(new URL('/error', origin))
  }

  const redirectResponse = NextResponse.redirect(new URL(next, origin))
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    redirectResponse.headers.append('set-cookie', cookie)
  }

  return redirectResponse
}
