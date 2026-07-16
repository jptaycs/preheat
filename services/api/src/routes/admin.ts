import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'
import { hashPassword } from '../lib/password.js'

const createUserBody = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['pilot', 'mechanic', 'dispatcher', 'admin']),
})

const updateRoleBody = z.object({
  role: z.enum(['pilot', 'mechanic', 'dispatcher', 'admin']),
})

const createPaymentBody = z.object({
  aircraftId: z.string().uuid(),
  amountCents: z.number().int().min(0).max(1_000_000),
  notes: z.string().max(200).optional(),
})

const updatePaymentBody = z.object({
  status: z.enum(['pending', 'paid', 'waived']),
})

interface PaymentRow {
  id: string
  aircraft_id: string
  session_id: string | null
  amount_cents: number
  status: string
  notes: string | null
  paid_at: string | null
  created_at: string
  tail_number: string
  aircraft_type: string
  owner_name: string
}

function serializePayment(p: PaymentRow) {
  return {
    id: p.id,
    aircraftId: p.aircraft_id,
    sessionId: p.session_id,
    amountCents: p.amount_cents,
    status: p.status,
    notes: p.notes,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    tailNumber: p.tail_number,
    aircraftType: p.aircraft_type,
    ownerName: p.owner_name,
  }
}

const PAYMENT_SELECT = `
  SELECT p.id, p.aircraft_id, p.session_id, p.amount_cents, p.status, p.notes,
         p.paid_at, p.created_at, a.tail_number, a.type AS aircraft_type, u.name AS owner_name
  FROM payments p
  JOIN aircraft a ON a.id = p.aircraft_id
  JOIN users u ON u.id = a.pilot_id`

// eslint-disable-next-line @typescript-eslint/require-await
export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require auth + dispatcher or admin role
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireRole('dispatcher'))

  // GET /admin/users
  app.get('/users', async (_req, reply) => {
    const result = await db.query<{
      id: string
      name: string
      email: string
      role: string
      license_number: string | null
      created_at: string
    }>(
      `SELECT id, name, email, role, license_number, created_at
       FROM users ORDER BY created_at DESC`,
    )
    return reply.send(
      result.rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        licenseNumber: u.license_number,
        createdAt: u.created_at,
      })),
    )
  })

  // POST /admin/users — create a user (mechanic, dispatcher, etc.)
  app.post('/users', async (req, reply) => {
    const parsed = createUserBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const { name, email, password, role } = parsed.data

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if ((existing.rowCount ?? 0) > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email already registered',
      })
    }

    const passwordHash = await hashPassword(password)
    const result = await db.query<{
      id: string
      name: string
      email: string
      role: string
      created_at: string
    }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role],
    )

    const user = result.rows[0]!
    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      licenseNumber: null,
      createdAt: user.created_at,
    })
  })

  // PATCH /admin/users/:id/role
  app.patch<{ Params: { id: string } }>('/users/:id/role', async (req, reply) => {
    const parsed = updateRoleBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid role',
      })
    }

    const result = await db.query<{
      id: string
      name: string
      email: string
      role: string
      license_number: string | null
      created_at: string
    }>(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, license_number, created_at`,
      [parsed.data.role, req.params.id],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const u = result.rows[0]!
    return reply.send({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      licenseNumber: u.license_number,
      createdAt: u.created_at,
    })
  })

  // DELETE /admin/users/:id
  app.delete<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    // Prevent self-deletion
    if (req.params.id === req.userId) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'You cannot delete your own account',
      })
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id])
    if ((result.rowCount ?? 0) === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    return reply.status(204).send()
  })

  // GET /admin/overview — dashboard stats
  app.get('/overview', async (_req, reply) => {
    const [users, aircraft, sessions, pending, paid] = await Promise.all([
      db.query<{ count: string }>(`SELECT COUNT(*) AS count FROM users`),
      db.query<{ count: string }>(`SELECT COUNT(*) AS count FROM aircraft`),
      db.query<{ count: string }>(`SELECT COUNT(*) AS count FROM preheat_sessions`),
      db.query<{ total: string | null }>(
        `SELECT SUM(amount_cents) AS total FROM payments WHERE status = 'pending'`,
      ),
      db.query<{ total: string | null }>(
        `SELECT SUM(amount_cents) AS total FROM payments WHERE status = 'paid'`,
      ),
    ])
    return reply.send({
      users: Number(users.rows[0]!.count),
      aircraft: Number(aircraft.rows[0]!.count),
      sessions: Number(sessions.rows[0]!.count),
      pendingCents: Number(pending.rows[0]!.total ?? 0),
      paidCents: Number(paid.rows[0]!.total ?? 0),
    })
  })

  // GET /admin/aircraft — all aircraft with owner and per-plane balance
  app.get('/aircraft', async (_req, reply) => {
    const result = await db.query<{
      id: string
      tail_number: string
      type: string
      owner_id: string
      owner_name: string
      owner_email: string
      session_count: string
      pending_cents: string | null
      paid_cents: string | null
      created_at: string
    }>(
      `SELECT a.id, a.tail_number, a.type, a.created_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
              COUNT(DISTINCT s.id) AS session_count,
              SUM(p.amount_cents) FILTER (WHERE p.status = 'pending') AS pending_cents,
              SUM(p.amount_cents) FILTER (WHERE p.status = 'paid')    AS paid_cents
       FROM aircraft a
       JOIN users u ON u.id = a.pilot_id
       LEFT JOIN preheat_requests r ON r.aircraft_id = a.id
       LEFT JOIN preheat_sessions s ON s.request_id = r.id
       LEFT JOIN payments p ON p.aircraft_id = a.id
       GROUP BY a.id, u.id
       ORDER BY a.tail_number`,
    )
    return reply.send(
      result.rows.map((a) => ({
        id: a.id,
        tailNumber: a.tail_number,
        type: a.type,
        ownerId: a.owner_id,
        ownerName: a.owner_name,
        ownerEmail: a.owner_email,
        sessionCount: Number(a.session_count),
        pendingCents: Number(a.pending_cents ?? 0),
        paidCents: Number(a.paid_cents ?? 0),
        createdAt: a.created_at,
      })),
    )
  })

  // GET /admin/payments — payment ledger, optionally filtered by aircraft or status
  app.get<{ Querystring: { aircraftId?: string; status?: string } }>(
    '/payments',
    async (req, reply) => {
      const conditions: string[] = []
      const params: string[] = []
      if (req.query.aircraftId) {
        params.push(req.query.aircraftId)
        conditions.push(`p.aircraft_id = $${params.length}`)
      }
      if (req.query.status && ['pending', 'paid', 'waived'].includes(req.query.status)) {
        params.push(req.query.status)
        conditions.push(`p.status = $${params.length}`)
      }
      const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
      const result = await db.query<PaymentRow>(
        `${PAYMENT_SELECT}${where} ORDER BY p.created_at DESC LIMIT 200`,
        params,
      )
      return reply.send(result.rows.map(serializePayment))
    },
  )

  // POST /admin/payments — record a manual charge against an aircraft
  app.post('/payments', async (req, reply) => {
    const parsed = createPaymentBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const { aircraftId, amountCents, notes } = parsed.data
    const aircraft = await db.query('SELECT id FROM aircraft WHERE id = $1', [aircraftId])
    if (aircraft.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Aircraft not found',
      })
    }

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO payments (aircraft_id, amount_cents, notes)
       VALUES ($1, $2, $3) RETURNING id`,
      [aircraftId, amountCents, notes ?? null],
    )
    const result = await db.query<PaymentRow>(`${PAYMENT_SELECT} WHERE p.id = $1`, [
      inserted.rows[0]!.id,
    ])
    return reply.status(201).send(serializePayment(result.rows[0]!))
  })

  // PATCH /admin/payments/:id — mark paid / waived / back to pending
  app.patch<{ Params: { id: string } }>('/payments/:id', async (req, reply) => {
    const parsed = updatePaymentBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid status',
      })
    }

    const updated = await db.query<{ id: string }>(
      `UPDATE payments
       SET status = $1,
           paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [parsed.data.status, req.params.id],
    )
    if (updated.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Payment not found',
      })
    }

    const result = await db.query<PaymentRow>(`${PAYMENT_SELECT} WHERE p.id = $1`, [req.params.id])
    return reply.send(serializePayment(result.rows[0]!))
  })
}
