import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  })

  // ── Security ────────────────────────────────────────────────────────────────
  await app.register(helmet)
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? ['https://preheat.app'] : true,
  })
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // ── Root + Health ────────────────────────────────────────────────────────────
  app.get('/', () => ({ name: 'Preheat API', version: '1.0.0', status: 'ok' }))
  app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Routes ──────────────────────────────────────────────────────────────────
  const { authRoutes } = await import('./routes/auth.js')
  await app.register(authRoutes, { prefix: '/auth' })

  return app
}
