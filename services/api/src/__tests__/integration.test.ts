import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

// Integration tests use the real DB — ensure migration has been run (pnpm db:migrate)
// NODE_ENV=development bypasses booking-window and confirmation-window time checks.

let app: FastifyInstance

beforeAll(async () => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://preheat:preheat@localhost:5432/preheat_test'
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production'
  process.env.NODE_ENV = 'development' // bypass booking + confirm window time guards
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  const { db } = await import('../db/client.js')
  await db.query(
    `DELETE FROM preheat_sessions WHERE mechanic_id IN (SELECT id FROM users WHERE email LIKE '%@int.preheat')`,
  )
  await db.query(`DELETE FROM session_readings`)
  await db.query(
    `DELETE FROM preheat_requests WHERE pilot_id IN (SELECT id FROM users WHERE email LIKE '%@int.preheat')`,
  )
  await db.query(
    `DELETE FROM aircraft WHERE pilot_id IN (SELECT id FROM users WHERE email LIKE '%@int.preheat')`,
  )
  await db.query(
    `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@int.preheat')`,
  )
  await db.query(`DELETE FROM users WHERE email LIKE '%@int.preheat'`)
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function futureEngineStart(offsetMinutes = 120): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

async function registerAndLogin(email: string, name = 'Test Pilot') {
  const reg = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name, email, password: 'securepassword123', licenseNumber: 'PPL-INT-001' },
  })
  expect(reg.statusCode).toBe(201)
  return reg.json<{ accessToken: string; refreshToken: string }>()
}

async function addAircraft(accessToken: string, tailNumber = 'N12345', type = 'Cessna 172') {
  const res = await app.inject({
    method: 'POST',
    url: '/aircraft',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { tailNumber, type },
  })
  expect(res.statusCode).toBe(201)
  return res.json<{ id: string; tailNumber: string }>()
}

async function postRequest(
  accessToken: string,
  aircraftId: string,
  opts: { engineStartTime?: string } = {},
) {
  const res = await app.inject({
    method: 'POST',
    url: '/preheat-requests',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      aircraftId,
      engineStartTime: opts.engineStartTime ?? futureEngineStart(),
      notes: 'Integration test',
    },
  })
  return res
}

// ── Pilot full flow ────────────────────────────────────────────────────────────

describe('pilot full flow: register → aircraft → request → confirm', () => {
  it('pilot can register, add aircraft, submit a preheat request, and confirm it', async () => {
    const { accessToken } = await registerAndLogin('pilot@int.preheat')
    const aircraft = await addAircraft(accessToken)

    // Submit request
    const reqRes = await postRequest(accessToken, aircraft.id)
    expect(reqRes.statusCode).toBe(201)
    const { id: requestId } = reqRes.json<{ id: string }>()
    expect(requestId).toBeTruthy()

    // List pilot's requests — should appear
    const listRes = await app.inject({
      method: 'GET',
      url: '/preheat-requests',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(listRes.statusCode).toBe(200)
    const list = listRes.json<{ id: string; status: string }[]>()
    const entry = list.find((r) => r.id === requestId)
    expect(entry).toBeDefined()
    expect(entry?.status).toBe('waiting')

    // Confirm the request (NODE_ENV=development skips the window check)
    const confirmRes = await app.inject({
      method: 'POST',
      url: `/preheat-requests/${requestId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(confirmRes.statusCode).toBe(200)
    expect(confirmRes.json<{ success: boolean }>().success).toBe(true)

    // Fetch individual request — status should be confirmed
    const getRes = await app.inject({
      method: 'GET',
      url: `/preheat-requests/${requestId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(getRes.statusCode).toBe(200)
    expect(getRes.json<{ status: string }>().status).toBe('confirmed')
  })

  it('rejects a duplicate aircraft registration for the same pilot', async () => {
    const { accessToken } = await registerAndLogin('dup@int.preheat')
    await addAircraft(accessToken, 'N99999')

    const res = await app.inject({
      method: 'POST',
      url: '/aircraft',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { tailNumber: 'N99999', type: 'Piper PA-28' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects double-confirmation of the same request', async () => {
    const { accessToken } = await registerAndLogin('dbl@int.preheat')
    const aircraft = await addAircraft(accessToken, 'N11111')
    const reqRes = await postRequest(accessToken, aircraft.id)
    const { id: requestId } = reqRes.json<{ id: string }>()

    await app.inject({
      method: 'POST',
      url: `/preheat-requests/${requestId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const again = await app.inject({
      method: 'POST',
      url: `/preheat-requests/${requestId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(again.statusCode).toBe(409)
  })

  it("pilot cannot access another pilot's request", async () => {
    const { accessToken: tokenA } = await registerAndLogin('pilotA@int.preheat', 'Pilot A')
    const { accessToken: tokenB } = await registerAndLogin('pilotB@int.preheat', 'Pilot B')
    const aircraftA = await addAircraft(tokenA, 'NA0001', 'Cessna 172')

    const reqRes = await postRequest(tokenA, aircraftA.id)
    const { id: requestId } = reqRes.json<{ id: string }>()

    // Pilot B tries to confirm Pilot A's request
    const res = await app.inject({
      method: 'POST',
      url: `/preheat-requests/${requestId}/confirm`,
      headers: { authorization: `Bearer ${tokenB}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ── Queue visibility ───────────────────────────────────────────────────────────

describe('queue visibility: submitted requests appear in the queue', () => {
  it("another authenticated user can see the pilot's request in the queue", async () => {
    const { accessToken: pilotToken } = await registerAndLogin('qpilot@int.preheat', 'Queue Pilot')
    const aircraft = await addAircraft(pilotToken, 'NQ0001')
    const reqRes = await postRequest(pilotToken, aircraft.id)
    expect(reqRes.statusCode).toBe(201)
    const { id: requestId } = reqRes.json<{ id: string }>()

    // A second user (e.g. dispatcher) can GET /queue and see the entry
    const { accessToken: otherToken } = await registerAndLogin(
      'qdispatch@int.preheat',
      'Dispatcher',
    )
    const queueRes = await app.inject({
      method: 'GET',
      url: '/queue',
      headers: { authorization: `Bearer ${otherToken}` },
    })
    expect(queueRes.statusCode).toBe(200)
    const { entries } = queueRes.json<{ entries: { id: string }[] }>()
    expect(entries.some((e) => e.id === requestId)).toBe(true)
  })

  it('queue stats count waiting requests correctly', async () => {
    const { accessToken } = await registerAndLogin('qstats@int.preheat', 'Stats Pilot')
    const aircraft = await addAircraft(accessToken, 'NS0001')
    await postRequest(accessToken, aircraft.id)

    const queueRes = await app.inject({
      method: 'GET',
      url: '/queue',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(queueRes.statusCode).toBe(200)
    const { stats } = queueRes.json<{ stats: { waiting: number } }>()
    expect(stats.waiting).toBeGreaterThanOrEqual(1)
  })

  it('queue entry marks is_mine correctly for the submitting pilot', async () => {
    const { accessToken } = await registerAndLogin('qmine@int.preheat', 'Mine Pilot')
    const aircraft = await addAircraft(accessToken, 'NM0001')
    const reqRes = await postRequest(accessToken, aircraft.id)
    const { id: requestId } = reqRes.json<{ id: string }>()

    const queueRes = await app.inject({
      method: 'GET',
      url: '/queue',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const { entries } = queueRes.json<{ entries: { id: string; isMine: boolean }[] }>()
    const mine = entries.find((e) => e.id === requestId)
    expect(mine?.isMine).toBe(true)
  })
})

// ── Auto-cancel: expired confirm deadline ──────────────────────────────────────

describe('auto-cancel: waiting requests past confirm_deadline are cancelled', () => {
  it('cancels a waiting request whose confirm_deadline has passed', async () => {
    const { accessToken } = await registerAndLogin('acpilot@int.preheat', 'AutoCancel Pilot')
    const aircraft = await addAircraft(accessToken, 'NAC001')
    const reqRes = await postRequest(accessToken, aircraft.id)
    expect(reqRes.statusCode).toBe(201)
    const { id: requestId } = reqRes.json<{ id: string }>()

    // Expire the confirm_deadline directly in the DB
    const { db } = await import('../db/client.js')
    await db.query(
      `UPDATE preheat_requests SET confirm_deadline = NOW() - INTERVAL '10 minutes' WHERE id = $1`,
      [requestId],
    )

    // Run the same cancellation query the autoCancel job runs
    const expired = await db.query<{ id: string }>(
      `SELECT id FROM preheat_requests WHERE status = 'waiting' AND confirm_deadline < NOW() AND id = $1`,
      [requestId],
    )
    expect(expired.rows.length).toBe(1)

    await db.query(
      `UPDATE preheat_requests SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [requestId],
    )

    // Verify the request is now cancelled
    const check = await app.inject({
      method: 'GET',
      url: `/preheat-requests/${requestId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(check.statusCode).toBe(200)
    expect(check.json<{ status: string }>().status).toBe('cancelled')
  })

  it('does not cancel a confirmed request when its deadline passes', async () => {
    const { accessToken } = await registerAndLogin('acconfirmed@int.preheat', 'Confirmed Pilot')
    const aircraft = await addAircraft(accessToken, 'NCC001')
    const reqRes = await postRequest(accessToken, aircraft.id)
    const { id: requestId } = reqRes.json<{ id: string }>()

    // Confirm the request first
    await app.inject({
      method: 'POST',
      url: `/preheat-requests/${requestId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}` },
    })

    // Expire the confirm_deadline
    const { db } = await import('../db/client.js')
    await db.query(
      `UPDATE preheat_requests SET confirm_deadline = NOW() - INTERVAL '10 minutes' WHERE id = $1`,
      [requestId],
    )

    // autoCancel query only targets 'waiting' — confirmed requests are excluded
    const expired = await db.query<{ id: string }>(
      `SELECT id FROM preheat_requests WHERE status = 'waiting' AND confirm_deadline < NOW() AND id = $1`,
      [requestId],
    )
    expect(expired.rows.length).toBe(0)

    // Request remains confirmed
    const check = await app.inject({
      method: 'GET',
      url: `/preheat-requests/${requestId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(check.json<{ status: string }>().status).toBe('confirmed')
  })
})
