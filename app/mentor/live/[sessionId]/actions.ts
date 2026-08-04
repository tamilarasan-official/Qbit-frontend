'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Live session controls for the mentor dashboard.
 *
 * Every function here is a thin pass-through to /api/quiz/*, which is where
 * host ownership is verified. The previous implementations ran the mutation
 * inline with NO authentication check of any kind -- and a Next.js server
 * action is a public POST endpoint, so any student who knew a sessionId (they
 * all do; it is in their own URL) could end the quiz for the whole class.
 *
 * Exported signatures and return shapes are unchanged, so
 * app/mentor/live/[sessionId]/page.tsx needs no edits.
 */

/**
 * `error` is an optional sibling of the success fields rather than a union arm.
 * Every call site does `if (result.error) return` then reads success fields
 * directly, which a discriminated union would reject.
 */
interface CurrentQuestionResult {
  error?: string
  question: any
  index: number
  total: number
  session: any
}

interface AdvanceResult {
  error?: string
  success?: boolean
  finished?: boolean
  nextIndex?: number
}

interface EndSessionResult {
  error?: string
  success: boolean
}

interface LeaderboardResult {
  error?: string
  leaderboard: any[]
}

interface AnswerStatsResult {
  error?: string
  stats: Record<string, number>
}

interface ParticipantCountResult {
  error?: string
  count: number
}

export async function getCurrentQuestion(
  sessionId: string
): Promise<CurrentQuestionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<CurrentQuestionResult>(
    `/api/quiz/sessions/${sessionId}/host-question`
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to get current question' } as CurrentQuestionResult
  }
  return data
}

export async function advanceQuestion(sessionId: string): Promise<AdvanceResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<AdvanceResult>(
    `/api/quiz/sessions/${sessionId}/advance`,
    { method: 'POST' }
  )

  if (error) return { error: error.message }
  return data ?? { error: 'Failed to advance question' }
}

export async function endSession(sessionId: string): Promise<EndSessionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<{ success: boolean }>(
    `/api/quiz/sessions/${sessionId}/end`,
    { method: 'POST' }
  )

  if (error) return { error: error.message } as EndSessionResult
  return data ?? ({ error: 'Failed to end session' } as EndSessionResult)
}

export async function getLeaderboard(sessionId: string): Promise<LeaderboardResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<LeaderboardResult>(
    `/api/quiz/sessions/${sessionId}/leaderboard`
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to get leaderboard' } as LeaderboardResult
  }
  return data
}

export async function getAnswerStats(
  sessionId: string,
  questionIndex: number
): Promise<AnswerStatsResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<AnswerStatsResult>(
    `/api/quiz/sessions/${sessionId}/stats?questionIndex=${encodeURIComponent(String(questionIndex))}`
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to get answer stats' } as AnswerStatsResult
  }
  return data
}

export async function getParticipantCount(
  sessionId: string
): Promise<ParticipantCountResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.call<ParticipantCountResult>(
    `/api/quiz/sessions/${sessionId}/participants/count`
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to get participant count' } as ParticipantCountResult
  }
  return data
}
