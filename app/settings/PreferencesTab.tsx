'use client';

import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/contexts/ThemeContext"

export function PreferencesTab() {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="border-border rounded-xl shadow-sm bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-foreground">Application Preferences</CardTitle>
        <CardDescription className="text-muted-foreground">Customize your application experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Appearance</h3>
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="theme" className="text-sm font-medium text-muted-foreground">Theme</Label>
              <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose your preferred theme for the application</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Data & Privacy</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-muted/50 border border-gray-100 dark:border-slate-600 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm sm:text-base">Analytics & Usage Data</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Help improve our product by sharing usage data</div>
              </div>
              <Switch defaultChecked className="self-start sm:self-auto" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-muted/50 border border-gray-100 dark:border-slate-600 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm sm:text-base">Marketing Communications</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Receive product updates and marketing emails</div>
              </div>
              <Switch className="self-start sm:self-auto" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button className="bg-gradient-to-r from-brand-300 to-brand-400 hover:from-brand-400 hover:to-brand-500 dark:from-brand-300 dark:to-brand-400 dark:hover:from-brand-300 dark:hover:to-brand-400 text-black gap-2 rounded-lg px-6">
            <Save className="w-4 h-4" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
