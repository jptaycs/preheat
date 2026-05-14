import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { broadcast } from '../lib/broadcast.js'
import { sendPushNotification } from '../lib/push.js'
import { JOB_INTERVAL_MS } from '../config/queue.js'

interface ExpiredSessionRow {
  session_id: string
  request_id: string
  started_at: string
  duration_minutes: number
  pilot_id: string
  aircraft_id: string
  pilot_push_token: string | null
  pilot_notification_prefs: { preheatProgress?: boolean } | null
  mechanic_push_token: string | null
  tail_number: string
}

export function startTimerExpiryJob(app: FastifyInstance) {
  const seen = new Set<string>()

  const timer = setInterval(() => {
    void (async () => {
      try {
        const result = await db.query<ExpiredSessionRow>(
          `SELECT s.id AS session_id, s.request_id, s.started_at, s.duration_minutes,
                  r.pilot_id, r.aircraft_id,
                  u.push_token AS pilot_push_token,
                  u.notification_prefs AS pilot_notification_prefs,
                  m.push_token AS mechanic_push_token,
                  a.tail_number
           FROM preheat_sessions s
           JOIN preheat_requests r ON r.id = s.request_id
           JOIN users u ON u.id = r.pilot_id
           JOIN users m ON m.id = s.mechanic_id
           JOIN aircraft a ON a.id = r.aircraft_id
           WHERE s.completed_at IS NULL
             AND s.started_at + (s.duration_minutes || ' minutes')::interval <= NOW()`,
        )

        for (const row of result.rows) {
          const sid = row.session_id
          if (seen.has(sid)) continue
          seen.add(sid)

          broadcast(app, 'timer.expired', {
            sessionId: sid,
            requestId: row.request_id,
          })

          const tail = row.tail_number
          const messages: {
            to: string
            title: string
            body: string
            data?: Record<string, unknown>
            sound?: 'default'
          }[] = []

          if (row.pilot_push_token && row.pilot_notification_prefs?.preheatProgress !== false) {
            messages.push({
              to: row.pilot_push_token,
              title: 'Preheat Timer Done',
              body: `Preheat for ${tail} has reached the set time. Aircraft should be ready soon.`,
              data: { requestId: row.request_id, screen: 'track' },
              sound: 'default',
            })
          }

          if (row.mechanic_push_token) {
            messages.push({
              to: row.mechanic_push_token,
              title: 'Timer Expired',
              body: `Preheat timer for ${tail} is up. Check the aircraft.`,
              data: { requestId: row.request_id, screen: 'track' },
              sound: 'default',
            })
          }

          if (messages.length > 0) {
            void sendPushNotification(messages)
          }

          app.log.info(
            { sessionId: sid, requestId: row.request_id },
            'Timer expired — notifications sent',
          )
        }

        // Prune seen: remove sessions no longer in the query result (they've been completed)
        const currentIds = new Set(result.rows.map((r) => r.session_id))
        for (const id of seen) {
          if (!currentIds.has(id)) seen.delete(id)
        }
      } catch (e) {
        app.log.error(e, 'Timer expiry job error')
      }
    })()
  }, JOB_INTERVAL_MS)

  app.addHook('onClose', () => {
    clearInterval(timer)
  })

  app.log.info(`Timer expiry job started (interval: ${JOB_INTERVAL_MS / 1000}s)`)
}
