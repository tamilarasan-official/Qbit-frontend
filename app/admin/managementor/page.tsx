'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, UserCheck, UserX, Save, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Student {
  id: string;
  full_name: string;
  email: string;
  assigned_mentor_id?: string | null;
  mentor_name?: string | null;
}

interface Mentor {
  id: string;
  full_name: string;
  email: string;
  student_count: number;
}

export default function ManageMentorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Mentor account CRUD, against the same /api/admin/users endpoints the user
  // management page uses -- they take a role, so nothing mentor-specific is
  // needed on the server.
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingMentor, setSavingMentor] = useState(false);

  const [mentorToDelete, setMentorToDelete] = useState<Mentor | null>(null);
  const [deletingMentor, setDeletingMentor] = useState(false);

  // Role changes go through their own endpoint rather than the account PATCH,
  // because that endpoint also revokes the user's sessions -- otherwise a token
  // minted while they were a mentor keeps mentor access until it expires.
  const [roleChange, setRoleChange] = useState<{ mentor: Mentor; role: string } | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load all mentor assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('mentor_assignments')
        .select('student_id, mentor_id')
        .eq('status', 'active');

      // Ignore errors if table doesn't exist or is empty
      // Common error codes: PGRST116 (no rows), 42P01 (table doesn't exist)
      if (assignmentsError && assignmentsError.code !== 'PGRST116' && assignmentsError.code !== '42P01') {
        console.error('Assignments error:', assignmentsError);
      }

      // Load all mentors to get their names for display
      const { data: allMentors, error: allMentorsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'mentor');

      if (allMentorsError) throw allMentorsError;

      // Create a map of mentor IDs to names
      const mentorMap = new Map(
        (allMentors || []).map((m: any) => [m.id, m.full_name || 'No Name'])
      );

      // Create a map of student IDs to their assigned mentor
      const assignmentMap = new Map(
        (assignments || []).map((a: any) => [a.student_id, a.mentor_id])
      );

      // Transform students data with mentor info
      const transformedStudents = (studentsData || []).map((student: any) => {
        const mentorId = assignmentMap.get(student.id);
        return {
          id: student.id,
          full_name: student.full_name || 'No Name',
          email: student.email,
          assigned_mentor_id: mentorId || null,
          mentor_name: mentorId ? mentorMap.get(mentorId) : null,
        };
      });

      setStudents(transformedStudents);

      // Load all mentors with student counts
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'mentor')
        .order('full_name');

      if (mentorsError) throw mentorsError;

      // Count students for each mentor
      const studentCountMap = new Map<string, number>();
      (assignments || []).forEach((a: any) => {
        studentCountMap.set(a.mentor_id, (studentCountMap.get(a.mentor_id) || 0) + 1);
      });

      const transformedMentors = (mentorsData || []).map((mentor: any) => ({
        id: mentor.id,
        full_name: mentor.full_name || 'No Name',
        email: mentor.email,
        student_count: studentCountMap.get(mentor.id) || 0,
      }));

      setMentors(transformedMentors);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students and mentors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /** Same initials treatment as the user management list, so the two read alike. */
  const getInitials = (name: string) => {
    if (!name || name === 'No Name') return 'M';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const handleCreateMentor = async () => {
    if (!createName.trim() || !createEmail.trim() || createPassword.length < 8) {
      toast({
        title: 'Missing details',
        description: 'Name, email and a password of at least 8 characters are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);

      const { error } = await supabase.call('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          full_name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: 'mentor',
        }),
      });

      if (error) {
        toast({
          title: 'Could not create mentor',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Mentor created',
        description: `${createName} can sign in and be assigned students`,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      await loadData();
    } catch (err) {
      console.error('Error creating mentor:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openEditMentor = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setEditName(mentor.full_name === 'No Name' ? '' : mentor.full_name);
    setEditEmail(mentor.email || '');
  };

  const handleUpdateMentor = async () => {
    if (!editingMentor) return;

    if (!editName.trim() || !editEmail.trim()) {
      toast({
        title: 'Missing details',
        description: 'Name and email cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingMentor(true);

      const { error } = await supabase.call(`/api/admin/users/${editingMentor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: editName.trim(),
          email: editEmail.trim(),
        }),
      });

      if (error) {
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Mentor updated', description: 'The changes have been saved' });
      setEditingMentor(null);
      await loadData();
    } catch (err) {
      console.error('Error updating mentor:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setSavingMentor(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleChange) return;

    try {
      setChangingRole(true);

      const { error } = await supabase.call('/api/admin/role', {
        method: 'PATCH',
        body: JSON.stringify({ user_id: roleChange.mentor.id, role: roleChange.role }),
      });

      if (error) {
        // LAST_ADMIN comes back from here when demoting the final admin.
        toast({
          title: 'Could not change role',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Role changed',
        description: `${roleChange.mentor.full_name} is now a ${roleChange.role}. They have been signed out.`,
      });
      setRoleChange(null);
      await loadData();
    } catch (err) {
      console.error('Error changing role:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setChangingRole(false);
    }
  };

  const handleDeleteMentor = async () => {
    if (!mentorToDelete) return;

    try {
      setDeletingMentor(true);

      const { error } = await supabase.call(`/api/admin/users/${mentorToDelete.id}`, {
        method: 'DELETE',
      });

      if (error) {
        toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
        return;
      }

      toast({
        title: 'Mentor deleted',
        description: mentorToDelete.student_count
          ? `${mentorToDelete.full_name} removed; ${mentorToDelete.student_count} student${mentorToDelete.student_count === 1 ? '' : 's'} now unassigned`
          : `${mentorToDelete.full_name} has been removed`,
      });
      setMentorToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting mentor:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setDeletingMentor(false);
    }
  };

  const assignMentor = async (studentId: string, mentorId: string | null) => {
    try {
      setSaving(studentId);

      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (mentorId) {
        // Check if student already has a mentor assignment
        const { data: existing } = await supabase
          .from('mentor_assignments')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (existing) {
          // Update existing assignment
          const { error: updateError } = await supabase
            .from('mentor_assignments')
            .update({
              mentor_id: mentorId,
              assigned_by: user.id,
              updated_at: new Date().toISOString(),
              status: 'active',
            })
            .eq('student_id', studentId);

          if (updateError) throw updateError;
        } else {
          // Create new assignment
          const { error: insertError } = await supabase
            .from('mentor_assignments')
            .insert({
              student_id: studentId,
              mentor_id: mentorId,
              assigned_by: user.id,
              status: 'active',
            });

          if (insertError) throw insertError;
        }

        toast({
          title: 'Success',
          description: 'Mentor assigned successfully',
        });
      } else {
        // Remove mentor assignment
        const { error: deleteError } = await supabase
          .from('mentor_assignments')
          .delete()
          .eq('student_id', studentId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Success',
          description: 'Mentor assignment removed',
        });
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error assigning mentor:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign mentor',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'assigned' && student.assigned_mentor_id) ||
      (filterStatus === 'unassigned' && !student.assigned_mentor_id);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: students.length,
    assigned: students.filter(s => s.assigned_mentor_id).length,
    unassigned: students.filter(s => !s.assigned_mentor_id).length,
  };

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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
          </div>
        ) : (
          <div className="container mx-auto p-6 max-w-7xl space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-neutral-900 to-brand-700 dark:from-white dark:to-brand-400 bg-clip-text text-transparent">
                Manage Mentor Assignments
              </h1>
              <p className="text-muted-foreground mt-2">
                Assign students to mentors and manage mentor-student relationships
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <Users className="w-10 h-10 text-brand-700" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned</p>
                      <p className="text-3xl font-bold text-green-600">{stats.assigned}</p>
                    </div>
                    <UserCheck className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                      <p className="text-3xl font-bold text-brand-700">{stats.unassigned}</p>
                    </div>
                    <UserX className="w-10 h-10 text-brand-700" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search students by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle>Student List ({filteredStudents.length})</CardTitle>
                <CardDescription>
                  Assign or update mentor for each student using the dropdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No students found matching your filters
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {student.full_name}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {student.email}
                          </p>
                          {student.mentor_name && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                Currently: {student.mentor_name}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={student.assigned_mentor_id || 'none'}
                            onValueChange={(value) => assignMentor(student.id, value === 'none' ? null : value)}
                            disabled={saving === student.id}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select mentor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-gray-500">No Mentor</span>
                              </SelectItem>
                              {mentors.map((mentor) => (
                                <SelectItem key={mentor.id} value={mentor.id}>
                                  {mentor.full_name} ({mentor.student_count} students)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {saving === student.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-brand-700" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mentor Overview */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Mentor Overview</CardTitle>
                    <CardDescription>Current student distribution across mentors</CardDescription>
                  </div>
                  <Button onClick={() => setShowCreate(true)} className="shrink-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mentor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {mentors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No mentors found. Please add mentors to the system first.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {mentors.map((mentor) => (
                      <li
                        key={mentor.id}
                        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-6"
                      >
                        <Avatar className="h-11 w-11 shrink-0 border-2 border-gray-200 dark:border-gray-700">
                          <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-400 text-black font-semibold">
                            {getInitials(mentor.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-gray-900 dark:text-white">
                            {mentor.full_name}
                          </h4>
                          <p className="truncate text-sm text-muted-foreground">
                            {mentor.email}
                          </p>
                          {/* The count has its own column on wide screens; below that
                              it rides under the name so the row does not squeeze. */}
                          <div className="mt-1 sm:hidden">
                            <Badge className="bg-brand-500 text-black">
                              {mentor.student_count}{' '}
                              {mentor.student_count === 1 ? 'student' : 'students'}
                            </Badge>
                          </div>
                        </div>

                        <div className="hidden w-32 shrink-0 sm:block">
                          <Badge className="bg-brand-500 text-black">
                            {mentor.student_count}{' '}
                            {mentor.student_count === 1 ? 'student' : 'students'}
                          </Badge>
                        </div>

                        {/* Value stays "mentor": picking another role opens a
                            confirmation, and the list reloads from the server, so the
                            control never shows a role that has not been committed. */}
                        <div className="hidden w-40 shrink-0 md:block">
                          <Select
                            value="mentor"
                            onValueChange={(role) => setRoleChange({ mentor, role })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mentor">Mentor</SelectItem>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="coursemaster">Course Master</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            onClick={() => openEditMentor(mentor)}
                            variant="ghost"
                            size="sm"
                            title={`Edit ${mentor.full_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setMentorToDelete(mentor)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title={`Delete ${mentor.full_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create mentor */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mentor</DialogTitle>
            <DialogDescription>
              Creates a sign-in account with the mentor role. They can be assigned students
              straight away.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="mentor-name">Full Name *</Label>
              <Input
                id="mentor-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <Label htmlFor="mentor-email">Email *</Label>
              <Input
                id="mentor-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="jane@qbitio.com"
              />
            </div>

            <div>
              <Label htmlFor="mentor-password">Password *</Label>
              <Input
                id="mentor-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Share it with them directly -- no invitation email is sent.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateMentor} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Mentor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit mentor */}
      <Dialog
        open={editingMentor !== null}
        onOpenChange={(open) => !open && setEditingMentor(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Mentor</DialogTitle>
            <DialogDescription>
              Changing the email changes the address this mentor signs in with, not just the
              one shown here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-mentor-name">Full Name *</Label>
              <Input
                id="edit-mentor-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-mentor-email">Email *</Label>
              <Input
                id="edit-mentor-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            {/* Demoting a mentor is a role change, which has its own endpoint and
                revokes their sessions. It lives on the user management page. */}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMentor(null)}
              disabled={savingMentor}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateMentor} disabled={savingMentor}>
              {savingMentor ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role */}
      <AlertDialog
        open={roleChange !== null}
        onOpenChange={(open) => !open && setRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change this person&apos;s role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleChange && (
                <>
                  {roleChange.mentor.full_name} becomes a {roleChange.role} and is signed out
                  immediately, so their next login carries the new role.
                  {roleChange.mentor.student_count > 0 && (
                    <>
                      {' '}
                      Their {roleChange.mentor.student_count}{' '}
                      {roleChange.mentor.student_count === 1 ? 'student stays' : 'students stay'}{' '}
                      assigned to them, so reassign
                      {roleChange.mentor.student_count === 1 ? ' that student' : ' those students'}{' '}
                      afterwards -- a demotion does not clear the assignment.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleChangeRole();
              }}
              disabled={changingRole}
            >
              {changingRole ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete mentor */}
      <AlertDialog
        open={mentorToDelete !== null}
        onOpenChange={(open) => !open && setMentorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mentor?</AlertDialogTitle>
            <AlertDialogDescription>
              {mentorToDelete && (
                <>
                  {mentorToDelete.full_name} will be permanently removed. This also deletes
                  the quizzes they created and the resources they uploaded, which cascade
                  from the account
                  {mentorToDelete.student_count > 0 && (
                    <>
                      , and leaves {mentorToDelete.student_count}{' '}
                      {mentorToDelete.student_count === 1 ? 'student' : 'students'} with no
                      mentor
                    </>
                  )}
                  . Tasks they set stay, but lose their owner. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMentor}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteMentor();
              }}
              disabled={deletingMentor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingMentor ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete mentor'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
