import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { WebSocket } from '@fastify/websocket'

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
  app.get('/', () => ({ name: 'AeroFluxPro API', version: '1.0.0', status: 'ok' }))
  app.get('/health', async () => {
    const { db } = await import('./db/client.js')
    try {
      await db.query('SELECT 1')
      return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'degraded', db: 'error', timestamp: new Date().toISOString() }
    }
  })

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const wsPlugin = await import('@fastify/websocket')
  await app.register(wsPlugin.default)

  const wsClients = new Set<WebSocket>()
  app.decorate('wsClients', wsClients)
  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    wsClients.add(socket)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    socket.on('close', () => {
      wsClients.delete(socket)
    })
  })

  // ── Routes ──────────────────────────────────────────────────────────────────
  const { authRoutes } = await import('./routes/auth.js')
  const { aircraftRoutes } = await import('./routes/aircraft.js')
  const { preheatRequestRoutes } = await import('./routes/preheat-requests.js')
  const { queueRoutes } = await import('./routes/queue.js')
  const { preheatSessionRoutes } = await import('./routes/preheat-sessions.js')
  const { adminRoutes } = await import('./routes/admin.js')

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(aircraftRoutes, { prefix: '/aircraft' })
  await app.register(preheatRequestRoutes, { prefix: '/preheat-requests' })
  await app.register(queueRoutes, { prefix: '/queue' })
  await app.register(preheatSessionRoutes, { prefix: '/preheat-sessions' })
  await app.register(adminRoutes, { prefix: '/admin' })

  // ── Background jobs ──────────────────────────────────────────────────────────
  const { startAutoCancelJob } = await import('./jobs/autoCancel.js')
  const { startConfirmReminderJob } = await import('./jobs/confirmReminder.js')
  startAutoCancelJob(app)
  startConfirmReminderJob(app)

  return app
}
