/**
 * Seed a realistic "today's queue" scenario for store screenshot capture.
 *
 * Idempotent — re-running clears today's seeded data and recreates it relative to NOW,
 * so timers, countdowns, and progress percentages are always fresh.
 *
 * Run as:  pnpm --filter @preheat/api db:seed:screenshots
 *
 * After running, log in to the mobile app as `pilot-3@aerofluxpro.local` / `screenshots123`
 * to capture: Dashboard alert, Queue (you = pos 3), Confirm (inside window), Track (active session below).
 * Pilot-2 has the active heating session at ~72% progress for the Track screenshot.
 */

import 'dotenv/config'
import { db } from './client.js'
import { hashPassword } from '../lib/password.js'
import {
  CONFIRM_OPENS_MIN,
  CONFIRM_DEADLINE_MIN,
  SLOT_SPACING_MIN,
  DEFAULT_DURATION_MIN,
} from '../config/queue.js'

const SCREENSHOT_TAG = 'screenshot-seed'

interface PilotSpec {
  email: string
  name: string
  license: string
  aircraft: { tail: string; type: string }[]
}

const PILOTS: PilotSpec[] = [
  {
    email: 'pilot-1@aerofluxpro.local',
    name: 'Alex Morgan',
    license: 'P-1001',
    aircraft: [{ tail: 'N4721B', type: 'Cessna 172' }],
  },
  {
    email: 'pilot-2@aerofluxpro.local',
    name: 'Sarah Chen',
    license: 'P-1002',
    aircraft: [{ tail: 'N9912R', type: 'Piper Cherokee' }],
  },
  {
    email: 'pilot-3@aerofluxpro.local',
    name: 'Jordan Park',
    license: 'P-1003',
    aircraft: [
      { tail: 'N8845K', type: 'Cessna 182' },
      { tail: 'N5512A', type: 'Cirrus SR20' },
    ],
  },
  {
    email: 'pilot-4@aerofluxpro.local',
    name: 'James Holt',
    license: 'P-1004',
    aircraft: [{ tail: 'N3201T', type: 'Beechcraft Bonanza' }],
  },
  {
    email: 'pilot-5@aerofluxpro.local',
    name: 'Maya Rivera',
    license: 'P-1005',
    aircraft: [{ tail: 'N6677X', type: 'Cirrus SR22' }],
  },
  {
    email: 'pilot-6@aerofluxpro.local',
    name: 'Tom Wells',
    license: 'P-1006',
    aircraft: [{ tail: 'N2230P', type: 'Diamond DA40' }],
  },
]

const MECHANIC = {
  email: 'mechanic@aerofluxpro.local',
  name: 'Riley Park',
  license: null as string | null,
}

const COMMON_PASSWORD = 'screenshots123'

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

async function upsertUser(args: {
  email: string
  name: string
  role: 'pilot' | 'mechanic'
  license: string | null
}): Promise<string> {
  const hash = await hashPassword(COMMON_PASSWORD)
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, license_number)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           license_number = EXCLUDED.license_number
     RETURNING id`,
    [args.name, args.email, hash, args.role, args.license],
  )
  const id = rows[0]?.id
  if (!id) throw new Error(`upsertUser returned no row for ${args.email}`)
  return id
}

async function upsertAircraft(pilotId: string, tail: string, type: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO aircraft (pilot_id, tail_number, type)
     VALUES ($1, $2, $3)
     ON CONFLICT (pilot_id, tail_number) DO UPDATE SET type = EXCLUDED.type
     RETURNING id`,
    [pilotId, tail, type],
  )
  const id = rows[0]?.id
  if (!id) throw new Error(`upsertAircraft returned no row for ${tail}`)
  return id
}

async function clearPriorScreenshotData(emails: string[]): Promise<void> {
  // Wipe any preheat data belonging to seeded users so re-runs start clean.
  await db.query(
    `DELETE FROM preheat_requests
     WHERE pilot_id IN (SELECT id FROM users WHERE email = ANY($1))`,
    [emails],
  )
}

try {
  const allEmails = [...PILOTS.map((p) => p.email), MECHANIC.email]
  await clearPriorScreenshotData(allEmails)

  const mechanicId = await upsertUser({
    email: MECHANIC.email,
    name: MECHANIC.name,
    role: 'mechanic',
    license: MECHANIC.license,
  })

  // Anchor the queue around NOW.
  // Position 1: completed earlier this morning
  // Position 2: actively heating (Track screen, ~72% progress on a 20-min session)
  // Position 3: waiting, inside confirmation window (Confirm screen, ~5 min until deadline)
  //             — this is the "you" pilot for screenshots
  // Position 4: confirmed, waiting for its slot
  // Position 5–6: waiting, outside the window
  // Engine start times are spaced by SLOT_SPACING_MIN.
  type Status = 'waiting' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  const queueSlots: { offsetMin: number; status: Status }[] = [
    { offsetMin: -45, status: 'completed' },
    { offsetMin: -30 + SLOT_SPACING_MIN, status: 'active' }, // -15
    { offsetMin: CONFIRM_DEADLINE_MIN + 5, status: 'waiting' }, // +35 → 5 min until deadline
    { offsetMin: CONFIRM_DEADLINE_MIN + 5 + SLOT_SPACING_MIN, status: 'confirmed' },
    { offsetMin: CONFIRM_DEADLINE_MIN + 5 + SLOT_SPACING_MIN * 2, status: 'waiting' },
    { offsetMin: CONFIRM_DEADLINE_MIN + 5 + SLOT_SPACING_MIN * 3, status: 'waiting' },
  ]

  if (PILOTS.length < queueSlots.length) {
    throw new Error(`Need at least ${queueSlots.length} PILOTS to fill the queue`)
  }

  // Walk the queue in order: one pilot + one of their aircraft per slot.
  // Pair so we never need to re-index by position.
  const queueEntries = await Promise.all(
    queueSlots.map(async (slot, position) => {
      const pilot = PILOTS[position]
      if (!pilot) throw new Error(`Missing pilot for queue position ${position + 1}`)
      const primaryAircraft = pilot.aircraft[0]
      if (!primaryAircraft) throw new Error(`Pilot ${pilot.email} has no aircraft`)

      const pilotId = await upsertUser({
        email: pilot.email,
        name: pilot.name,
        role: 'pilot',
        license: pilot.license,
      })
      const aircraftId = await upsertAircraft(pilotId, primaryAircraft.tail, primaryAircraft.type)
      // Extras only populate the picker; not used as the queue aircraft.
      for (const extra of pilot.aircraft.slice(1)) {
        await upsertAircraft(pilotId, extra.tail, extra.type)
      }
      return { slot, position, pilotId, aircraftId }
    }),
  )

  const requestIdByPosition = new Map<number, string>()
  for (const entry of queueEntries) {
    const { slot, position, pilotId, aircraftId } = entry
    const engineStart = minutesFromNow(slot.offsetMin)
    const confirmOpens = new Date(engineStart.getTime() - CONFIRM_OPENS_MIN * 60 * 1000)
    const confirmDeadline = new Date(engineStart.getTime() - CONFIRM_DEADLINE_MIN * 60 * 1000)
    const requestDate = engineStart.toISOString().slice(0, 10)
    const confirmedAt =
      slot.status === 'confirmed' || slot.status === 'active' || slot.status === 'completed'
        ? new Date(confirmOpens.getTime() + 3 * 60 * 1000)
        : null

    const notes = position === 2 ? `Tagged by ${SCREENSHOT_TAG}` : null

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO preheat_requests
         (pilot_id, aircraft_id, request_date, engine_start_time, assigned_time,
          confirm_opens_at, confirm_deadline, queue_position, status, notes,
          confirmed_at, preferred_duration_minutes)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        pilotId,
        aircraftId,
        requestDate,
        engineStart.toISOString(),
        confirmOpens.toISOString(),
        confirmDeadline.toISOString(),
        position + 1,
        slot.status,
        notes,
        confirmedAt ? confirmedAt.toISOString() : null,
        DEFAULT_DURATION_MIN,
      ],
    )
    const requestId = rows[0]?.id
    if (!requestId)
      throw new Error(`preheat_requests insert returned no row for position ${position + 1}`)
    requestIdByPosition.set(position, requestId)
  }

  // Active session for position 2 — start 72% of DEFAULT_DURATION_MIN ago so the Track gauge sits near 72%.
  const activeRequestId = requestIdByPosition.get(1)
  if (!activeRequestId) throw new Error('Expected an active request at position 2')
  const elapsedMin = DEFAULT_DURATION_MIN * 0.72
  const startedAt = minutesFromNow(-elapsedMin)
  await db.query(
    `INSERT INTO preheat_sessions
       (request_id, mechanic_id, current_temp_celsius, started_at, duration_minutes)
     VALUES ($1, $2, $3, $4, $5)`,
    [activeRequestId, mechanicId, 10.5, startedAt.toISOString(), DEFAULT_DURATION_MIN],
  )

  // Completed session for position 1 — finished 5 min ago.
  const completedRequestId = requestIdByPosition.get(0)
  if (!completedRequestId) throw new Error('Expected a completed request at position 1')
  const completedStart = minutesFromNow(-25)
  const completedEnd = minutesFromNow(-5)
  await db.query(
    `INSERT INTO preheat_sessions
       (request_id, mechanic_id, current_temp_celsius, started_at, completed_at, duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      completedRequestId,
      mechanicId,
      18.0,
      completedStart.toISOString(),
      completedEnd.toISOString(),
      DEFAULT_DURATION_MIN,
    ],
  )

  console.warn('Screenshot seed complete.')
  console.warn('')
  console.warn('Capture flow:')
  console.warn(`  Mobile login as pilot-3@aerofluxpro.local / ${COMMON_PASSWORD}`)
  console.warn(`    → Dashboard: shows "Confirm in ~5 min" banner (queue pos 3)`)
  console.warn(`    → Queue: 6 entries, "You" highlight on pos 3`)
  console.warn(`    → Confirm: countdown ring ~05:00 to deadline`)
  console.warn(`    → Request: aircraft picker has 2 tail numbers (N8845K, N5512A)`)
  console.warn(`    → Profile: 2 aircraft, notification toggles visible`)
  console.warn(`  Mobile login as pilot-2@aerofluxpro.local / ${COMMON_PASSWORD}`)
  console.warn(
    `    → Track: active session ~72% (current temp 10.5°C, started ~${Math.round(elapsedMin)} min ago)`,
  )
  console.warn(`  Web mechanic panel login as mechanic@aerofluxpro.local / ${COMMON_PASSWORD}`)
  console.warn(`    → Today's queue with all 6 entries and the active session`)
} catch (err) {
  console.error('Screenshot seed failed:', err)
  process.exit(1)
} finally {
  await db.end()
}
