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
}
