import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate } from '../middleware/authenticate.js'

const prefsSchema = z.object({
  scheduleAlerts: z.boolean().optional(),
  confirmReminder: z.boolean().optional(),
  preheatProgress: z.boolean().optional(),
  queueChanges: z.boolean().optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export async function preferencesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.patch('/', async (req, reply) => {
    const parsed = prefsSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    // Merge incoming prefs with existing prefs
    const result = await db.query<{ notification_prefs: Record<string, boolean> }>(
      `UPDATE users
       SET notification_prefs = notification_prefs || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING notification_prefs`,
      [JSON.stringify(parsed.data), req.userId],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    return reply.send({ notificationPrefs: result.rows[0].notification_prefs })
  })
}
