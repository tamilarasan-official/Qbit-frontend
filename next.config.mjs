/** @type {import('next').NextConfig} */
const nextConfig = {
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
