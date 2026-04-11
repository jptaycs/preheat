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
  console.warn('Seed complete.')
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
} finally {
  await db.end()
}
