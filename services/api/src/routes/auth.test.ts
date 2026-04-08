import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://preheat:preheat@localhost:5432/preheat_test'
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production'
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

// Clean up test users between tests
beforeEach(async () => {
  const { db } = await import('../db/client.js')
  await db.query(`DELETE FROM refresh_tokens`)
  await db.query(`DELETE FROM users WHERE email LIKE '%@test.preheat'`)
})

const testUser = {
  name: 'Test Pilot',
  email: 'pilot@test.preheat',
  password: 'securepassword123',
  licenseNumber: 'PPL-TEST-001',
}

describe('POST /auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: testUser,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<{ accessToken: string; refreshToken: string }>()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
  })

  it('returns 409 if email already exists', async () => {
    await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    expect(res.statusCode).toBe(409)
  })

  it('returns 400 for invalid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: 'short' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
  })

  it('returns tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string; refreshToken: string }>()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
  })

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: testUser.email, password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@test.preheat', password: 'whatever' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/refresh', () => {
  it('rotates the refresh token', async () => {
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    const { refreshToken } = reg.json<{ refreshToken: string }>()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string; refreshToken: string }>()
    expect(body.accessToken).toBeTruthy()
    expect(body.refreshToken).not.toBe(refreshToken) // rotated
  })

  it('returns 401 for an already-used refresh token', async () => {
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    const { refreshToken } = reg.json<{ refreshToken: string }>()

    await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('returns current user for valid token', async () => {
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    const { accessToken } = reg.json<{ accessToken: string }>()

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ email: string; name: string }>()
    expect(body.email).toBe(testUser.email)
    expect(body.name).toBe(testUser.name)
  })

  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with a tampered token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer totally.fake.token' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('invalidates all refresh tokens for the user', async () => {
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload: testUser })
    const { accessToken, refreshToken } = reg.json<{ accessToken: string; refreshToken: string }>()

    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('ok')
  })
})
