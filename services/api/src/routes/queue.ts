import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { authenticate } from '../middleware/authenticate.js'

// eslint-disable-next-line @typescript-eslint/require-await
export async function queueRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /queue?date=YYYY-MM-DD — full day queue with stats
  app.get<{ Querystring: { date?: string } }>('/', async (req, reply) => {
    const date = req.query.date ?? new Date().toISOString().slice(0, 10)

    const rows = await db.query<{
      id: string
      queue_position: number
      engine_start_time: string
      assigned_time: string
      confirm_opens_at: string
      confirm_deadline: string
      status: string
      pilot_first_name: string
      tail_number: string
      aircraft_type: string
      is_mine: boolean
    }>(
      `SELECT
         r.id,
         r.queue_position,
         r.engine_start_time,
         r.assigned_time,
         r.confirm_opens_at,
         r.confirm_deadline,
         r.status,
         split_part(u.name, ' ', 1) AS pilot_first_name,
         a.tail_number,
         a.type AS aircraft_type,
         (r.pilot_id = $2) AS is_mine
       FROM preheat_requests r
       JOIN users u ON u.id = r.pilot_id
       JOIN aircraft a ON a.id = r.aircraft_id
       WHERE r.request_date = $1
         AND r.status NOT IN ('cancelled')
       ORDER BY r.queue_position ASC`,
      [date, req.userId],
    )

    const entries = rows.rows.map((r) => ({
      id: r.id,
      queuePosition: r.queue_position,
      engineStartTime: r.engine_start_time,
      assignedTime: r.assigned_time,
      confirmOpensAt: r.confirm_opens_at,
      confirmDeadline: r.confirm_deadline,
      status: r.status,
      pilotFirstName: r.pilot_first_name,
      tailNumber: r.tail_number,
      aircraftType: r.aircraft_type,
      isMine: r.is_mine,
    }))
    const stats = {
      waiting: entries.filter((e) => e.status === 'waiting').length,
      confirmed: entries.filter((e) => e.status === 'confirmed').length,
      active: entries.filter((e) => e.status === 'active').length,
      completed: entries.filter((e) => e.status === 'completed').length,
    }

    return reply.send({ date, entries, stats })
  })
}
