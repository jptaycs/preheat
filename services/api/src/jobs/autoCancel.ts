import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { broadcast } from '../lib/broadcast.js'
import { sendPushNotification } from '../lib/push.js'
import { JOB_INTERVAL_MS } from '../config/queue.js'

// ── Auto-cancel job ──────────────────────────────────────────────────────────
//
// Rules from AeroFluxPro operational group:
//   - Rule #3: Pilot must confirm 40–30 min before engine start
//   - Rule #4: If not confirmed → preheat NOT executed
//   - Rule #5: Slot opens ONLY after explicit cancellation.
//              No-show does NOT release the slot automatically.
//
// This job runs every minute and auto-cancels 'waiting' requests whose
// confirm_deadline has passed. This is the enforcement of Rule #4:
// the system cancels the slot when the window closes without a confirmation,
// which then acts as the explicit system-generated cancellation (Rule #5
// does not block system cancellations, only pilot "jump-the-line" attempts).
//
export function startAutoCancelJob(app: FastifyInstance) {
  const INTERVAL_MS = JOB_INTERVAL_MS

  async function run() {
    try {
      // Find all 'waiting' requests whose confirm_deadline has passed
      const expired = await db.query<{
        id: string
        queue_position: number
        request_date: string
        pilot_id: string
        engine_start_time: string
      }>(
        `SELECT id, queue_position, request_date, pilot_id, engine_start_time
         FROM preheat_requests
         WHERE status = 'waiting'
           AND confirm_deadline < NOW()`,
      )

      if (expired.rows.length === 0) return

      const affectedDates = new Set<string>()

      for (const req of expired.rows) {
        // Cancel the unconfirmed request
        await db.query(
          `UPDATE preheat_requests
           SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [req.id],
        )

        // Shift subsequent active queue positions down
        await db.query(
          `UPDATE preheat_requests
           SET queue_position = queue_position - 1, updated_at = NOW()
           WHERE request_date = $1
             AND queue_position > $2
             AND status NOT IN ('cancelled')`,
          [req.request_date, req.queue_position],
        )

        affectedDates.add(req.request_date)

        // Send push notification to the pilot
        const pilotResult = await db.query<{ push_token: string | null }>(
          'SELECT push_token FROM users WHERE id = $1',
          [req.pilot_id],
        )
        const pushToken = pilotResult.rows[0]?.push_token
        if (pushToken) {
          void sendPushNotification([
            {
              to: pushToken,
              title: 'Preheat Slot Cancelled',
              body: `Your preheat slot (engine start ${new Date(req.engine_start_time).toISOString().slice(11, 16)} UTC) was cancelled because confirmation window closed without a response.`,
              sound: 'default',
              data: { requestId: req.id },
            },
          ])
        }
        app.log.info(
          { requestId: req.id, pilotId: req.pilot_id, engineStartTime: req.engine_start_time },
          'Auto-cancelled unconfirmed preheat request',
        )
      }

      // Broadcast queue updates for all affected dates
      for (const date of affectedDates) {
        broadcast(app, 'queue.updated', { requestDate: date })
      }
    } catch (err) {
      app.log.error(err, 'Auto-cancel job failed')
    }
  }

  const timer = setInterval(() => {
    void run()
  }, INTERVAL_MS)

  // Run immediately on startup
  void run()

  // Clean up on app close
  app.addHook('onClose', () => {
    clearInterval(timer)
  })

  app.log.info('Auto-cancel job started (interval: 60s)')
}
