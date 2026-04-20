import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate } from '../middleware/authenticate.js'
import { broadcast } from '../lib/broadcast.js'

import {
  PREHEAT_DURATION_MIN,
  SLOT_SPACING_MIN,
  CONFIRM_OPENS_MIN,
  CONFIRM_DEADLINE_MIN,
  BOOKING_OPENS_HOUR,
} from '../config/queue.js'

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function subMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000)
}

// ── Validation ───────────────────────────────────────────────────────────────

const createRequestBody = z.object({
  aircraftId: z.string().uuid(),
  engineStartTime: z.string().datetime({ message: 'engineStartTime must be an ISO 8601 datetime' }),
  notes: z.string().max(500).optional(),
})

// ── Routes ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/require-await
export async function preheatRequestRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── POST /preheat-requests ─────────────────────────────────────────────────
  app.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: (req) => req.userId } },
    },
    async (req, reply) => {
      const parsed = createRequestBody.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        })
      }

      const { aircraftId, notes } = parsed.data
      const engineStartTime = new Date(parsed.data.engineStartTime)
      const now = new Date()

      // ── Rule: pilot must own the aircraft ────────────────────────────────────
      const aircraft = await db.query(
        `SELECT id, tail_number FROM aircraft WHERE id = $1 AND pilot_id = $2`,
        [aircraftId, req.userId],
      )
      if (aircraft.rows.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Aircraft not found',
        })
      }

      // ── Rule: engineStartTime must be in the future ──────────────────────────
      const minStartTime = addMinutes(now, CONFIRM_DEADLINE_MIN + 5) // must allow confirmation window
      if (engineStartTime <= minStartTime) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Engine start time must be at least ${CONFIRM_DEADLINE_MIN + 5} minutes in the future`,
        })
      }

      // ── Rule #1: Booking window opens at 19:00 local the day before ──────────
      // engineStartTime date's booking window opened at (engineStartDate - 1 day) at 19:00 UTC
      // NOTE: Using UTC for now; airport timezone config is a future enhancement
      const engineStartDate = new Date(engineStartTime)
      engineStartDate.setUTCHours(0, 0, 0, 0)
      const bookingOpensAt = new Date(engineStartDate)
      bookingOpensAt.setUTCDate(bookingOpensAt.getUTCDate() - 1)
      bookingOpensAt.setUTCHours(BOOKING_OPENS_HOUR, 0, 0, 0)

      if (now < bookingOpensAt) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Booking for this date opens at 19:00 UTC the day before (${bookingOpensAt.toUTCString().slice(0, 16)}).`,
        })
      }

      // ── Rule: no duplicate active request for same aircraft + date ───────────
      const requestDate = engineStartTime.toISOString().slice(0, 10)
      const duplicate = await db.query(
        `SELECT id FROM preheat_requests
       WHERE aircraft_id = $1
         AND request_date = $2
         AND status NOT IN ('cancelled')`,
        [aircraftId, requestDate],
      )
      if (duplicate.rows.length > 0) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'An active preheat request already exists for this aircraft on that date',
        })
      }

      // ── Rule #2: 15-min spacing — new engineStartTime must be ≥ last + 15 min ─
      const lastRequest = await db.query<{ engine_start_time: string; queue_position: number }>(
        `SELECT engine_start_time, queue_position
       FROM preheat_requests
       WHERE request_date = $1
         AND status NOT IN ('cancelled')
       ORDER BY queue_position DESC
       LIMIT 1`,
        [requestDate],
      )

      let queuePosition = 1
      if (lastRequest.rows.length > 0) {
        const lastEngineStart = new Date(lastRequest.rows[0].engine_start_time)
        const minimumStart = addMinutes(lastEngineStart, SLOT_SPACING_MIN)
        if (engineStartTime < minimumStart) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: `Engine start time must be at least ${SLOT_SPACING_MIN} minutes after the last queued request (${lastEngineStart.toISOString()}). Earliest available: ${minimumStart.toISOString()}`,
          })
        }
        queuePosition = lastRequest.rows[0].queue_position + 1
      }

      // ── Derived times ────────────────────────────────────────────────────────
      const assignedTime = subMinutes(engineStartTime, PREHEAT_DURATION_MIN)
      const confirmOpensAt = subMinutes(engineStartTime, CONFIRM_OPENS_MIN)
      const confirmDeadline = subMinutes(engineStartTime, CONFIRM_DEADLINE_MIN)

      // ── Insert ───────────────────────────────────────────────────────────────
      const result = await db.query<{
        id: string
        queue_position: number
        request_date: string
        engine_start_time: string
        assigned_time: string
        confirm_opens_at: string
        confirm_deadline: string
        status: string
        notes: string | null
        created_at: string
      }>(
        `INSERT INTO preheat_requests
         (pilot_id, aircraft_id, queue_position, request_date,
          engine_start_time, assigned_time, confirm_opens_at, confirm_deadline, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING
         id, queue_position, request_date,
         engine_start_time, assigned_time, confirm_opens_at, confirm_deadline,
         status, notes, created_at`,
        [
          req.userId,
          aircraftId,
          queuePosition,
          requestDate,
          engineStartTime.toISOString(),
          assignedTime.toISOString(),
          confirmOpensAt.toISOString(),
          confirmDeadline.toISOString(),
          notes ?? null,
        ],
      )

      const response = {
        ...result.rows[0],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        tailNumber: (aircraft.rows[0] as unknown as { tail_number: string }).tail_number,
      }
      broadcast(app, 'queue.updated', { requestDate: requestDate })
      return reply.status(201).send(response)
    },
  )

  // ── GET /preheat-requests ──────────────────────────────────────────────────
  // Optional query param: ?date=YYYY-MM-DD
  app.get<{ Querystring: { date?: string } }>('/', async (req, reply) => {
    const { date } = req.query

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
      created_at: string
      tail_number: string
      aircraft_type: string
    }>(
      `SELECT
         r.id, r.queue_position, r.request_date,
         r.engine_start_time, r.assigned_time,
         r.confirm_opens_at, r.confirm_deadline,
         r.status, r.notes, r.created_at,
         a.tail_number, a.type AS aircraft_type
       FROM preheat_requests r
       JOIN aircraft a ON a.id = r.aircraft_id
       WHERE r.pilot_id = $1
         ${date ? 'AND r.request_date = $2' : ''}
       ORDER BY r.request_date ASC, r.queue_position ASC`,
      date ? [req.userId, date] : [req.userId],
    )

    return reply.send(rows.rows)
  })

  // ── GET /preheat-requests/:id ──────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const result = await db.query<{
      id: string
      queue_position: number
      request_date: string
      engine_start_time: string
      assigned_time: string
      confirm_opens_at: string
      confirm_deadline: string
      status: string
      confirmed_at: string | null
      cancelled_at: string | null
      notes: string | null
      created_at: string
      tail_number: string
      aircraft_type: string
    }>(
      `SELECT
         r.id, r.queue_position, r.request_date,
         r.engine_start_time, r.assigned_time,
         r.confirm_opens_at, r.confirm_deadline,
         r.status, r.confirmed_at, r.cancelled_at,
         r.notes, r.created_at,
         a.tail_number, a.type AS aircraft_type
       FROM preheat_requests r
       JOIN aircraft a ON a.id = r.aircraft_id
       WHERE r.id = $1 AND r.pilot_id = $2`,
      [req.params.id, req.userId],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Preheat request not found',
      })
    }

    return reply.send(result.rows[0])
  })

  // ── DELETE /preheat-requests/:id — explicit cancel only ───────────────────
  //
  // Rule #5: Slot opens ONLY after explicit cancellation.
  // A no-show (unconfirmed request) does NOT auto-release the slot.
  // That enforcement happens in the auto-cancel job (Session 009).
  //
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const request = await db.query<{
      id: string
      queue_position: number
      request_date: string
      status: string
    }>(
      `SELECT id, queue_position, request_date, status
       FROM preheat_requests
       WHERE id = $1 AND pilot_id = $2`,
      [req.params.id, req.userId],
    )

    if (request.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Preheat request not found',
      })
    }

    const row0 = request.rows[0] as {
      id: string
      queue_position: number
      request_date: string
      status: string
    }
    const { status, queue_position, request_date } = row0

    if (status === 'cancelled') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Request is already cancelled',
      })
    }

    if (status === 'active' || status === 'completed') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Cannot cancel a request that is already ${status}`,
      })
    }

    // Mark as cancelled
    await db.query(
      `UPDATE preheat_requests
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    )

    // Shift subsequent queue positions down by 1
    await db.query(
      `UPDATE preheat_requests
       SET queue_position = queue_position - 1, updated_at = NOW()
       WHERE request_date = $1
         AND queue_position > $2
         AND status NOT IN ('cancelled')`,
      [request_date, queue_position],
    )

    broadcast(app, 'queue.updated', { requestDate: request_date })
    return reply
      .status(200)
      .send({ success: true, message: 'Request cancelled. Slot is now available.' })
  })

  // ── POST /preheat-requests/:id/confirm ────────────────────────────────────
  //
  // Rule #3: Confirmation must happen 40–30 min before engine_start_time.
  // Rule #4: If not confirmed in this window, preheat will not be executed.
  // Rule #5: Only explicit confirmation counts — no-show is not the same as confirmed.
  //
  app.post<{ Params: { id: string } }>('/:id/confirm', async (req, reply) => {
    const result = await db.query<{
      id: string
      status: string
      confirm_opens_at: string
      confirm_deadline: string
      request_date: string
      engine_start_time: string
    }>(
      `SELECT id, status, confirm_opens_at, confirm_deadline, request_date, engine_start_time
       FROM preheat_requests
       WHERE id = $1 AND pilot_id = $2`,
      [req.params.id, req.userId],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Preheat request not found',
      })
    }

    const request = result.rows[0]
    const now = new Date()

    if (request.status === 'confirmed') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Request is already confirmed',
      })
    }

    if (request.status !== 'waiting') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Cannot confirm a request with status '${request.status}'`,
      })
    }

    const windowOpens = new Date(request.confirm_opens_at)
    const windowCloses = new Date(request.confirm_deadline)

    if (now < windowOpens) {
      const minsUntilOpen = Math.ceil((windowOpens.getTime() - now.getTime()) / 60_000)
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Confirmation window not open yet. Opens in ${minsUntilOpen} minutes (at ${windowOpens.toISOString()})`,
      })
    }

    if (now > windowCloses) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Confirmation window has closed. Preheat will not be executed for this slot.',
      })
    }

    await db.query(
      `UPDATE preheat_requests
       SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    )

    broadcast(app, 'queue.updated', { requestDate: request.request_date })
    return reply.send({ success: true, confirmedAt: new Date().toISOString() })
  })
}
