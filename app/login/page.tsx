"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, ArrowLeft, Sun, Moon, BookOpen } from "lucide-react"
import { login, signup } from './actions'
import { useTheme } from "@/contexts/ThemeContext"
import { createClient } from "@/utils/supabase/client"
import { BrandWordmark } from "@/components/brand/Logo"
import { brand } from "@/lib/brand"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentView, setCurrentView] = useState<"login" | "register" | "forgot">("login")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // User is logged in, check their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          const role = profile?.role?.toLowerCase() || 'student'

          // Redirect based on role
          switch (role) {
            case 'admin':
              router.push('/admin')
              break
            case 'mentor':
              router.push('/mentor')
              break
            case 'student':
            default:
              router.push('/')
              break
          }
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const getThemeIcon = () =>
    theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formElement = e.currentTarget
    const formData = new FormData(formElement)

    try {
      if (currentView === "login") {
        await login(formData)
      } else if (currentView === "register") {
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }

        await signup(formData)
      } else if (currentView === "forgot") {
        // Handle forgot password
        const email = formData.get('email') as string
        if (!email) {
          setError("Email is required")
          setLoading(false)
          return
        }
        // Password reset is not implemented yet. The backend has the pieces
        // (one_time_tokens + POST /auth/verify-otp with type 'recovery'), but
        // nothing sends the email, so this cannot silently pretend to work.
        setError('Password reset is not available yet — please contact your admin.')
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setGoogleLoading(true)

      // Get the current URL origin for redirect
      const redirectTo = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
      // Note: If successful, the user will be redirected to Google
      // so we don't need to set loading to false
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
      setGoogleLoading(false)
    }
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-brand-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex font-sans relative">
      {/* Theme Toggle Button - Top Right */}
      <button
        onClick={cycleTheme}
        className="pill-chrome fixed top-6 right-6 z-50 p-3 text-foreground transition-all hover:scale-105"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {getThemeIcon()}
      </button>

      {/*
        The panel used to play a stock fire video streamed from pexels.com --
        off-brand, and a third-party request on the sign-in page. It is now the
        ink surface with the lime bloom the marketing site uses.
      */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(38rem 38rem at 18% 12%, hsl(var(--brand) / 0.30), transparent 62%), radial-gradient(30rem 30rem at 88% 92%, hsl(var(--brand) / 0.16), transparent 60%)',
          }}
        />
        {/* Faint grid, so the panel has texture without an image. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full px-14 py-14">
          <div className="flex items-center gap-4">
            <img
              src={brand.logo.wordmarkDark}
              alt={brand.displayName}
              className="h-9 w-auto select-none"
            />
            <span className="h-8 w-px bg-white/20" aria-hidden="true" />
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/70">
              {brand.partner}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-[3.4rem] font-extrabold text-white leading-[1.05] tracking-tight">
              Learn by
              <br />
              <span className="text-brand-400">building things.</span>
            </h2>
            <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-md">
              Tasks from your mentor, live quizzes with your batch, and a
              leaderboard that actually keeps score.
            </p>

            <div className="mt-10 flex flex-wrap gap-2.5">
              {['Mentor-assigned tasks', 'Live quizzes', 'Leaderboard', 'Hackathons'].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/40">{brand.tagline}</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background transition-colors duration-300">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <BrandWordmark className="mx-auto mb-3 h-10" priority />
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {brand.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center">
              {currentView === "forgot" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentView("login")}
                  className="absolute left-8 top-8 rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
                {currentView ==="login" &&"Welcome back"}
                {currentView ==="register" &&"Create account"}
                {currentView ==="forgot" &&"Reset your password"}
              </h2>
              <p className="text-muted-foreground">
                {currentView === "login" && "Sign in to continue your learning journey."}
                {currentView ==="register" &&"Set a password and get started."}
                {currentView === "forgot" && "Enter your email address and we'll send you a reset link."}
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-3.5 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {currentView === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@company.com"
                  required
                  className="h-12"
                />
              </div>

              {currentView !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {currentView === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              disabled={loading}
              className="w-full h-12 text-base"
            >
              {loading ? (currentView ==="login" ?"Signing you in…" : currentView ==="register" ?"Creating your account…" :"Sending…") : (
                <>
                  {currentView ==="login" &&"Sign in"}
                  {currentView ==="register" &&"Create account"}
                  {currentView ==="forgot" &&"Send reset link"}
                </>
              )}
            </Button>

            {currentView !== "forgot" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full bg-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground">
                      or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!googleLoading && (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {googleLoading ?"Opening Google…" :"Continue with Google"}
                </Button>
              </>
            )}

            <div className="text-center text-sm text-muted-foreground">
              {currentView === "login" && (
                <>
                  New here?{""}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-brand-700 dark:text-brand-400 underline underline-offset-4"
                    onClick={() => setCurrentView("register")}
                  >
                    Create an account
                  </Button>
                </>
              )}
              {currentView === "register" && (
                <>
                  Already have an account?{""}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-brand-700 dark:text-brand-400 underline underline-offset-4"
                    onClick={() => setCurrentView("login")}
                  >
                    Sign in
                  </Button>
                </>
              )}
              {currentView === "forgot" && (
                <>
                  Remembered your password?{""}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-brand-700 dark:text-brand-400 underline underline-offset-4"
                    onClick={() => setCurrentView("login")}
                  >
                    Back to sign in
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
