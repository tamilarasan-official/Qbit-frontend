import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * OAuth landing route.
 *
 * The token exchange now happens entirely on the backend
 * (GET /auth/oauth/google/callback), which sets the session cookies and
 * redirects straight to the role's home page. In the normal flow the browser
 * no longer reaches this route at all.
 *
 * It is kept because email-confirmation links generated before the migration
 * point here, and because `emailRedirectTo` in the signup flow still names it.
 * All it does now is read the established session and forward appropriately.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))
    }

    // Profile creation is handled by the on_user_created database trigger, so
    // the old "profile missing (PGRST116), insert one" branch is gone.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role?.toLowerCase() ?? 'student'

    if (role === 'admin') return NextResponse.redirect(new URL('/admin', requestUrl.origin))
    if (role === 'mentor') return NextResponse.redirect(new URL('/mentor', requestUrl.origin))
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin))
  }
}
