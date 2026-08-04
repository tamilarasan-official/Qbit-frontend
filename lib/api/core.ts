/**
 * A minimal client that presents the same surface as supabase-js, backed by the
 * qbitio API instead of Supabase.
 *
 * The point of matching the surface is that ~200 call sites across 78 page
 * files already use `.from('x').select().eq()`, `.rpc()`, `.auth.getUser()` and
 * `.storage.from()`. Reimplementing those four shapes here means none of that
 * code has to change.
 *
 * Behavioural contract worth preserving: supabase-js resolves to
 * `{ data, error }` and does NOT throw on a failed query. Every page here
 * checks `if (error)`, so throwing would break error handling everywhere.
 */

export interface ApiError {
  message: string
  code: string
  details?: unknown
}

export interface Result<T> {
  data: T
  error: ApiError | null
  count: number | null
  status: number
}

export const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000'

/**
 * Where BROWSER requests go. Server-side code keeps using API_URL directly.
 *
 * Sign-in runs as a Server Action: the Next server calls the API, and
 * `persistSessionCookies` in app/login/actions.ts re-issues the returned
 * session as a cookie on the PORTAL's origin. The browser therefore never
 * holds a cookie for the API's hostname, so a client-side fetch straight to
 * `https://api.edutou.in` sends no credentials however `credentials:
 * 'include'` is set, and every such call comes back 401 UNAUTHENTICATED.
 *
 * Routing browser calls through a path on the portal's own origin -- proxied
 * to the API by the rewrite in next.config.mjs -- makes them first-party, so
 * the cookie that already exists is attached and Next forwards it upstream.
 * That also keeps this working in Safari and on iOS, which block third-party
 * cookies outright and would defeat any cross-site arrangement.
 *
 * Set NEXT_PUBLIC_API_PROXY_PATH to '' to opt out and call the API directly --
 * correct only when the portal and the API share a registrable domain.
 */
const configuredProxyPath =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_PROXY_PATH : undefined

export const API_PROXY_PATH =
  configuredProxyPath === undefined ? '/backend' : configuredProxyPath.trim()

/**
 * The base a fetch should use from wherever it is running. Client Components
 * that fetch during SSR still get an absolute URL, which server-side `fetch`
 * requires -- a relative one would throw.
 */
export function apiBase(): string {
  if (typeof window === 'undefined') return API_URL
  return API_PROXY_PATH || API_URL
}

type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in'

interface Filter {
  column: string
  op: FilterOp
  value: unknown
  negate?: boolean
}

interface OrderTerm {
  column: string
  ascending: boolean
  nullsFirst?: boolean
}

export interface Fetcher {
  (path: string, init?: RequestInit): Promise<Response>
}

/**
 * Request headers for an API call.
 *
 * A FormData body must go out with NO explicit content-type. multipart needs a
 * `boundary` parameter that is generated per request, and only the runtime
 * sending the body knows it -- naming the type by hand drops the boundary and
 * the server cannot parse what arrives (MALFORMED_BODY). Callers used to signal
 * this by passing `headers: {}`, which cannot work: spreading an empty object
 * does not remove a key the object literal already set.
 */
export function apiHeaders(
  init: RequestInit,
  extra?: Record<string, string>
): Record<string, string> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  return {
    ...(isFormData ? {} : { 'content-type': 'application/json' }),
    ...extra,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  }
}

/**
 * Default transport. `credentials: 'include'` is what carries the httpOnly
 * session cookie; without it every request would be anonymous.
 */
export function browserFetcher(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: apiHeaders(init),
  })
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

/**
 * Thenable so `await supabase.from('x').select()` works. The request is only
 * sent when the builder is awaited, which is what lets filters accumulate
 * across chained calls.
 */
class QueryBuilder<T = any> implements PromiseLike<Result<T>> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private selectClause: string | undefined
  private readonly filters: Filter[] = []
  private readonly orderTerms: OrderTerm[] = []
  private limitValue: number | undefined
  private offsetValue: number | undefined
  private cardinality: 'many' | 'single' | 'maybe' = 'many'
  private values: unknown
  private wantCount = false
  private headOnly = false
  private returning = true
  private ignoreDuplicates = false
  private negateNext = false

  constructor(
    private readonly table: string,
    private readonly fetcher: Fetcher
  ) {}

  // -- verbs ---------------------------------------------------------------

  select(clause = '*', options?: { count?: 'exact' | null; head?: boolean }): this {
    // `.select()` after insert/update/delete means "return the rows", it does
    // not switch the operation back to a read.
    if (this.op === 'select') this.op = 'select'
    this.selectClause = clause
    if (options?.count === 'exact') this.wantCount = true
    if (options?.head) this.headOnly = true
    return this
  }

  insert(values: unknown, options?: { ignoreDuplicates?: boolean }): this {
    this.op = 'insert'
    this.values = values
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false
    // supabase-js does not return rows from insert unless .select() is chained.
    this.returning = true
    return this
  }

  /**
   * Approximated with insert + ignoreDuplicates. Nothing in this codebase calls
   * upsert today; it exists so a future call site does not silently no-op.
   */
  upsert(values: unknown): this {
    this.op = 'insert'
    this.values = values
    this.ignoreDuplicates = true
    return this
  }

  update(values: unknown): this {
    this.op = 'update'
    this.values = values
    return this
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  // -- filters -------------------------------------------------------------

  private addFilter(column: string, op: FilterOp, value: unknown): this {
    this.filters.push({ column, op, value, negate: this.negateNext })
    this.negateNext = false
    return this
  }

  eq(column: string, value: unknown): this {
    return this.addFilter(column, 'eq', value)
  }
  neq(column: string, value: unknown): this {
    return this.addFilter(column, 'neq', value)
  }
  gt(column: string, value: unknown): this {
    return this.addFilter(column, 'gt', value)
  }
  gte(column: string, value: unknown): this {
    return this.addFilter(column, 'gte', value)
  }
  lt(column: string, value: unknown): this {
    return this.addFilter(column, 'lt', value)
  }
  lte(column: string, value: unknown): this {
    return this.addFilter(column, 'lte', value)
  }
  like(column: string, pattern: string): this {
    return this.addFilter(column, 'like', pattern)
  }
  ilike(column: string, pattern: string): this {
    return this.addFilter(column, 'ilike', pattern)
  }
  is(column: string, value: null | boolean): this {
    return this.addFilter(column, 'is', value)
  }
  in(column: string, values: readonly unknown[]): this {
    return this.addFilter(column, 'in', [...values])
  }

  /** `.not('col', 'is', null)` -- negates the next filter. */
  not(column: string, op: FilterOp, value: unknown): this {
    this.negateNext = true
    return this.addFilter(column, op, value)
  }

  /** Generic escape hatch: `.filter('col', 'eq', value)`. */
  filter(column: string, op: FilterOp, value: unknown): this {
    return this.addFilter(column, op, value)
  }

  // -- shaping -------------------------------------------------------------

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orderTerms.push({
      column,
      ascending: options?.ascending ?? true,
      ...(options?.nullsFirst === undefined ? {} : { nullsFirst: options.nullsFirst }),
    })
    return this
  }

  limit(count: number): this {
    this.limitValue = count
    return this
  }

  range(from: number, to: number): this {
    this.offsetValue = from
    this.limitValue = to - from + 1
    return this
  }

  single(): this {
    this.cardinality = 'single'
    return this
  }

  maybeSingle(): this {
    this.cardinality = 'maybe'
    return this
  }

  // -- execution -----------------------------------------------------------

  private buildBody(): Record<string, unknown> {
    return {
      table: this.table,
      op: this.op,
      select: this.selectClause,
      filters: this.filters,
      order: this.orderTerms,
      limit: this.headOnly ? 1 : this.limitValue,
      offset: this.offsetValue,
      cardinality: this.cardinality,
      values: this.values,
      returning: this.returning,
      count: this.wantCount,
      ignoreDuplicates: this.ignoreDuplicates,
    }
  }

  private async execute(): Promise<Result<T>> {
    try {
      const response = await this.fetcher('/api/db', {
        method: 'POST',
        body: JSON.stringify(this.buildBody()),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        data?: unknown
        count?: number | null
        error?: ApiError
      }

      if (!response.ok) {
        return {
          data: (payload.data ?? null) as T,
          error: payload.error ?? { message: response.statusText, code: 'HTTP_ERROR' },
          count: null,
          status: response.status,
        }
      }

      // head:true means the caller only wanted the count.
      const data = this.headOnly ? (null as T) : ((payload.data ?? null) as T)

      return {
        data,
        error: null,
        count: payload.count ?? null,
        status: response.status,
      }
    } catch (err) {
      // Network failure. Matches supabase-js: resolve with an error, do not throw.
      return {
        data: null as T,
        error: {
          message: err instanceof Error ? err.message : 'Network request failed',
          code: 'NETWORK_ERROR',
        },
        count: null,
        status: 0,
      }
    }
  }

  then<R1 = Result<T>, R2 = never>(
    onFulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onFulfilled, onRejected)
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export interface UploadedFile {
  /** Storage key, e.g. `<userId>/<taskId>/<stepId>/<generated>.pdf`. */
  path: string
  /** Canonical URL. Store this; it does not expire. */
  publicUrl: string
  /** Ready to hand to the browser now, so a just-uploaded file can be previewed. */
  signedUrl?: string
  /** Unix seconds. */
  signedUrlExpiresAt?: number
  /** Size of what was STORED, which is not the size that was sent when an image was re-encoded. */
  size?: number
  /** Type of what was stored -- `image/webp` for anything the API re-encoded. */
  mimeType?: string
  originalName?: string
  /** How the API compressed it. `applied: false` means the original was kept. */
  compression?: {
    applied: boolean
    originalSize: number
    storedSize: number
    width?: number
    height?: number
    reason?: string
  }
}

class StorageBucket {
  constructor(
    private readonly bucket: string,
    private readonly fetcher: Fetcher
  ) {}

  /**
   * `path` is accepted for call-site compatibility but the server decides the
   * final key -- it derives the directory from the authenticated user and
   * generates the filename. A client-chosen path was how the old code let one
   * user write into another user's folder.
   */
  async upload(
    path: string,
    file: File | Blob,
    _options?: { cacheControl?: string; upsert?: boolean }
  ): Promise<{ data: UploadedFile | null; error: ApiError | null }> {
    try {
      const segments = path.split('/')
      const form = new FormData()
      form.append('file', file)
      // Preserve the task/step grouping the old key encoded.
      if (segments.length >= 3) {
        form.append('taskId', segments[1] ?? '')
        form.append('stepId', segments[2] ?? '')
      }

      // No content-type: apiHeaders() omits it for a FormData body so the
      // browser can set multipart/form-data with its own boundary.
      const response = await this.fetcher(`/api/storage/${this.bucket}`, {
        method: 'POST',
        body: form,
      })

      const payload = (await response.json().catch(() => ({}))) as {
        data?: UploadedFile
        error?: ApiError
      }

      if (!response.ok || !payload.data) {
        return {
          data: null,
          error: payload.error ?? { message: 'Upload failed', code: 'UPLOAD_FAILED' },
        }
      }

      return { data: payload.data, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Upload failed',
          code: 'NETWORK_ERROR',
        },
      }
    }
  }

  /**
   * Synchronous to match supabase-js. Downloads are access-checked server-side,
   * so this URL is only useful to someone entitled to the file.
   *
   * Fine to store, and fine to fetch from application code, which goes through
   * the proxy and carries the session. It is NOT fetchable by the browser on
   * its own -- see createSignedUrl.
   */
  getPublicUrl(path: string): { data: { publicUrl: string } } {
    // Same base as every other browser call: downloads are access-checked, so
    // the URL has to carry the session cookie to resolve to anything.
    return { data: { publicUrl: `${apiBase()}/api/storage/${this.bucket}/${path}` } }
  }

  /**
   * A URL the browser can fetch by itself -- an `<iframe src>`, an `<img src>`,
   * a download anchor, a new tab.
   *
   * Those contexts send no Authorization header, and the session cookie belongs
   * to the PORTAL's hostname rather than the API's, so a raw storage URL comes
   * back 401. This call is made over the authenticated proxy and returns a
   * short-lived signed URL that stands on its own.
   *
   * `path` may be a storage key or a whole stored URL; the API accepts either.
   */
  async createSignedUrl(
    path: string,
    expiresIn?: number
  ): Promise<{ data: { signedUrl: string } | null; error: ApiError | null }> {
    const params = new URLSearchParams({ bucket: this.bucket, path })
    if (expiresIn) params.set('expiresIn', String(expiresIn))

    try {
      const response = await this.fetcher(`/api/storage/sign?${params.toString()}`)
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { signedUrl: string }
        error?: ApiError
      }

      if (!response.ok || !payload.data) {
        return {
          data: null,
          error: payload.error ?? { message: 'Could not sign URL', code: 'SIGN_FAILED' },
        }
      }
      return { data: payload.data, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Could not sign URL',
          code: 'NETWORK_ERROR',
        },
      }
    }
  }

  async remove(paths: string[]): Promise<{ data: unknown; error: ApiError | null }> {
    for (const path of paths) {
      const response = await this.fetcher(`/api/storage/${this.bucket}/${path}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: ApiError }
        return {
          data: null,
          error: payload.error ?? { message: 'Delete failed', code: 'DELETE_FAILED' },
        }
      }
    }
    return { data: { success: true }, error: null }
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string | null
  role?: string
  full_name?: string | null
  avatar_url?: string | null
  /**
   * Free-form, exactly as supabase-js typed it. Callers do
   * `user.user_metadata?.full_name`; a stricter `Record<string, unknown>` would
   * make every one of those reads a type error.
   */
  user_metadata?: Record<string, any>
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  created_at?: string
}

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'
type AuthCallback = (event: AuthEvent, session: { user: AuthUser } | null) => void

const authListeners = new Set<AuthCallback>()

function emitAuth(event: AuthEvent, user: AuthUser | null): void {
  for (const listener of authListeners) {
    try {
      listener(event, user ? { user } : null)
    } catch {
      /* a broken listener must not break the auth flow */
    }
  }
}

class AuthClient {
  constructor(private readonly fetcher: Fetcher) {}

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<{ data: T | null; error: ApiError | null }> {
    try {
      const response = await this.fetcher(path, init)
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & {
        error?: ApiError
      }
      if (!response.ok) {
        return {
          data: null,
          error: payload.error ?? { message: response.statusText, code: 'HTTP_ERROR' },
        }
      }
      return { data: payload as T, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Network request failed',
          code: 'NETWORK_ERROR',
        },
      }
    }
  }

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: ApiError | null }> {
    const { data, error } = await this.request<{ user: AuthUser | null }>('/auth/user')
    return { data: { user: data?.user ?? null }, error }
  }

  /** supabase-js exposed both; both are used in this codebase. */
  async getSession(): Promise<{
    data: { session: { user: AuthUser } | null }
    error: ApiError | null
  }> {
    const { data, error } = await this.getUser()
    return {
      data: { session: data.user ? { user: data.user } : null },
      error,
    }
  }

  async signInWithPassword(credentials: { email: string; password: string }) {
    const result = await this.request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    if (result.data?.user) emitAuth('SIGNED_IN', result.data.user)
    return {
      data: { user: result.data?.user ?? null, session: result.data?.user ? {} : null },
      error: result.error,
    }
  }

  async signUp(params: {
    email: string
    password: string
    options?: { data?: { full_name?: string }; emailRedirectTo?: string }
  }) {
    const result = await this.request<{ user: AuthUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        full_name: params.options?.data?.full_name,
      }),
    })
    if (result.data?.user) emitAuth('SIGNED_IN', result.data.user)
    return {
      data: { user: result.data?.user ?? null, session: result.data?.user ? {} : null },
      error: result.error,
    }
  }

  async signOut() {
    const result = await this.request('/auth/logout', { method: 'POST' })
    emitAuth('SIGNED_OUT', null)
    return { error: result.error }
  }

  /**
   * Full-page redirect into the server-side OAuth flow. The old client-side
   * version handed the provider redirect to Supabase; the exchange now happens
   * server-side so the client secret never reaches the browser.
   */
  async signInWithOAuth(params: { provider: 'google'; options?: unknown }) {
    if (typeof window !== 'undefined') {
      // Absolute, not the proxy path: this is a top-level navigation that ends
      // at Google and comes back to the API's own PUBLIC_URL callback, so it
      // never passes through the portal's rewrite.
      window.location.href = `${API_URL}/auth/oauth/${params.provider}`
    }
    return { data: { provider: params.provider, url: null }, error: null }
  }

  async updateUser(attributes: {
    password?: string
    current_password?: string
    email?: string
    data?: Record<string, unknown>
  }) {
    const result = await this.request<{ user: AuthUser }>('/auth/user', {
      method: 'PATCH',
      body: JSON.stringify(attributes),
    })
    if (result.data?.user) emitAuth('USER_UPDATED', result.data.user)
    return { data: { user: result.data?.user ?? null }, error: result.error }
  }

  async verifyOtp(params: { token_hash: string; type: string }) {
    const result = await this.request<{ user: AuthUser }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return { data: { user: result.data?.user ?? null }, error: result.error }
  }

  /**
   * Kept so app/auth/callback/route.ts still compiles. The server completes the
   * OAuth exchange and sets cookies before redirecting, so by the time any
   * frontend code runs there is nothing left to exchange -- this just reports
   * the resulting session.
   */
  async exchangeCodeForSession(_code: string) {
    const { data, error } = await this.getUser()
    return { data: { user: data.user, session: data.user ? {} : null }, error }
  }

  onAuthStateChange(callback: AuthCallback) {
    authListeners.add(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback)
          },
        },
      },
    }
  }

  /** Refresh the access cookie. Called by middleware on every navigation. */
  async refreshSession() {
    const result = await this.request<{ user: AuthUser }>('/auth/refresh', { method: 'POST' })
    if (result.data?.user) emitAuth('TOKEN_REFRESHED', result.data.user)
    return { data: { user: result.data?.user ?? null }, error: result.error }
  }
}

// ---------------------------------------------------------------------------
// Realtime channel shim
// ---------------------------------------------------------------------------

type ChangeHandler = (payload: { eventType: string; new: any; old: any }) => void

/**
 * Table-change subscription with the supabase-js channel surface.
 *
 * Implemented as its own lightweight socket rather than reusing the
 * QuizRealtimeClient connection, so a page that only needs notifications does
 * not pull in the quiz realtime module.
 */
export class RealtimeChannelShim {
  private socket: WebSocket | null = null
  private readonly bindings: Array<{ table: string; event: string; handler: ChangeHandler }> = []
  private statusCallback: ((status: string) => void) | undefined
  private closed = false

  constructor(private readonly name: string) {}

  on(
    type: 'postgres_changes',
    filter: { event?: string; schema?: string; table?: string },
    handler: ChangeHandler
  ): this {
    if (type === 'postgres_changes' && filter.table) {
      this.bindings.push({
        table: filter.table,
        event: filter.event ?? '*',
        handler,
      })
    }
    return this
  }

  subscribe(callback?: (status: string) => void): this {
    this.statusCallback = callback

    if (typeof window === 'undefined' || this.bindings.length === 0) return this

    // Absolute, not the proxy path: next.config.mjs rewrites do not upgrade a
    // connection, so a WebSocket cannot travel through them. When the API is on
    // a different registrable domain this handshake carries no cookie and the
    // server closes it 4401 -- it needs its own reverse-proxy route on the
    // portal's origin. REST is unaffected either way.
    const socket = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/realtime`)
    this.socket = socket

    socket.onopen = () => {
      for (const binding of this.bindings) {
        socket.send(JSON.stringify({ type: 'subscribe', channel: `table:${binding.table}` }))
      }
      this.statusCallback?.('SUBSCRIBED')
    }

    socket.onmessage = (raw) => {
      let message: { channel?: string; event?: string; payload?: any }
      try {
        message = JSON.parse(raw.data as string)
      } catch {
        return
      }
      if (message.event !== 'postgres_changes' || !message.channel) return

      const table = message.channel.slice('table:'.length)
      for (const binding of this.bindings) {
        if (binding.table !== table) continue
        if (binding.event !== '*' && binding.event !== message.payload?.eventType) continue
        try {
          binding.handler(message.payload)
        } catch (err) {
          console.error('[realtime] channel handler threw', err)
        }
      }
    }

    socket.onclose = () => {
      if (!this.closed) this.statusCallback?.('CLOSED')
    }

    socket.onerror = () => {
      this.statusCallback?.('CHANNEL_ERROR')
    }

    return this
  }

  unsubscribe(): void {
    this.closed = true
    this.socket?.close()
    this.socket = null
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class QbitioClient {
  readonly auth: AuthClient

  constructor(private readonly fetcher: Fetcher = browserFetcher) {
    this.auth = new AuthClient(fetcher)
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this.fetcher)
  }

  async rpc<T = any>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<{ data: T | null; error: ApiError | null }> {
    try {
      const response = await this.fetcher(`/api/rpc/${name}`, {
        method: 'POST',
        body: JSON.stringify(args),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        data?: T
        error?: ApiError
      }
      if (!response.ok) {
        return {
          data: null,
          error: payload.error ?? { message: response.statusText, code: 'HTTP_ERROR' },
        }
      }
      return { data: payload.data ?? null, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Network request failed',
          code: 'NETWORK_ERROR',
        },
      }
    }
  }

  readonly storage = {
    from: (bucket: string) => new StorageBucket(bucket, this.fetcher),
  }

  /**
   * Realtime channel, shaped like supabase-js's so components/platform/Header.tsx
   * keeps working:
   *
   *   supabase.channel('name')
   *     .on('postgres_changes', { event: 'INSERT', table: 'notifications' }, cb)
   *     .subscribe(status => ...)
   *
   * The `schema` option is ignored (there is one schema), and `event`/`table`
   * map onto a server channel of `table:<table>`. Delivery is filtered
   * server-side to users entitled to the row.
   */
  channel(name: string, _options?: unknown): RealtimeChannelShim {
    return new RealtimeChannelShim(name)
  }

  removeChannel(channel: RealtimeChannelShim): void {
    channel.unsubscribe()
  }

  /** Direct access for the endpoints that are not table-shaped (quiz control). */
  async call<T = unknown>(
    path: string,
    init?: RequestInit
  ): Promise<{ data: T | null; error: ApiError | null }> {
    try {
      const response = await this.fetcher(path, init)
      const payload = (await response.json().catch(() => ({}))) as {
        data?: T
        error?: ApiError
      }
      if (!response.ok) {
        return {
          data: null,
          error: payload.error ?? { message: response.statusText, code: 'HTTP_ERROR' },
        }
      }
      return { data: payload.data ?? null, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Network request failed',
          code: 'NETWORK_ERROR',
        },
      }
    }
  }
}
