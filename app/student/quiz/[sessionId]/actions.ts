'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Student-side quiz actions.
 *
 * Both functions delegate to /api/quiz/*, where three defects from the audit
 * are now fixed server-side:
 *
 *   - The question payload no longer carries correctOptionIndex, so the answer
 *     is not sitting in the browser before the student picks one.
 *   - Answer timing is measured on the server from question_start_time, so
 *     sending answerTimeMs: 0 can no longer buy a maximum speed bonus.
 *   - questionIndex is validated against the session's current question, and a
 *     UNIQUE constraint blocks replayed submissions.
 *
 * Exported signatures are unchanged so app/student/quiz/[sessionId]/page.tsx
 * needs no edits.
 */

/**
 * Result shapes carry `error` as an optional sibling of the success fields
 * rather than as a union arm. A union would be more precise, but every call
 * site does `if (result.error) return` and then reads the success fields
 * directly -- with a union TypeScript rejects that, and these pages are not
 * being rewritten as part of this migration.
 */
interface SubmitAnswerResult {
  error?: string
  success: boolean
  isCorrect: boolean
  pointsEarned: number
  newTotalScore: number
  newStreak: number
  correctAnswer: number | null
}

interface StudentQuestionResult {
  error?: string
  session: any
  participant: any
  question: any
  questionIndex: number
  totalQuestions: number
  hasAnswered: boolean
  answer: any
  correctAnswer: number | null
}

export async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  selectedOptionIndex: number,
  // Accepted for signature compatibility and ignored: the server measures this
  // itself from question_start_time. Left in place so the existing call site
  // still compiles.
  _answerTimeMs?: number
): Promise<SubmitAnswerResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.call<SubmitAnswerResult>(
    `/api/quiz/sessions/${sessionId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ questionIndex, selectedOptionIndex }),
    }
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to submit answer' } as SubmitAnswerResult
  }
  return data
}

export async function getQuestionForStudent(
  sessionId: string
): Promise<StudentQuestionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.call<StudentQuestionResult>(
    `/api/quiz/sessions/${sessionId}/question`
  )

  if (error || !data) {
    return { error: error?.message ?? 'Failed to get question' } as StudentQuestionResult
  }

  // The page reads `question.correctOptionIndex` when re-rendering feedback for
  // an already-answered question. The server only fills `correctAnswer` once
  // this student has committed an answer, so merging it here is safe.
  return {
    ...data,
    question: data.question
      ? { ...data.question, correctOptionIndex: data.correctAnswer }
      : null,
  }
}
