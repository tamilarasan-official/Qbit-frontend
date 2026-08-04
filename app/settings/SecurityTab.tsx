"use client"

import { useState, useEffect } from "react"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"

export function SecurityTab() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [authProvider, setAuthProvider] = useState<string | null>(null)

    const supabase = createClient()

    // Check authentication provider
    useEffect(() => {
        const checkAuthProvider = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Check the provider from app_metadata or user metadata
                    const provider = user.app_metadata?.provider ||
                                   user.identities?.[0]?.provider ||
                                   'email'
                    setAuthProvider(provider)
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            }
        }

        checkAuthProvider()
    }, [])

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'All fields are required' })
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' })
            return
        }

        // 8, matching the API. At 6 the request left here and came back as a
        // flat"Invalid update".
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
            return
        }

        if (currentPassword === newPassword) {
            setMessage({ type: 'error', text: 'New password must be different from current password' })
            return
        }

        setLoading(true)

        try {
            // The API re-authenticates the change itself: it rejects a password
            // update that does not carry the current one, so that a stolen
            // session cannot lock the real owner out. Sending it was missing
            // here, which failed every attempt with"Current password is
            // incorrect" no matter what was typed.
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
                current_password: currentPassword,
            })

            if (updateError) {
                setMessage({ type: 'error', text: updateError.message })
            } else {
                setMessage({ type: 'success', text: 'Password updated successfully!' })
                // Clear form
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' })
            console.error('Password update error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-border rounded-xl shadow-sm bg-card">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Security Settings</CardTitle>
                <CardDescription className="text-muted-foreground">Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
                {/* Password Section */}
                <div className="space-y-4 sm:space-y-5">
                    <h3 className="font-semibold text-foreground text-base sm:text-lg">Password</h3>

                    {authProvider === 'google' ? (
                        // Google Auth User
                        <div className="p-5 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-brand-700 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-brand-900 dark:text-brand-200 mb-1">
                                        Connected with Google
                                    </h4>
                                    <p className="text-sm text-brand-800 dark:text-brand-300">
                                        Your account is authenticated through Google. Password management is handled by your Google account.
                                    </p>
                                    <p className="text-xs text-brand-700 dark:text-brand-400 mt-2">
                                        To change your password, please visit your Google Account settings.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Email Auth User - Show Password Form
                        <form onSubmit={handlePasswordUpdate} className="space-y-4 sm:space-y-5">
                            {message && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 ${
                                    message.type === 'success'
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className={`text-sm ${
                                        message.type === 'success'
                                            ? 'text-green-700 dark:text-green-300'
                                            : 'text-red-700 dark:text-red-300'
                                    }`}>
                                        {message.text}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="currentPassword" className="text-sm font-medium text-muted-foreground">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={showCurrentPassword ? "text" : "password"}
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        disabled={loading}
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="newPassword" className="text-sm font-medium text-muted-foreground">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        disabled={loading}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Password must be at least 6 characters long
                                </p>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="gap-2 bg-gradient-to-r from-brand-300 to-brand-400 hover:from-brand-400 hover:to-brand-500 dark:from-brand-300 dark:to-brand-400 dark:hover:from-brand-300 dark:hover:to-brand-400 text-black rounded-xl"
                            >
                                <Lock className="w-4 h-4" />
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Active Sessions Section */}
                <div className="space-y-4 sm:space-y-5">
                    <h3 className="font-semibold text-foreground text-base sm:text-lg">Active Sessions</h3>
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 bg-muted/50 border border-gray-200 dark:border-slate-600 rounded-xl">
                            <div className="flex-1">
                                <div className="font-medium text-foreground text-sm sm:text-base">Current Session</div>
                                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    {authProvider === 'google' ? 'Authenticated via Google' : 'Email Authentication'}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last active: Now</div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg px-3 self-start sm:self-auto">
                                Current
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
