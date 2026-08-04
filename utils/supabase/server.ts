import { cookies } from 'next/headers'
import { QbitioClient, API_URL, apiHeaders, type Fetcher } from '@/lib/api/core'

/**
 * Server-side client for Server Components, Route Handlers and Server Actions.
 *
 * A server-side fetch has no browser cookie jar, so the incoming request's
 * cookies are forwarded explicitly. Without this the API would treat every
 * server-rendered request as anonymous.
 *
 * The signature is unchanged from the Supabase version -- still async, so
 * `const supabase = await createClient()` at every call site still compiles.
 */
export async function createClient(): Promise<QbitioClient> {
  const cookieStore = await cookies()

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join('; ')

  const serverFetcher: Fetcher = (path, init = {}) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: apiHeaders(init, cookieHeader ? { cookie: cookieHeader } : undefined),
      // Auth-dependent responses must never land in Next's data cache.
      cache: 'no-store',
    })

  return new QbitioClient(serverFetcher)
}
