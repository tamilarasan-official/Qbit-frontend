import { Save, Bell, Smartphone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

interface NotificationsTabProps {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    workflowSuccess: boolean
    workflowFailure: boolean
    weeklyReport: boolean
    securityAlerts: boolean
  }
  handleNotificationChange: (key: string, value: boolean) => void
}

export function NotificationsTab({ notifications, handleNotificationChange }: NotificationsTabProps) {
  return (
    <Card className="border-border rounded-xl shadow-sm bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-foreground">Notification Preferences</CardTitle>
        <CardDescription className="text-muted-foreground">Choose how you want to be notified about important events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Notification Channels</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div className="flex items-center gap-3 sm:gap-4">
                <Mail className="w-5 h-5 text-brand-700 dark:text-brand-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-foreground text-sm sm:text-base">Email Notifications</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Receive notifications via email</div>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(value) => handleNotificationChange("email", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div className="flex items-center gap-3 sm:gap-4">
                <Bell className="w-5 h-5 text-brand-700 dark:text-brand-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-foreground text-sm sm:text-base">Push Notifications</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Receive browser push notifications</div>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(value) => handleNotificationChange("push", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div className="flex items-center gap-3 sm:gap-4">
                <Smartphone className="w-5 h-5 text-brand-700 dark:text-brand-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-foreground text-sm sm:text-base">SMS Notifications</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Receive text message alerts</div>
                </div>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(value) => handleNotificationChange("sms", value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Event Notifications</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div>
                <div className="font-medium text-foreground text-sm sm:text-base">Workflow Success</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">When workflows complete successfully</div>
              </div>
              <Switch
                checked={notifications.workflowSuccess}
                onCheckedChange={(value) => handleNotificationChange("workflowSuccess", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div>
                <div className="font-medium text-foreground text-sm sm:text-base">Workflow Failure</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">When workflows fail or encounter errors</div>
              </div>
              <Switch
                checked={notifications.workflowFailure}
                onCheckedChange={(value) => handleNotificationChange("workflowFailure", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div>
                <div className="font-medium text-foreground text-sm sm:text-base">Weekly Reports</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Weekly summary of workflow performance</div>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(value) => handleNotificationChange("weeklyReport", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg border border-gray-100 dark:border-slate-600">
              <div>
                <div className="font-medium text-foreground text-sm sm:text-base">Security Alerts</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">Important security and account notifications</div>
              </div>
              <Switch
                checked={notifications.securityAlerts}
                onCheckedChange={(value) => handleNotificationChange("securityAlerts", value)}
              />
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
