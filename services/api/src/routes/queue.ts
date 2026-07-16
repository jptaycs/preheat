import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { broadcast } from '../lib/broadcast.js'
import { DEFAULT_DURATION_MIN, MIN_DURATION_MIN, MAX_DURATION_MIN } from '../config/queue.js'

const mechanic = requireRole('mechanic')

const adjustDurationBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deltaMinutes: z
    .number()
    .int()
    .min(-30)
    .max(30)
    .refine((v) => v !== 0, 'deltaMinutes must not be zero'),
})

// eslint-disable-next-line @typescript-eslint/require-await
export async function queueRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /queue?date=YYYY-MM-DD — full day queue with stats
  app.get<{ Querystring: { date?: string } }>('/', async (req, reply) => {
    const date = req.query.date // undefined means "all dates"

    const rows = await db.query<{
      id: string
      queue_position: number
      request_date: string
      engine_start_time: string
      assigned_time: string
      confirm_opens_at: string
      confirm_deadline: string
      status: string
      notes: string | null
      pilot_first_name: string
      tail_number: string
      aircraft_type: string
      is_mine: boolean
      session_id: string | null
    }>(
      date
        ? `SELECT
             r.id, r.queue_position, r.request_date,
             r.engine_start_time, r.assigned_time,
             r.confirm_opens_at, r.confirm_deadline,
             r.status, r.notes,
             split_part(u.name, ' ', 1) AS pilot_first_name,
             a.tail_number, a.type AS aircraft_type,
             (r.pilot_id = $2) AS is_mine,
             s.id AS session_id
           FROM preheat_requests r
           JOIN users u ON u.id = r.pilot_id
           JOIN aircraft a ON a.id = r.aircraft_id
           LEFT JOIN preheat_sessions s ON s.request_id = r.id
           WHERE r.request_date = $1
             AND r.status NOT IN ('cancelled')
           ORDER BY r.queue_position ASC`
        : `SELECT
             r.id, r.queue_position, r.request_date,
             r.engine_start_time, r.assigned_time,
             r.confirm_opens_at, r.confirm_deadline,
             r.status, r.notes,
             split_part(u.name, ' ', 1) AS pilot_first_name,
             a.tail_number, a.type AS aircraft_type,
             (r.pilot_id = $1) AS is_mine,
             s.id AS session_id
           FROM preheat_requests r
           JOIN users u ON u.id = r.pilot_id
           JOIN aircraft a ON a.id = r.aircraft_id
           LEFT JOIN preheat_sessions s ON s.request_id = r.id
           WHERE r.status NOT IN ('cancelled')
           ORDER BY r.request_date ASC, r.queue_position ASC`,
      date ? [date, req.userId] : [req.userId],
    )

    const entries = rows.rows.map((r) => ({
      id: r.id,
      queuePosition: r.queue_position,
      engineStartTime: r.engine_start_time,
      assignedTime: r.assigned_time,
      confirmOpensAt: r.confirm_opens_at,
      confirmDeadline: r.confirm_deadline,
      status: r.status,
      notes: r.notes ?? undefined,
      pilotFirstName: r.pilot_first_name,
      tailNumber: r.tail_number,
      aircraftType: r.aircraft_type,
      isMine: r.is_mine,
      sessionId: r.session_id ?? undefined,
    }))
    const stats = {
      waiting: entries.filter((e) => e.status === 'waiting').length,
      confirmed: entries.filter((e) => e.status === 'confirmed').length,
      active: entries.filter((e) => e.status === 'active').length,
      completed: entries.filter((e) => e.status === 'completed').length,
    }

    return reply.send({ date: date ?? 'all', entries, stats })
  })

  // DELETE /queue/:id — mechanic cancels a waiting or confirmed request on behalf of a pilot
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: [mechanic] }, async (req, reply) => {
    const result = await db.query<{
      id: string
      queue_position: number
      request_date: string
      status: string
    }>(
      `SELECT id, queue_position, request_date, status
         FROM preheat_requests
         WHERE id = $1`,
      [req.params.id],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Preheat request not found',
      })
    }

    const row = result.rows[0]!

    if (row.status === 'cancelled') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Request is already cancelled',
      })
    }

    if (row.status === 'active' || row.status === 'completed') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Cannot cancel a request that is already ${row.status}`,
      })
    }

    await db.query(
      `UPDATE preheat_requests
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
      [req.params.id],
    )

    await db.query(
      `UPDATE preheat_requests
         SET queue_position = queue_position - 1, updated_at = NOW()
         WHERE request_date = $1
           AND queue_position > $2
           AND status NOT IN ('cancelled')`,
      [row.request_date, row.queue_position],
    )

    broadcast(app, 'queue.updated', { requestDate: row.request_date })
    return reply.status(200).send({ success: true })
  })

  // POST /queue/adjust-duration — bulk-adjust heating time for a whole day's queue
  // (weather changed: add or remove minutes for every queued plane at once)
  app.post('/adjust-duration', { preHandler: [mechanic] }, async (req, reply) => {
    const parsed = adjustDurationBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }
    const { date, deltaMinutes } = parsed.data

    // Queued planes: bump the planned duration (clamped) and move the heating
    // start so the aircraft is still ready by its engine start time.
    const requests = await db.query<{ id: string }>(
      `UPDATE preheat_requests
       SET preferred_duration_minutes =
             LEAST(GREATEST(COALESCE(preferred_duration_minutes, $3) + $1, $4), $5),
           assigned_time = engine_start_time
             - make_interval(mins =>
                 LEAST(GREATEST(COALESCE(preferred_duration_minutes, $3) + $1, $4), $5)),
           updated_at = NOW()
       WHERE request_date = $2
         AND status IN ('waiting', 'confirmed')
       RETURNING id`,
      [deltaMinutes, date, DEFAULT_DURATION_MIN, MIN_DURATION_MIN, MAX_DURATION_MIN],
    )

    // Planes already heating: extend/shorten the running session timer.
    const sessions = await db.query<{ id: string; duration_minutes: number }>(
      `UPDATE preheat_sessions s
       SET duration_minutes = LEAST(GREATEST(s.duration_minutes + $1, $3), $4),
           updated_at = NOW()
       FROM preheat_requests r
       WHERE r.id = s.request_id
         AND r.request_date = $2
         AND s.completed_at IS NULL
       RETURNING s.id, s.duration_minutes`,
      [deltaMinutes, date, MIN_DURATION_MIN, MAX_DURATION_MIN],
    )

    for (const s of sessions.rows) {
      broadcast(app, 'timer.updated', {
        sessionId: s.id,
        durationMinutes: s.duration_minutes,
      })
    }
    broadcast(app, 'queue.updated', { requestDate: date })

    return reply.send({
      success: true,
      deltaMinutes,
      adjustedRequests: requests.rowCount ?? 0,
      adjustedSessions: sessions.rowCount ?? 0,
    })
  })
}
