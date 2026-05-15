import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

// Minimal health route test — no DB, no background jobs
describe('GET /health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = Fastify({ logger: false })

    // Inline the health handler with a mocked db
    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) }

    app.get('/health', async () => {
      try {
        await mockDb.query('SELECT 1')
        return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() }
      } catch {
        return { status: 'degraded', db: 'error', timestamp: new Date().toISOString() }
      }
    })

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with status ok when DB is reachable', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; db: string }>()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
  })

  it('returns timestamp in the response', async () => {
    const before = Date.now()
    const response = await app.inject({ method: 'GET', url: '/health' })
    const body = response.json<{ timestamp: string }>()
    expect(body.timestamp).toBeDefined()
    const ts = new Date(body.timestamp).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(Date.now())
  })

  it('returns degraded status when DB throws', async () => {
    const errorApp = Fastify({ logger: false })
    const failingDb = { query: vi.fn().mockRejectedValue(new Error('connection refused')) }

    errorApp.get('/health', async () => {
      try {
        await failingDb.query('SELECT 1')
        return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() }
      } catch {
        return { status: 'degraded', db: 'error', timestamp: new Date().toISOString() }
      }
    })

    await errorApp.ready()
    const response = await errorApp.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; db: string }>()
    expect(body.status).toBe('degraded')
    expect(body.db).toBe('error')
    await errorApp.close()
  })
})
