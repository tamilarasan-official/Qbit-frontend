'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Mentor lobby actions.
 *
 * getSessionByCode still reads through the generic query layer -- a session row
 * is not secret, and the policy layer allows a plain select. startQuizSession
 * goes through /api/quiz/sessions/:id/start, which verifies host ownership and
 * sets question_start_time / question_end_time so the question clock is
 * server-authoritative from the first question onward.
 */

export async function getSessionByCode(sessionCode: string) {
  const supabase = await createClient()

  const { data: session, error } = await supabase
    .from('quiz_sessions')
    .select('*, quiz:quizzes(*)')
    .eq('session_code', sessionCode.toUpperCase())
    .single()

  if (error || !session) {
    return { error: 'Session not found' }
  }

  return { success: true as const, session }
}

export async function startQuizSession(sessionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.call<{ success: boolean }>(
    `/api/quiz/sessions/${sessionId}/start`,
    { method: 'POST' }
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to start quiz' }
  }

  return { success: true as const }
}
