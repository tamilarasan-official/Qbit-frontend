'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Join a live quiz session using a session code.
 *
 * Delegates to POST /api/quiz/join. Two things improved in the move:
 *
 *   - Duplicate joins are prevented by a UNIQUE (session_id, user_id) constraint
 *     rather than a SELECT-then-INSERT, which raced when a student double-tapped
 *     the join button.
 *   - The step-by-step console trace with timings is gone. It ran on every join
 *     in production and logged user ids to the server log for no benefit.
 *
 * Return shape is unchanged: { success, session, participant, alreadyJoined }
 * or { error }.
 */
export async function joinQuizSession(sessionCode: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.call<{
    session: Record<string, unknown>
    participant: Record<string, unknown>
    alreadyJoined: boolean
  }>('/api/quiz/join', {
    method: 'POST',
    body: JSON.stringify({ session_code: sessionCode }),
  })

  if (error || !data) {
    return { error: error?.message ?? 'An unexpected error occurred' }
  }

  return {
    success: true as const,
    session: data.session,
    participant: data.participant,
    alreadyJoined: data.alreadyJoined,
  }
}
