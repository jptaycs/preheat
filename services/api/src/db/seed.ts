import 'dotenv/config'
import { db } from './client.js'
import { hashPassword } from '../lib/password.js'

const DEV_USERS = [
  {
    name: 'Dev Pilot',
    email: 'dev-pilot@preheat.local',
    password: 'devpilot123',
    role: 'pilot',
    licenseNumber: 'DEV-001',
  },
  {
    name: 'Dev Mechanic',
    email: 'dev-mechanic@preheat.local',
    password: 'devmechanic123',
    role: 'mechanic',
    licenseNumber: null,
  },
]

const DEV_PILOT_AIRCRAFT = [
  { tailNumber: 'N172EX', type: 'Cessna 172 Skyhawk' },
  { tailNumber: 'N28PA', type: 'Piper PA-28 Cherokee' },
  { tailNumber: 'N441SR', type: 'Cirrus SR22' },
]

try {
  for (const u of DEV_USERS) {
    const hash = await hashPassword(u.password)
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, license_number)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role`,
      [u.name, u.email, hash, u.role, u.licenseNumber],
    )
    console.warn(`Seeded: ${u.email} (${u.role})`)
  }

  const pilot = await db.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
    'dev-pilot@preheat.local',
  ])
  const pilotId = pilot.rows[0]?.id
  if (!pilotId) throw new Error('Dev pilot not found after seed')

  // Wipe dev pilot's preheat history so old aircraft can be removed.
  // session_readings cascades from preheat_sessions, so deleting sessions covers it.
  await db.query(
    `DELETE FROM preheat_sessions
     WHERE request_id IN (SELECT id FROM preheat_requests WHERE pilot_id = $1)`,
    [pilotId],
  )
  await db.query(`DELETE FROM preheat_requests WHERE pilot_id = $1`, [pilotId])
  await db.query(`DELETE FROM aircraft WHERE pilot_id = $1`, [pilotId])

  for (const a of DEV_PILOT_AIRCRAFT) {
    await db.query(
      `INSERT INTO aircraft (pilot_id, tail_number, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (pilot_id, tail_number) DO UPDATE
         SET type = EXCLUDED.type`,
      [pilotId, a.tailNumber, a.type],
    )
    console.warn(`Seeded aircraft: ${a.tailNumber} (${a.type})`)
  }

  console.warn('Seed complete.')
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
} finally {
  await db.end()
}
