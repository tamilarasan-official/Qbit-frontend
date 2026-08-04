import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - backend (the API proxy -- see below)
     * Feel free to modify this pattern to include more paths.
     *
     * `backend` is the rewrite target from next.config.mjs, and it must stay
     * excluded. This middleware answers an unauthenticated request with a 302
     * to /login, which an XHR would follow and then fail to parse; the client
     * needs the API's own 401 JSON. It also calls /auth/user on every matched
     * request, which would double the upstream traffic for no benefit. Keep
     * this literal in step with NEXT_PUBLIC_API_PROXY_PATH -- a matcher has to
     * be statically analysable, so it cannot read the variable.
     */
    '/((?!_next/static|_next/image|favicon.ico|backend/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}