'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { API_URL } from '@/lib/api/core'

/**
 * Login and signup server actions.
 *
 * These talk to the API directly rather than through the shared client, because
 * they need the Set-Cookie headers from the auth response written onto the
 * browser's cookie jar -- something only a Server Action or Route Handler can do.
 *
 * Exported signatures are unchanged, so app/login/page.tsx needs no edits.
 */

interface AuthResponse {
  user?: { id: string; email: string | null; role?: string }
  error?: { message: string; code: string }
}

/**
 * Forward the API's session cookies onto the outgoing response.
 * Next's cookies() store is writable inside a Server Action.
 */
async function persistSessionCookies(response: Response): Promise<void> {
  const store = await cookies()
  const setCookies = response.headers.getSetCookie?.() ?? []

  for (const raw of setCookies) {
    const [pair, ...attributes] = raw.split(';')
    const separator = pair?.indexOf('=') ?? -1
    if (!pair || separator === -1) continue

    const name = pair.slice(0, separator).trim()
    const value = decodeURIComponent(pair.slice(separator + 1).trim())

    const lower = attributes.map((a) => a.trim().toLowerCase())
    const maxAgeAttr = lower.find((a) => a.startsWith('max-age='))

    store.set(name, value, {
      httpOnly: lower.includes('httponly'),
      secure: lower.includes('secure'),
      sameSite: 'lax',
      path: '/',
      ...(maxAgeAttr ? { maxAge: Number(maxAgeAttr.split('=')[1]) } : {}),
    })
  }
}

function destinationFor(role: string | undefined): string {
  const normalised = role?.toLowerCase()
  if (normalised === 'mentor') return '/mentor'
  if (normalised === 'admin') return '/admin'
  if (normalised === 'coursemaster') return '/coursemaster'
  return '/'
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as AuthResponse

  if (!response.ok || !payload.user) {
    throw new Error(payload.error?.message ?? 'Invalid login credentials')
  }

  await persistSessionCookies(response)
  revalidatePath('/', 'layout')

  // redirect() throws internally, so it must sit outside any try/catch.
  redirect(destinationFor(payload.user.role))
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('name') as string

  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as AuthResponse

  if (!response.ok || !payload.user) {
    throw new Error(payload.error?.message ?? 'Failed to create user')
  }

  await persistSessionCookies(response)
  revalidatePath('/', 'layout')

  // New accounts are always students; the trigger sets the role.
  redirect(destinationFor(payload.user.role))
}
