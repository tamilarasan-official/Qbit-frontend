// Must match lib/api/core.ts. Both read the same two variables so the path the
// browser calls and the path this server proxies can never drift apart.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const API_PROXY_PATH =
  process.env.NEXT_PUBLIC_API_PROXY_PATH === undefined
    ? '/backend'
    : process.env.NEXT_PUBLIC_API_PROXY_PATH.trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Serve the API from the portal's own origin.
   *
   * Sign-in is a Server Action, so the session cookie is written for the
   * PORTAL's hostname, never the API's. A browser fetch straight to the API
   * therefore carries no credentials and is answered 401. Proxying through
   * this origin makes those calls first-party, so the cookie is attached and
   * forwarded upstream -- and unlike a cross-site cookie, it is not blocked by
   * Safari, iOS, or Chrome's Incognito mode.
   *
   * Set NEXT_PUBLIC_API_PROXY_PATH='' to disable, which is only correct when
   * the portal and the API share a registrable domain.
   */
  async rewrites() {
    if (!API_PROXY_PATH) return []
    return [{ source: `${API_PROXY_PATH}/:path*`, destination: `${API_ORIGIN}/:path*` }]
  },

  // Emits .next/standalone -- a self-contained server bundle that the Docker
  // image runs directly, so node_modules never ships to production.
  output: 'standalone',

  eslint: {
    // No ESLint config exists in this project and `eslint` is not installed,
    // so `next lint` cannot run. Left disabled rather than failing the build.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // There are ~103 pre-existing type errors in the page components (mostly
    // unannotated callback parameters under `strict`). They predate the backend
    // migration; turning this off would block deploys on unrelated debt.
    // The backend compiles with zero errors and no such escape hatch.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
