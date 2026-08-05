'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  GraduationCap,
  MessageSquare,
  Loader2,
  ClipboardList,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

interface MentorStats {
  totalStudents: number
  activeTasks: number
  pendingSubmissions: number
  completedTasks: number
}

interface RecentSubmission {
  id: string
  task_title: string
  student_name: string
  status: string
  submitted_at: string
}

export default function MentorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MentorStats>({
    totalStudents: 0,
    activeTasks: 0,
    pendingSubmissions: 0,
    completedTasks: 0,
  })
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchMentorData() {
      try {
        setLoading(true)

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch students assigned to this mentor (for count only)
        const { data: mentorAssignments, error: assignmentsError } = await supabase
          .from('mentor_assignments')
          .select('student_id')
          .eq('mentor_id', user.id)
          .eq('status', 'active')

        if (assignmentsError) {
          console.error('Error fetching mentor assignments:', assignmentsError)
        }

        const studentIds = mentorAssignments?.map(ma => ma.student_id) || []

        // Fetch active tasks created by this mentor
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('mentor_id', user.id)
          .eq('is_active', true)

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError)
        }

        // Fetch all task assignments for this mentor's tasks
        const taskIds = tasksData?.map(t => t.id) || []
        let assignmentsData = []
        if (taskIds.length > 0) {
          const { data, error: taskAssignmentsError } = await supabase
            .from('task_assignments')
            .select('id, status')
            .in('task_id', taskIds)

          if (taskAssignmentsError) {
            console.error('Error fetching task assignments:', taskAssignmentsError)
          } else {
            assignmentsData = data || []
          }
        }

        // Count pending and completed submissions
        const pendingCount = assignmentsData.filter(a => a.status === 'assigned' || a.status === 'in_progress').length
        const completedCount = assignmentsData.filter(a => a.status === 'completed').length

        // Fetch recent submissions (last 5)
        if (taskIds.length > 0) {
          const { data: submissions } = await supabase
            .from('task_assignments')
            .select(`
              id,
              status,
              updated_at,
              task_id,
              student_id
            `)
            .in('task_id', taskIds)
            .not('status', 'eq', 'assigned')
            .order('updated_at', { ascending: false })
            .limit(5)

          if (submissions && submissions.length > 0) {
            // Fetch task and student details
            const taskMap = new Map()
            const studentMap = new Map()

            // Fetch tasks
            const uniqueTaskIds = [...new Set(submissions.map(s => s.task_id))]
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, title')
              .in('id', uniqueTaskIds)

            tasks?.forEach(task => taskMap.set(task.id, task.title))

            // Fetch students
            const uniqueStudentIds = [...new Set(submissions.map(s => s.student_id))]
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', uniqueStudentIds)

            profiles?.forEach(profile => studentMap.set(profile.id, profile.full_name || profile.email?.split('@')[0] || 'Unknown'))

            // Map submissions
            const mappedSubmissions = submissions.map(sub => ({
              id: sub.id,
              task_title: taskMap.get(sub.task_id) || 'Unknown Task',
              student_name: studentMap.get(sub.student_id) || 'Unknown Student',
              status: sub.status,
              submitted_at: sub.updated_at
            }))

            setRecentSubmissions(mappedSubmissions)
          }
        }

        setStats({
          totalStudents: studentIds.length,
          activeTasks: tasksData?.length || 0,
          pendingSubmissions: pendingCount,
          completedTasks: completedCount,
        })
      } catch (error) {
        console.error('Error fetching mentor data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMentorData()
  }, [])

  /**
   * Each swatch carries its own foreground.
   *
   * brand-400 is a bright lime: a white glyph on it is near-invisible in the
   * light theme, which is why the "Mentor Access" badge below already pairs it
   * with black. The darker greens and purples keep white.
   */
  const BRAND_SWATCH = 'bg-brand-400 text-black'
  const GREEN_SWATCH = 'bg-green-600 text-white'
  const PURPLE_SWATCH = 'bg-purple-600 text-white'

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: BRAND_SWATCH,
      description: 'Assigned to you',
    },
    {
      title: 'Active Tasks',
      value: stats.activeTasks,
      icon: ClipboardList,
      color: GREEN_SWATCH,
      description: 'Currently active',
    },
    {
      title: 'Pending Submissions',
      value: stats.pendingSubmissions,
      icon: Clock,
      color: BRAND_SWATCH,
      description: 'Awaiting completion',
    },
    {
      title: 'Completed Tasks',
      value: stats.completedTasks,
      icon: CheckCircle,
      color: PURPLE_SWATCH,
      description: 'Successfully finished',
    },
  ]

  const quickActions = [
    { icon: ClipboardList, label: 'Manage Tasks', color: BRAND_SWATCH, href: '/mentor/managetask' },
    { icon: FileText, label: 'View Submissions', color: GREEN_SWATCH, href: '/mentor/managetask' },
    { icon: Users, label: 'View Students', color: PURPLE_SWATCH, href: '/mentor/managetask' },
    { icon: MessageSquare, label: 'Announcements', color: BRAND_SWATCH, href: '/announcement' },
  ]

  return (
    <main className="overflow-hidden min-h-screen transition-colors duration-300">
      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />

      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarOpen ? 'md:pl-64' : 'md:pl-[76px]'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="space-y-8 px-4 py-8 md:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Mentor Dashboard
              </h1>
              <p className="mt-1 text-muted-foreground">
                Manage your students and track their progress
              </p>
            </div>
            <Badge className="bg-brand-400 text-black rounded-full px-4 py-2">
              <GraduationCap className="mr-2 h-4 w-4" />
              Mentor Access
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-brand-400" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                  <motion.div
                    key={stat.title}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-none shadow-lg rounded-2xl bg-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {stat.title}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-foreground">
                              {stat.value}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {stat.description}
                            </p>
                          </div>
                          <div
                            className={cn(
                              stat.color,
                              'flex h-14 w-14 items-center justify-center rounded-2xl'
                            )}
                          >
                            <stat.icon className="h-7 w-7" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <Card className="border-none shadow-lg rounded-2xl bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Common mentor tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary dark:border-slate-700"
                        onClick={() => window.location.href = action.href}
                      >
                        <div
                          className={cn(
                            action.color,
                            'flex h-12 w-12 items-center justify-center rounded-xl'
                          )}
                        >
                          <action.icon className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {action.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-none shadow-lg rounded-2xl bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Latest task submissions from your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentSubmissions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No recent activity yet
                      </p>
                    ) : (
                      recentSubmissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0",
                              submission.status === 'completed' ? 'bg-green-500' :
                              submission.status === 'in_progress' ? 'bg-brand-400' : 'bg-brand-400'
                            )}>
                              {submission.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-white" />
                              ) : (
                                <Clock className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {submission.task_title}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {submission.student_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <Badge className={cn(
                              "rounded-full",
                              submission.status === 'completed'
                                ? 'bg-green-500 text-white'
                                : submission.status === 'in_progress'
                                ? 'bg-brand-400 text-black'
                                : 'bg-brand-400 text-black'
                            )}>
                              {submission.status === 'completed' ? 'Completed' :
                               submission.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
