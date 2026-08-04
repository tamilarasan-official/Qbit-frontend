import { API_URL } from '@/lib/api/core'

/**
 * Realtime client backed by the backend's WebSocket hub.
 *
 * Every public method keeps the signature it had under Supabase Realtime, so
 * the four pages that use `quizRealtime` (mentor lobby, mentor live, student
 * lobby, student quiz) need no changes.
 *
 * What changed underneath:
 *   - One WebSocket for the whole tab instead of a channel-per-subscription.
 *   - Automatic reconnect with backoff, and re-subscription after reconnect.
 *     The old client silently stopped receiving events if the socket dropped;
 *     a student whose laptop slept mid-quiz never saw another question.
 *   - No dependency on "Enable Realtime" being ticked per-table in a dashboard.
 *     The server publishes at the point of write.
 */

type Handler = (payload: any) => void

interface Subscription {
  readonly channel: string
  readonly event: string
  readonly handler: Handler
}

const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 15_000

class RealtimeConnection {
  private socket: WebSocket | null = null
  private readonly subscriptions = new Set<Subscription>()
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionallyClosed = false

  private get url(): string {
    // http -> ws, https -> wss
    return `${API_URL.replace(/^http/, 'ws')}/realtime`
  }

  private connect(): void {
    if (typeof window === 'undefined') return
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.intentionallyClosed = false
    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempts = 0
      // Re-declare every subscription: the server holds no state across sockets.
      for (const channel of this.activeChannels()) {
        socket.send(JSON.stringify({ type: 'subscribe', channel }))
      }
    }

    socket.onmessage = (event) => {
      let message: { channel?: string; event?: string; payload?: unknown; type?: string }
      try {
        message = JSON.parse(event.data as string)
      } catch {
        return
      }
      if (!message.channel || !message.event) return

      for (const sub of this.subscriptions) {
        if (sub.channel === message.channel && sub.event === message.event) {
          try {
            sub.handler(message.payload)
          } catch (err) {
            console.error('[realtime] handler threw', err)
          }
        }
      }
    }

    socket.onclose = () => {
      this.socket = null
      if (!this.intentionallyClosed && this.subscriptions.size > 0) this.scheduleReconnect()
    }

    socket.onerror = () => {
      // onclose always follows; reconnect is handled there.
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    // Exponential backoff with jitter, so a server restart does not produce a
    // synchronised reconnect storm from every student in the room.
    const base = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS)
    const delay = base / 2 + Math.random() * (base / 2)
    this.reconnectAttempts += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private activeChannels(): Set<string> {
    const channels = new Set<string>()
    for (const sub of this.subscriptions) channels.add(sub.channel)
    return channels
  }

  subscribe(channel: string, event: string, handler: Handler): () => void {
    const subscription: Subscription = { channel, event, handler }
    const isNewChannel = !this.activeChannels().has(channel)

    this.subscriptions.add(subscription)
    this.connect()

    if (isNewChannel && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', channel }))
    }

    return () => {
      this.subscriptions.delete(subscription)
      // Only tell the server to stop when nothing else needs this channel.
      if (!this.activeChannels().has(channel) && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', channel }))
      }
    }
  }

  unsubscribeChannel(channel: string): void {
    for (const sub of [...this.subscriptions]) {
      if (sub.channel === channel) this.subscriptions.delete(sub)
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', channel }))
    }
  }

  closeAll(): void {
    this.subscriptions.clear()
    this.intentionallyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
  }
}

const connection = new RealtimeConnection()

export class QuizRealtimeClient {
  /** channelName -> teardown functions registered under it. */
  private readonly teardowns = new Map<string, Array<() => void>>()

  private track(channelName: string, unsubscribe: () => void): void {
    const existing = this.teardowns.get(channelName) ?? []
    existing.push(unsubscribe)
    this.teardowns.set(channelName, existing)
  }

  /**
   * Subscribe to session lobby updates (participant join/leave).
   */
  subscribeLobby(
    sessionCode: string,
    callbacks: {
      onParticipantJoined?: (payload: any) => void
      onParticipantLeft?: (payload: any) => void
      onQuizStarting?: (payload: any) => void
    }
  ) {
    const channel = `lobby:${sessionCode}`
    this.unsubscribe(channel)

    if (callbacks.onParticipantJoined) {
      this.track(channel, connection.subscribe(channel, 'participant_joined', callbacks.onParticipantJoined))
    }
    if (callbacks.onParticipantLeft) {
      this.track(channel, connection.subscribe(channel, 'participant_left', callbacks.onParticipantLeft))
    }
    if (callbacks.onQuizStarting) {
      this.track(channel, connection.subscribe(channel, 'quiz_starting', callbacks.onQuizStarting))
    }

    return { channel }
  }

  /**
   * Subscribe to an active quiz session.
   */
  subscribeQuiz(
    sessionId: string,
    callbacks: {
      onQuestionStart?: (payload: any) => void
      onAnswerSubmitted?: (payload: any) => void
      onQuestionEnd?: (payload: any) => void
      onLeaderboardUpdate?: (payload: any) => void
      onQuizFinished?: (payload: any) => void
    }
  ) {
    const channel = `session:${sessionId}`
    this.unsubscribe(channel)

    const pairs: Array<[string, ((payload: any) => void) | undefined]> = [
      ['question_start', callbacks.onQuestionStart],
      ['answer_submitted', callbacks.onAnswerSubmitted],
      ['question_end', callbacks.onQuestionEnd],
      ['leaderboard_update', callbacks.onLeaderboardUpdate],
      ['quiz_finished', callbacks.onQuizFinished],
    ]

    for (const [event, handler] of pairs) {
      if (handler) this.track(channel, connection.subscribe(channel, event, handler))
    }

    return { channel }
  }

  /**
   * Row-level changes on session_participants for one session.
   * Payload shape matches the old postgres_changes callback: { eventType, new, old }.
   */
  subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    const channel = `participants:${sessionId}`
    this.unsubscribe(channel)
    this.track(channel, connection.subscribe(channel, 'postgres_changes', callback))
    return { channel }
  }

  /**
   * Status changes on the session itself.
   */
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    const channel = `session:${sessionId}`
    this.unsubscribe(channel)
    this.track(channel, connection.subscribe(channel, 'postgres_changes', callback))
    return { channel }
  }

  /**
   * New answer submissions in a session.
   */
  subscribeToAnswers(sessionId: string, callback: (payload: any) => void) {
    const channel = `answers:${sessionId}`
    this.unsubscribe(channel)
    this.track(channel, connection.subscribe(channel, 'postgres_changes', callback))
    return { channel }
  }

  /**
   * Kept for signature compatibility. Clients no longer broadcast directly --
   * events originate from the server at the point of the write, so a client
   * cannot fabricate a "quiz finished" event for everyone else.
   */
  async broadcast(_channelName: string, _event: string, _payload: any): Promise<void> {
    console.warn(
      '[realtime] client broadcast is not supported; events are published by the server'
    )
  }

  unsubscribe(channelName: string): void {
    const teardowns = this.teardowns.get(channelName)
    if (!teardowns) return
    for (const teardown of teardowns) teardown()
    this.teardowns.delete(channelName)
  }

  unsubscribeAll(): void {
    for (const channel of [...this.teardowns.keys()]) this.unsubscribe(channel)
    connection.closeAll()
  }
}

// Singleton instance, unchanged from the Supabase version.
export const quizRealtime = new QuizRealtimeClient()
