import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { signAccessToken, signRefreshToken, hashRefreshToken } from '../lib/jwt.js'
import { authenticate } from '../middleware/authenticate.js'

// ── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  licenseNumber: z.string().max(50).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

// ── Route handler ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/require-await
export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues })
    }
    const { name, email, password, licenseNumber } = parsed.data

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
    if ((existing.rowCount ?? 0) > 0) {
      return reply
        .status(409)
        .send({ statusCode: 409, error: 'Conflict', message: 'Email already registered' })
    }

    const passwordHash = await hashPassword(password)
    const result = await db.query<{ id: string; role: string }>(
      `INSERT INTO users (name, email, password_hash, license_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, license_number, created_at`,
      [name, email, passwordHash, licenseNumber ?? null],
    )

    const user = result.rows[0]!
    const accessToken = signAccessToken(user.id, user.role)
    const refresh = signRefreshToken()

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refresh.hash, refresh.expiresAt],
    )

    return reply.status(201).send({ accessToken, refreshToken: refresh.raw })
  })

  // POST /auth/login
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'development' ? 100 : 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues })
      }
      const { email, password } = parsed.data

      const result = await db.query<{ id: string; role: string; password_hash: string }>(
        'SELECT id, role, password_hash FROM users WHERE email = $1',
        [email],
      )
      const user = result.rows[0]

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return reply
          .status(401)
          .send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password' })
      }

      const accessToken = signAccessToken(user.id, user.role)
      const refresh = signRefreshToken()

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, refresh.hash, refresh.expiresAt],
      )

      return reply.send({ accessToken, refreshToken: refresh.raw })
    },
  )

  // POST /auth/refresh
  app.post('/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ statusCode: 400, error: 'Bad Request', message: 'refreshToken is required' })
    }

    const hash = hashRefreshToken(parsed.data.refreshToken)
    const result = await db.query<{ id: string; user_id: string; expires_at: string }>(
      `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
      [hash],
    )
    const token = result.rows[0]

    if (!token || new Date(token.expires_at) < new Date()) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      })
    }

    // Rotate: delete old, issue new
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [token.id])

    const userResult = await db.query<{ id: string; role: string }>(
      'SELECT id, role FROM users WHERE id = $1',
      [token.user_id],
    )
    const user = userResult.rows[0]!
    const accessToken = signAccessToken(user.id, user.role)
    const newRefresh = signRefreshToken()

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, newRefresh.hash, newRefresh.expiresAt],
    )

    return reply.send({ accessToken, refreshToken: newRefresh.raw })
  })

  // POST /auth/logout
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/logout', { preHandler: authenticate }, async (req, reply) => {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.userId])
    return reply.send({ success: true })
  })

  // GET /auth/me
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const result = await db.query<{
      id: string
      name: string
      email: string
      role: string
      licenseNumber: string | null
      notificationPrefs: {
        scheduleAlerts: boolean
        confirmReminder: boolean
        preheatProgress: boolean
        queueChanges: boolean
      }
      createdAt: string
    }>(
      `SELECT id, name, email, role, license_number AS "licenseNumber", notification_prefs AS "notificationPrefs", created_at AS "createdAt"
       FROM users WHERE id = $1`,
      [req.userId],
    )
    const user = result.rows[0]
    if (!user)
      return reply
        .status(404)
        .send({ statusCode: 404, error: 'Not Found', message: 'User not found' })
    return reply.send(user)
  })
}
