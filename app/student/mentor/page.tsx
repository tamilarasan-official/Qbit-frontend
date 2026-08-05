'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Mail,
  Calendar,
  UserCheck,
  MessageCircle,
  Phone,
  Users,
  Clock,
  Copy,
  Check,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MentorInfo {
  id: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  bio?: string | null;
  assigned_at: string;
  student_count: number;
}

export default function StudentMentorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mentor, setMentor] = useState<MentorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadMentorInfo();
  }, []);

  /**
   * Read through /api/me/mentor rather than the generic query endpoint.
   *
   * profiles.select redacts email, phone and bio for non-staff, so a student
   * querying their mentor's row gets a name and nothing else -- which is why
   * this page used to render an empty address and a mailto: link pointing at
   * "undefined". That endpoint resolves the mentor from the caller's own id and
   * returns just that one profile unredacted.
   */
  const loadMentorInfo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.call<MentorInfo | null>('/api/me/mentor');
      if (error) {
        console.error('Error loading mentor info:', error);
        setMentor(null);
        return;
      }
      setMentor(data ?? null);
    } catch (error) {
      console.error('Error loading mentor info:', error);
      setMentor(null);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const copyEmail = async () => {
    if (!mentor?.email) return;
    try {
      await navigator.clipboard.writeText(mentor.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked -- the address is selectable on screen anyway */
    }
  };

  const daysTogether = mentor
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(mentor.assigned_at).getTime()) / 86_400_000)
      )
    : 0;

  const mailto = (subject: string) =>
    mentor?.email ? `mailto:${mentor.email}?subject=${encodeURIComponent(subject)}` : undefined;

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

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-brand-700 dark:text-brand-400" />
          </div>
        ) : (
          <div className="container mx-auto max-w-5xl space-y-6 p-6">
            <div>
              <h1 className="bg-gradient-to-r from-neutral-900 to-brand-700 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-brand-400">
                My Mentor
              </h1>
              <p className="mt-2 text-muted-foreground">
                Connect with your assigned mentor for guidance and support
              </p>
            </div>

            {!mentor ? (
              /* ---------------------------------------------------------- */
              <Card className="overflow-hidden border-dashed">
                <CardContent className="flex flex-col items-center px-6 py-16 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-800/30">
                    <UserCheck className="h-9 w-9 text-brand-700 dark:text-brand-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    No mentor assigned yet
                  </h3>
                  <p className="max-w-md text-muted-foreground">
                    You&apos;ll be paired with a mentor shortly. Once that happens their details
                    and a direct line to them will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* ---------------- Hero ---------------- */}
                <Card className="overflow-hidden border-none shadow-lg">
                  {/* Banner. The avatar overlaps its lower edge, which is what
                      gives the card a focal point instead of a flat stack. */}
                  <div className="relative h-28 bg-gradient-to-r from-brand-300 via-brand-400 to-brand-300 dark:from-brand-900 dark:via-brand-800 dark:to-brand-900">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 50%, rgba(255,255,255,.9) 1px, transparent 1px), radial-gradient(circle at 70% 30%, rgba(255,255,255,.7) 1px, transparent 1px)',
                        backgroundSize: '28px 28px, 36px 36px',
                      }}
                    />
                    <Badge className="absolute right-4 top-4 gap-1 rounded-full bg-black/85 text-white hover:bg-black/85">
                      <Sparkles className="h-3 w-3" />
                      Your Mentor
                    </Badge>
                  </div>

                  <CardContent className="p-6 pt-0">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                      <Avatar className="-mt-12 h-24 w-24 shrink-0 border-4 border-card shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-500 text-2xl font-bold text-black">
                          {getInitials(mentor.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 sm:pb-1">
                        <h2 className="truncate text-2xl font-bold text-foreground">
                          {mentor.full_name}
                        </h2>
                        {mentor.email ? (
                          <button
                            type="button"
                            onClick={copyEmail}
                            title="Copy email address"
                            className="group mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-700 dark:hover:text-brand-400"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{mentor.email}</span>
                            {copied ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </button>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Contact details unavailable
                          </p>
                        )}
                      </div>

                      {mentor.email && (
                        <Button asChild className="shrink-0 rounded-xl">
                          <a href={mailto('Question from your student')}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send email
                          </a>
                        </Button>
                      )}
                    </div>

                    {mentor.bio && (
                      <p className="mt-5 border-l-2 border-brand-300 pl-4 text-sm leading-relaxed text-muted-foreground dark:border-brand-700">
                        {mentor.bio}
                      </p>
                    )}

                    {/* Stat strip */}
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          icon: Users,
                          label: 'Students mentored',
                          value: mentor.student_count.toLocaleString(),
                        },
                        {
                          icon: Clock,
                          label: 'Days together',
                          value: daysTogether.toLocaleString(),
                        },
                        {
                          icon: Calendar,
                          label: 'Paired on',
                          value: new Date(mentor.assigned_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }),
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-black">
                            <s.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-bold leading-tight text-foreground">
                              {s.value}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* ---------------- Get in touch ---------------- */}
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-foreground">Get in touch</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Every option below opens your email client with the subject filled in
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      {
                        icon: MessageCircle,
                        title: 'Ask a question',
                        body: 'Stuck on a task or concept? Send it over.',
                        subject: 'Question from your student',
                        tone: 'bg-brand-400 text-black',
                      },
                      {
                        icon: Calendar,
                        title: 'Schedule a meeting',
                        body: 'Request a call to talk things through.',
                        subject: 'Request: schedule a meeting',
                        tone: 'bg-purple-600 text-white',
                      },
                      {
                        icon: Sparkles,
                        title: 'Share your progress',
                        body: 'Show what you have built or completed.',
                        subject: 'Progress update',
                        tone: 'bg-green-600 text-white',
                      },
                      {
                        icon: UserCheck,
                        title: 'Ask for a review',
                        body: 'Get feedback on a submission.',
                        subject: 'Request: feedback on my submission',
                        tone: 'bg-amber-500 text-black',
                      },
                    ].map((a) => {
                      const href = mailto(a.subject);
                      const inner = (
                        <>
                          <div
                            className={cn(
                              a.tone,
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl'
                            )}
                          >
                            <a.icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 font-semibold text-foreground">
                              {a.title}
                              {href && (
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{a.body}</p>
                          </div>
                        </>
                      );

                      // Without an address there is nothing to open, so it renders
                      // as a muted panel rather than a link that goes nowhere.
                      return href ? (
                        <a
                          key={a.title}
                          href={href}
                          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div
                          key={a.title}
                          className="flex items-center gap-4 rounded-2xl border border-border bg-muted/40 p-4 opacity-60"
                        >
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ---------------- Phone, when there is one ---------------- */}
                {mentor.phone && (
                  <Card className="overflow-hidden">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">Phone</p>
                        <p className="truncate text-sm text-muted-foreground">{mentor.phone}</p>
                      </div>
                      <Button asChild variant="outline" className="shrink-0 rounded-xl">
                        <a href={`tel:${mentor.phone}`}>Call mentor</a>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
