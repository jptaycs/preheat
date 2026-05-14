import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { broadcast } from '../lib/broadcast.js'
import { sendPushNotification } from '../lib/push.js'
import { DEFAULT_DURATION_MIN, MIN_DURATION_MIN, MAX_DURATION_MIN } from '../config/queue.js'

const startSessionBody = z.object({
  requestId: z.string().uuid(),
  durationMinutes: z.number().int().min(MIN_DURATION_MIN).max(MAX_DURATION_MIN).optional(),
})

const addReadingBody = z.object({
  tempCelsius: z.number().min(-60).max(60),
})

const mechanic = requireRole('mechanic')

// eslint-disable-next-line @typescript-eslint/require-await
export async function preheatSessionRoutes(app: FastifyInstance) {
  // All session routes require authentication
  app.addHook('preHandler', authenticate)

  // POST /preheat-sessions — start a session (mechanic only)
  app.post('/', { preHandler: [mechanic] }, async (req, reply) => {
    const parsed = startSessionBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const { requestId } = parsed.data

    // Verify request exists and is confirmed
    const reqResult = await db.query<{
      id: string
      status: string
      pilot_id: string
      request_date: string
    }>(`SELECT id, status, pilot_id, request_date FROM preheat_requests WHERE id = $1`, [requestId])

    if (reqResult.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Preheat request not found',
      })
    }

    const preheatRequest = reqResult.rows[0]

    if (preheatRequest.status !== 'confirmed') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Cannot start session: request status is '${preheatRequest.status}' (must be 'confirmed')`,
      })
    }

    // Check no active session already exists
    const existing = await db.query(`SELECT id FROM preheat_sessions WHERE request_id = $1`, [
      requestId,
    ])
    if ((existing.rowCount ?? 0) > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'A session already exists for this request',
      })
    }

    // Create session + mark request active
    const session = await db.query<{ id: string; started_at: string }>(
      `INSERT INTO preheat_sessions (request_id, mechanic_id, duration_minutes)
       VALUES ($1, $2, $3)
       RETURNING id, started_at`,
      [requestId, req.userId, parsed.data.durationMinutes ?? DEFAULT_DURATION_MIN],
    )

    await db.query(
      `UPDATE preheat_requests SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [requestId],
    )

    const row = session.rows[0]!
    broadcast(app, 'session.started', { sessionId: row.id, requestId })
    broadcast(app, 'queue.updated', { requestDate: preheatRequest.request_date })

    // Push notification to pilot (if preheat progress notifications are enabled)
    const pilotPushResult = await db.query<{
      push_token: string | null
      notification_prefs: { preheatProgress?: boolean } | null
      tail_number: string
    }>(
      `SELECT u.push_token, u.notification_prefs, a.tail_number
       FROM users u
       JOIN preheat_requests r ON r.pilot_id = u.id
       JOIN aircraft a ON a.id = r.aircraft_id
       WHERE r.id = $1`,
      [requestId],
    )
    const pilotPush = pilotPushResult.rows[0]
    if (pilotPush?.push_token && pilotPush.notification_prefs?.preheatProgress !== false) {
      void sendPushNotification([
        {
          to: pilotPush.push_token,
          title: 'Preheat Started',
          body: `Preheat for ${pilotPush.tail_number} has begun. We'll notify you when it's done.`,
          sound: 'default',
          data: { requestId, screen: 'track' },
        },
      ])
    }

    return reply.status(201).send({ id: row.id, startedAt: row.started_at })
  })

  // POST /preheat-sessions/:id/reading — log temperature (mechanic only)
  app.post<{ Params: { id: string } }>(
    '/:id/reading',
    { preHandler: [mechanic] },
    async (req, reply) => {
      const parsed = addReadingBody.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'tempCelsius must be a number between -60 and 60',
        })
      }

      const { tempCelsius } = parsed.data

      // Verify session exists
      const sessionResult = await db.query<{
        id: string
        request_id: string
        completed_at: string | null
      }>(`SELECT id, request_id, completed_at FROM preheat_sessions WHERE id = $1`, [req.params.id])
      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Session not found',
        })
      }
      if (sessionResult.rows[0].completed_at) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Cannot add readings to a completed session',
        })
      }

      const reading = await db.query<{ id: string; temp_celsius: number; recorded_at: string }>(
        `INSERT INTO session_readings (session_id, temp_celsius)
         VALUES ($1, $2)
         RETURNING id, temp_celsius, recorded_at`,
        [req.params.id, tempCelsius],
      )

      // Update current temp on session
      await db.query(
        `UPDATE preheat_sessions SET current_temp_celsius = $1, updated_at = NOW() WHERE id = $2`,
        [tempCelsius, req.params.id],
      )

      broadcast(app, 'temp.updated', {
        sessionId: req.params.id,
        tempCelsius,
        recordedAt: reading.rows[0]!.recorded_at,
      })

      const r = reading.rows[0]!
      return reply
        .status(201)
        .send({ id: r.id, tempCelsius: r.temp_celsius, recordedAt: r.recorded_at })
    },
  )

  // POST /preheat-sessions/:id/complete — mark session done (mechanic only)
  app.post<{ Params: { id: string } }>(
    '/:id/complete',
    { preHandler: [mechanic] },
    async (req, reply) => {
      const sessionResult = await db.query<{
        id: string
        request_id: string
        completed_at: string | null
      }>(`SELECT id, request_id, completed_at FROM preheat_sessions WHERE id = $1`, [req.params.id])
      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Session not found',
        })
      }
      if (sessionResult.rows[0].completed_at) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Session is already completed',
        })
      }

      const { request_id } = sessionResult.rows[0] as {
        id: string
        request_id: string
        completed_at: string | null
      }

      await db.query(
        `UPDATE preheat_sessions SET completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.id],
      )

      await db.query(
        `UPDATE preheat_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [request_id],
      )

      // Get request date for broadcast + pilot push token
      const reqResult = await db.query<{
        request_date: string
        pilot_id: string
        engine_start_time: string
      }>(`SELECT request_date, pilot_id, engine_start_time FROM preheat_requests WHERE id = $1`, [
        request_id,
      ])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const preheatReq = reqResult.rows[0]

      if (preheatReq) {
        broadcast(app, 'session.completed', { sessionId: req.params.id, requestId: request_id })
        broadcast(app, 'queue.updated', { requestDate: preheatReq.request_date })

        // Push notification to pilot (if preheat progress notifications are enabled)
        const pilotResult = await db.query<{
          push_token: string | null
          notification_prefs: { preheatProgress?: boolean } | null
        }>('SELECT push_token, notification_prefs FROM users WHERE id = $1', [preheatReq.pilot_id])
        const { push_token: pushToken, notification_prefs: prefs } = pilotResult.rows[0] ?? {}
        if (pushToken && prefs?.preheatProgress !== false) {
          void sendPushNotification([
            {
              to: pushToken,
              title: 'Aircraft Ready',
              body: `Your aircraft preheat is complete. Engine start time: ${new Date(preheatReq.engine_start_time).toISOString().slice(11, 16)} UTC`,
              sound: 'default',
              data: { requestId: request_id, screen: 'track' },
            },
          ])
        }
      }

      return reply.send({ success: true, completedAt: new Date().toISOString() })
    },
  )

  // PATCH /preheat-sessions/:id/duration — update timer duration (mechanic only)
  const updateDurationSchema = z.object({
    durationMinutes: z.number().int().min(MIN_DURATION_MIN).max(MAX_DURATION_MIN),
  })

  app.patch('/:id/duration', { preHandler: [mechanic] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = updateDurationSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues,
      })
    }

    const result = await db.query(
      `UPDATE preheat_sessions
         SET duration_minutes = $1, updated_at = NOW()
         WHERE id = $2 AND completed_at IS NULL
         RETURNING *`,
      [parsed.data.durationMinutes, id],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found or already completed',
      })
    }

    broadcast(app, 'timer.updated', {
      sessionId: id,
      durationMinutes: parsed.data.durationMinutes,
    })

    return { success: true, durationMinutes: parsed.data.durationMinutes }
  })

  // GET /preheat-sessions/:id — session detail with readings (mechanic only)
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [mechanic] }, async (req, reply) => {
    const session = await db.query<{
      id: string
      request_id: string
      mechanic_id: string
      current_temp_celsius: number | null
      duration_minutes: number
      started_at: string
      completed_at: string | null
    }>(
      `SELECT id, request_id, mechanic_id, current_temp_celsius, duration_minutes, started_at, completed_at
       FROM preheat_sessions WHERE id = $1`,
      [req.params.id],
    )
    if (session.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Session not found',
      })
    }

    const readings = await db.query<{ id: string; temp_celsius: number; recorded_at: string }>(
      `SELECT id, temp_celsius, recorded_at
       FROM session_readings WHERE session_id = $1
       ORDER BY recorded_at ASC`,
      [req.params.id],
    )

    const s = session.rows[0]!
    return reply.send({
      id: s.id,
      requestId: s.request_id,
      mechanicId: s.mechanic_id,
      currentTempCelsius: s.current_temp_celsius,
      durationMinutes: Number(s.duration_minutes),
      startedAt: s.started_at,
      completedAt: s.completed_at,
      readings: readings.rows.map((r) => ({
        id: r.id,
        tempCelsius: r.temp_celsius,
        recordedAt: r.recorded_at,
      })),
    })
  })

  // GET /preheat-sessions/by-request/:requestId — pilot or mechanic view (auth only)
  app.get<{ Params: { requestId: string } }>('/by-request/:requestId', async (req, reply) => {
    // Pilots may only view sessions for their own requests
    if (req.userRole === 'pilot') {
      const ownerCheck = await db.query(
        `SELECT id FROM preheat_requests WHERE id = $1 AND pilot_id = $2`,
        [req.params.requestId, req.userId],
      )
      if (ownerCheck.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'No session found for this request',
        })
      }
    }

    const session = await db.query<{
      id: string
      request_id: string
      current_temp_celsius: number | null
      duration_minutes: number
      started_at: string
      completed_at: string | null
    }>(
      `SELECT id, request_id, current_temp_celsius, duration_minutes, started_at, completed_at
       FROM preheat_sessions WHERE request_id = $1`,
      [req.params.requestId],
    )
    if (session.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No session found for this request',
      })
    }

    const readings = await db.query<{ id: string; temp_celsius: number; recorded_at: string }>(
      `SELECT id, temp_celsius, recorded_at
       FROM session_readings WHERE session_id = $1
       ORDER BY recorded_at ASC`,
      [session.rows[0]!.id],
    )

    const s = session.rows[0]!
    return reply.send({
      id: s.id,
      requestId: s.request_id,
      currentTempCelsius: s.current_temp_celsius,
      durationMinutes: Number(s.duration_minutes),
      startedAt: s.started_at,
      completedAt: s.completed_at,
      readings: readings.rows.map((r) => ({
        id: r.id,
        tempCelsius: r.temp_celsius,
        recordedAt: r.recorded_at,
      })),
    })
  })
}
