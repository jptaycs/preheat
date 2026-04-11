import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate } from '../middleware/authenticate.js'

const createAircraftBody = z.object({
  tailNumber: z.string().min(1).max(20),
  type: z.string().min(1).max(100),
})

// eslint-disable-next-line @typescript-eslint/require-await
export async function aircraftRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /aircraft — list pilot's aircraft
  app.get('/', async (req, reply) => {
    const result = await db.query<{
      id: string
      tail_number: string
      type: string
      created_at: string
    }>(
      `SELECT id, tail_number, type, created_at
       FROM aircraft
       WHERE pilot_id = $1
       ORDER BY created_at ASC`,
      [req.userId],
    )
    return reply.send(
      result.rows.map((a) => ({
        id: a.id,
        tailNumber: a.tail_number,
        type: a.type,
        createdAt: a.created_at,
      })),
    )
  })

  // POST /aircraft — add aircraft
  app.post('/', async (req, reply) => {
    const parsed = createAircraftBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const { tailNumber, type } = parsed.data

    // Check for duplicate tail number for this pilot
    const existing = await db.query(
      `SELECT id FROM aircraft WHERE tail_number = $1 AND pilot_id = $2`,
      [tailNumber, req.userId],
    )
    if ((existing.rowCount ?? 0) > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Aircraft with this tail number already registered',
      })
    }

    const result = await db.query<{
      id: string
      tail_number: string
      type: string
      created_at: string
    }>(
      `INSERT INTO aircraft (pilot_id, tail_number, type)
       VALUES ($1, $2, $3)
       RETURNING id, tail_number, type, created_at`,
      [req.userId, tailNumber, type],
    )

    const a = result.rows[0]!
    return reply.status(201).send({
      id: a.id,
      tailNumber: a.tail_number,
      type: a.type,
      createdAt: a.created_at,
    })
  })

  // DELETE /aircraft/:id — remove aircraft
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    // Verify ownership
    const aircraft = await db.query(`SELECT id FROM aircraft WHERE id = $1 AND pilot_id = $2`, [
      req.params.id,
      req.userId,
    ])
    if (aircraft.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Aircraft not found',
      })
    }

    // Block delete if there are active preheat requests
    const active = await db.query(
      `SELECT id FROM preheat_requests
       WHERE aircraft_id = $1
         AND status IN ('waiting', 'confirmed', 'active')`,
      [req.params.id],
    )
    if ((active.rowCount ?? 0) > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Cannot remove aircraft with an active preheat request',
      })
    }

    await db.query('DELETE FROM aircraft WHERE id = $1', [req.params.id])
    return reply.status(204).send()
  })
}
