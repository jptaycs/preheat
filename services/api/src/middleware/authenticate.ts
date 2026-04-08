import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userRole: string
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply
      .status(401)
      .send({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' })
  }

  try {
    const payload = verifyAccessToken(auth.slice(7))
    req.userId = payload.sub
    req.userRole = payload.role
  } catch {
    return reply
      .status(401)
      .send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' })
  }
}

export function requireRole(role: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.userRole !== role && req.userRole !== 'admin') {
      return reply
        .status(403)
        .send({ statusCode: 403, error: 'Forbidden', message: 'Insufficient permissions' })
    }
  }
}
