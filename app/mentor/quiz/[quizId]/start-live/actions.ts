'use server'

import { createClient } from '@/utils/supabase/server'

interface SessionSettings {
  questionTimer: number
  showAnswerDistribution: boolean
  showLeaderboard: boolean
  allowLateJoin: boolean
  pointsPerQuestion: number
  speedBonus: boolean
  streakMultiplier: boolean
}

/**
 * Open a live session for a quiz.
 *
 * Delegates to POST /api/quiz/sessions, which verifies the caller owns the quiz
 * (or is an admin), generates the session code inside the same transaction as
 * the insert, and clamps the settings -- questionTimer to 5-300s and
 * pointsPerQuestion to 0-10000, neither of which was bounded before.
 *
 * Return shape is unchanged: { success, session, sessionCode } or { error }.
 */
export async function createLiveSession(
  quizId: string,
  settings: Partial<SessionSettings> = {}
) {
  const supabase = await createClient()

  const { data, error } = await supabase.call<{
    session: Record<string, unknown> & { session_code: string }
    sessionCode: string
  }>('/api/quiz/sessions', {
    method: 'POST',
    body: JSON.stringify({ quiz_id: quizId, settings }),
  })

  if (error || !data) {
    return { error: error?.message ?? 'An unexpected error occurred' }
  }

  return {
    success: true as const,
    session: data.session,
    sessionCode: data.sessionCode,
  }
}
