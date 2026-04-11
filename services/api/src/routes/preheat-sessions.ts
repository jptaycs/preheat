import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { broadcast } from '../lib/broadcast.js'
import { sendPushNotification } from '../lib/push.js'

const startSessionBody = z.object({
  requestId: z.string().uuid(),
})

const addReadingBody = z.object({
  tempCelsius: z.number().min(-60).max(60),
})

// eslint-disable-next-line @typescript-eslint/require-await
export async function preheatSessionRoutes(app: FastifyInstance) {
  // All session routes require mechanic role
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireRole('mechanic'))

  // POST /preheat-sessions — start a session
  app.post('/', async (req, reply) => {
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
      `INSERT INTO preheat_sessions (request_id, mechanic_id)
       VALUES ($1, $2)
       RETURNING id, started_at`,
      [requestId, req.userId],
    )

    await db.query(
      `UPDATE preheat_requests SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [requestId],
    )

    broadcast(app, 'session.started', { sessionId: session.rows[0]!.id, requestId })
    broadcast(app, 'queue.updated', { requestDate: preheatRequest.request_date })

    return reply.status(201).send(session.rows[0])
  })

  // POST /preheat-sessions/:id/reading — log temperature
  app.post<{ Params: { id: string } }>('/:id/reading', async (req, reply) => {
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

    return reply.status(201).send(reading.rows[0])
  })

  // POST /preheat-sessions/:id/complete — mark session done
  app.post<{ Params: { id: string } }>('/:id/complete', async (req, reply) => {
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
    const preheatRequest = reqResult.rows[0]

    if (preheatRequest) {
      broadcast(app, 'session.completed', { sessionId: req.params.id, requestId: request_id })
      broadcast(app, 'queue.updated', { requestDate: preheatRequest.request_date })

      // Push notification to pilot
      const pilotResult = await db.query<{ push_token: string | null }>(
        'SELECT push_token FROM users WHERE id = $1',
        [preheatRequest.pilot_id],
      )
      const pushToken = pilotResult.rows[0]?.push_token
      if (pushToken) {
        void sendPushNotification([
          {
            to: pushToken,
            title: 'Aircraft Ready',
            body: `Your aircraft preheat is complete. Engine start time: ${new Date(preheatRequest.engine_start_time).toISOString().slice(11, 16)} UTC`,
            sound: 'default',
            data: { requestId: request_id, screen: 'track' },
          },
        ])
      }
    }

    return reply.send({ success: true, completedAt: new Date().toISOString() })
  })

  // GET /preheat-sessions/:id — session detail with readings
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const session = await db.query<{
      id: string
      request_id: string
      mechanic_id: string
      current_temp_celsius: number | null
      started_at: string
      completed_at: string | null
    }>(
      `SELECT id, request_id, mechanic_id, current_temp_celsius, started_at, completed_at
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

    return reply.send({ ...session.rows[0], readings: readings.rows })
  })

  // GET /preheat-sessions/by-request/:requestId — for pilot view (no role restriction beyond auth)
  app.get<{ Params: { requestId: string } }>('/by-request/:requestId', async (req, reply) => {
    const session = await db.query<{
      id: string
      request_id: string
      current_temp_celsius: number | null
      started_at: string
      completed_at: string | null
    }>(
      `SELECT id, request_id, current_temp_celsius, started_at, completed_at
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

    return reply.send({ ...session.rows[0], readings: readings.rows })
  })
}
