'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Crown,
  Loader2,
  Edit,
  Check,
  X,
  Trophy,
  Target,
  User,
  ArrowRightLeft,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface TeamMember {
  id: string
  user_id: string
  joined_at: string
  full_name: string | null
  email: string | null
}

interface Team {
  id: string
  team_name: string
  team_code: string
  leader_id: string
  theme: string | null
  max_members: number
  created_at: string
  member_count: number
  members: TeamMember[]
  leader_name: string | null
  leader_email: string | null
}

export default function HackathonManagerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [themeInput, setThemeInput] = useState('')
  const [updating, setUpdating] = useState(false)

  // Reassigning a member is admin-only server-side (hackathon_team_members
  // update). The role is read here purely so mentors are not shown a control
  // that would 403 -- the API is the actual boundary, not this flag.
  const [role, setRole] = useState<string | null>(null)
  const [movingMemberId, setMovingMemberId] = useState<string | null>(null)
  const [moveTargetTeamId, setMoveTargetTeamId] = useState('')
  const [moving, setMoving] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  const isAdmin = role === 'admin'

  useEffect(() => {
    fetchAllTeams()
    fetchRole()
  }, [])

  const fetchRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole(profile?.role?.toLowerCase() || 'student')
    } catch (err) {
      console.error('Error fetching role:', err)
    }
  }

  const fetchAllTeams = async () => {
    try {
      setLoading(true)

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('hackathon_teams')
        .select('*')
        .order('created_at', { ascending: false })

      if (teamsError) {
        console.error('Error fetching teams:', teamsError)
        return
      }

      // Fetch members for each team
      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team) => {
          // Fetch team members
          const { data: membersData } = await supabase
            .from('hackathon_team_members')
            .select(`
              *,
              profiles:user_id (
                full_name,
                email
              )
            `)
            .eq('team_id', team.id)
            .order('joined_at', { ascending: true })

          const members: TeamMember[] = (membersData || []).map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            joined_at: m.joined_at,
            full_name: m.profiles?.full_name || null,
            email: m.profiles?.email || null,
          }))

          // Get leader info
          const leader = members.find(m => m.user_id === team.leader_id)

          return {
            ...team,
            member_count: members.length,
            members,
            leader_name: leader?.full_name || null,
            leader_email: leader?.email || null,
          }
        })
      )

      setTeams(teamsWithDetails)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditTheme = (teamId: string, currentTheme: string | null) => {
    setEditingTeamId(teamId)
    setThemeInput(currentTheme || '')
  }

  const handleSaveTheme = async (teamId: string) => {
    try {
      setUpdating(true)

      const { error } = await supabase
        .from('hackathon_teams')
        .update({ theme: themeInput.trim() || null })
        .eq('id', teamId)

      if (error) {
        console.error('Error updating theme:', error)
        toast({
          title: "Failed to update theme",
          description: "An error occurred while updating the theme. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Theme updated",
        description: "The hackathon theme has been successfully updated",
      })
      setEditingTeamId(null)
      setThemeInput('')
      fetchAllTeams()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingTeamId(null)
    setThemeInput('')
  }

  const handleStartMove = (memberId: string) => {
    setMovingMemberId(memberId)
    setMoveTargetTeamId('')
  }

  const handleCancelMove = () => {
    setMovingMemberId(null)
    setMoveTargetTeamId('')
  }

  /**
   * A membership row carries UNIQUE (user_id), so one row per person overall --
   * moving somebody is an update of team_id, not a delete plus an insert.
   */
  const handleMoveMember = async (memberId: string) => {
    if (!moveTargetTeamId) return

    try {
      setMoving(true)

      const { error } = await supabase
        .from('hackathon_team_members')
        .update({ team_id: moveTargetTeamId })
        .eq('id', memberId)

      if (error) {
        console.error('Error moving member:', error)
        toast({
          title: "Failed to move member",
          // Surfaced rather than swallowed: a non-admin gets "Admins only" here,
          // which explains the refusal better than a generic message would.
          description: error.message || "An error occurred. Please try again.",
          variant: "destructive",
        })
        return
      }

      const target = teams.find(t => t.id === moveTargetTeamId)
      toast({
        title: "Member moved",
        description: `Now a member of ${target?.team_name ?? 'the selected team'}`,
      })
      handleCancelMove()
      fetchAllTeams()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setMoving(false)
    }
  }

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(' ')
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'U'
  }

  const getDisplayName = (name: string | null, email: string | null) => {
    return name || email?.split('@')[0] || 'Anonymous'
  }

  return (
    <main className="overflow-hidden min-h-screen transition-colors duration-300">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
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
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Hackathon Manager
              </h1>
              <p className="mt-2 text-muted-foreground">
                Manage all hackathon teams and assign themes
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-4 py-2 text-sm">
              <Trophy className="mr-2 h-4 w-4" />
              {teams.length} Teams
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-brand-400" />
            </div>
          ) : teams.length === 0 ? (
            <Card className="rounded-3xl p-12 text-center">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-foreground">
                No Teams Yet
              </h3>
              <p className="text-muted-foreground">
                Teams will appear here once students create them
              </p>
            </Card>
          ) : (
            /* Teams List */
            <div className="grid gap-6">
              {teams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-lg rounded-3xl bg-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-2xl text-foreground mb-2">
                            {team.team_name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-3">
                            <CardDescription>
                              Code: <span className="font-mono font-bold text-primary">{team.team_code}</span>
                            </CardDescription>
                            <Badge variant="outline" className="rounded-full">
                              {team.member_count}/{team.max_members} members
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              Created {new Date(team.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Theme Section */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <h3 className="font-semibold text-foreground">
                              Hackathon Theme
                            </h3>
                          </div>
                          {editingTeamId !== team.id && (
                            <Button
                              onClick={() => handleEditTheme(team.id, team.theme)}
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {team.theme ? 'Edit' : 'Add'} Theme
                            </Button>
                          )}
                        </div>

                        {editingTeamId === team.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={themeInput}
                              onChange={(e) => setThemeInput(e.target.value)}
                              placeholder="Enter hackathon theme..."
                              className="rounded-xl min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handleCancelEdit}
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                disabled={updating}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleSaveTheme(team.id)}
                                size="sm"
                                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
                                disabled={updating}
                              >
                                {updating ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Save Theme
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : team.theme ? (
                          <p className="text-muted-foreground">
                            {team.theme}
                          </p>
                        ) : (
                          <p className="text-muted-foreground italic">
                            No theme assigned yet
                          </p>
                        )}
                      </div>

                      {/* Team Leader */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">
                          Team Leader
                        </h3>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-brand-400/10 dark:from-amber-900/20 dark:to-brand-900/20">
                          <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700">
                            <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-400 font-bold text-black text-lg">
                              {getInitials(team.leader_name, team.leader_email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">
                                {getDisplayName(team.leader_name, team.leader_email)}
                              </p>
                              <Badge className="bg-amber-500 text-white rounded-full">
                                <Crown className="h-3 w-3 mr-1" />
                                Leader
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {team.leader_email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">
                          All Members ({team.member_count})
                        </h3>
                        <div className="grid gap-2">
                          {team.members.map((member) => {
                            const isLeader = member.user_id === team.leader_id

                            return (
                              <div
                                key={member.id}
                                className="rounded-xl border border-border"
                              >
                                <div className="flex items-center gap-3 p-3">
                                  <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700">
                                    <AvatarFallback className={cn(
                                      "font-bold text-white",
                                      isLeader
                                        ? "bg-gradient-to-br from-amber-500 to-brand-400"
                                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                                    )}>
                                      {getInitials(member.full_name, member.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-foreground text-sm">
                                        {getDisplayName(member.full_name, member.email)}
                                      </p>
                                      {isLeader && (
                                        <Badge variant="outline" className="rounded-full text-xs">
                                          <Crown className="h-3 w-3 mr-1" />
                                          Leader
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Joined {new Date(member.joined_at).toLocaleDateString()}
                                    </p>
                                  </div>

                                  {/* The leader is deliberately not movable: taking them out
                                      of their own team would leave team.leader_id pointing at
                                      somebody who is no longer a member. */}
                                  {isAdmin && !isLeader && movingMemberId !== member.id && (
                                    <Button
                                      onClick={() => handleStartMove(member.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-xl shrink-0"
                                      disabled={teams.length < 2}
                                      title={
                                        teams.length < 2
                                          ? 'There is no other team to move this member into'
                                          : 'Move this member to another team'
                                      }
                                    >
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Move
                                    </Button>
                                  )}
                                </div>

                                {isAdmin && movingMemberId === member.id && (
                                  <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center">
                                    {/* undefined, not '': Radix treats an empty string as a
                                        value rather than "nothing picked", and the placeholder
                                        would never show. */}
                                    <Select
                                      value={moveTargetTeamId || undefined}
                                      onValueChange={setMoveTargetTeamId}
                                      disabled={moving}
                                    >
                                      <SelectTrigger className="rounded-xl sm:flex-1">
                                        <SelectValue placeholder="Move to team..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teams
                                          .filter((t) => t.id !== team.id)
                                          .map((t) => {
                                            const full = t.member_count >= t.max_members
                                            return (
                                              <SelectItem key={t.id} value={t.id} disabled={full}>
                                                {t.team_name} ({t.member_count}/{t.max_members})
                                                {full ? ' - full' : ''}
                                              </SelectItem>
                                            )
                                          })}
                                      </SelectContent>
                                    </Select>

                                    <div className="flex gap-2">
                                      <Button
                                        onClick={handleCancelMove}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                        disabled={moving}
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => handleMoveMember(member.id)}
                                        size="sm"
                                        className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
                                        disabled={moving || !moveTargetTeamId}
                                      >
                                        {moving ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Moving...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Confirm
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
