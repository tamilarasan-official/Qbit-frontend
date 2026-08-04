import { QbitioClient, browserFetcher } from '@/lib/api/core'

/**
 * Browser-side client.
 *
 * The path and function name are unchanged from the Supabase version so the
 * ~78 files doing `import { createClient } from '@/utils/supabase/client'`
 * keep working untouched.
 *
 * One instance is reused per tab. The old code called createBrowserClient() on
 * every render of every component and relied on supabase-js deduplicating it
 * internally; here the instance is simply held.
 */
let client: QbitioClient | undefined

export function createClient(): QbitioClient {
  if (!client) client = new QbitioClient(browserFetcher)
  return client
}

export type { QbitioClient }
