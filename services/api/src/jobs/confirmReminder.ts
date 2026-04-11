import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { sendPushNotification } from '../lib/push.js'

// Track which requests have already been notified so we don't spam
const notified = new Set<string>()

export function startConfirmReminderJob(app: FastifyInstance) {
  const INTERVAL_MS = 60_000

  async function run() {
    try {
      // Find 'waiting' requests whose confirmation window JUST opened
      // (opens within the past 90 seconds to catch the 60s polling gap)
      const openRequests = await db.query<{
        id: string
        pilot_id: string
        engine_start_time: string
        confirm_deadline: string
        tail_number: string
      }>(
        `SELECT r.id, r.pilot_id, r.engine_start_time, r.confirm_deadline, a.tail_number
         FROM preheat_requests r
         JOIN aircraft a ON a.id = r.aircraft_id
         WHERE r.status = 'waiting'
           AND r.confirm_opens_at <= NOW()
           AND r.confirm_opens_at >= NOW() - INTERVAL '90 seconds'`,
      )

      for (const req of openRequests.rows) {
        if (notified.has(req.id)) continue
        notified.add(req.id)

        const pilotResult = await db.query<{ push_token: string | null }>(
          'SELECT push_token FROM users WHERE id = $1',
          [req.pilot_id],
        )
        const pushToken = pilotResult.rows[0]?.push_token
        if (pushToken) {
          const engineTime = new Date(req.engine_start_time).toISOString().slice(11, 16)
          const deadline = new Date(req.confirm_deadline).toISOString().slice(11, 16)
          void sendPushNotification([
            {
              to: pushToken,
              title: `Confirm ${req.tail_number} now`,
              body: `Engine start ${engineTime} UTC — confirm by ${deadline} UTC or your slot will be released.`,
              sound: 'default',
              data: { requestId: req.id, screen: 'confirm' },
            },
          ])
          app.log.info({ requestId: req.id, pilotId: req.pilot_id }, 'Sent confirmation reminder')
        }
      }

      // Clean up notified set for old requests (older than 2 hours)
      if (notified.size > 1000) notified.clear()
    } catch (err) {
      app.log.error(err, 'Confirm reminder job failed')
    }
  }

  const timer = setInterval(() => {
    void run()
  }, INTERVAL_MS)
  void run()
  app.addHook('onClose', () => {
    clearInterval(timer)
  })
  app.log.info('Confirm reminder job started (interval: 60s)')
}
