import 'dotenv/config'
import { db } from './client.js'

const sql = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'pilot' CHECK (role IN ('pilot', 'mechanic', 'dispatcher', 'admin')),
    license_number TEXT,
    push_token     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Add mechanic role if constraint was created without it
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('pilot', 'mechanic', 'dispatcher', 'admin'));

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS aircraft (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilot_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tail_number  TEXT NOT NULL,
    type         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pilot_id, tail_number)
  );

  CREATE INDEX IF NOT EXISTS idx_aircraft_pilot_id ON aircraft(pilot_id);

  CREATE TABLE IF NOT EXISTS preheat_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pilot_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aircraft_id       UUID NOT NULL REFERENCES aircraft(id),
    request_date      DATE NOT NULL,
    engine_start_time TIMESTAMPTZ NOT NULL,
    assigned_time     TIMESTAMPTZ NOT NULL,
    confirm_opens_at  TIMESTAMPTZ NOT NULL,
    confirm_deadline  TIMESTAMPTZ NOT NULL,
    queue_position    INTEGER NOT NULL,
    status            TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting','confirmed','active','completed','cancelled')),
    notes             TEXT,
    confirmed_at      TIMESTAMPTZ,
    cancelled_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_preheat_requests_pilot_id    ON preheat_requests(pilot_id);
  CREATE INDEX IF NOT EXISTS idx_preheat_requests_date_status ON preheat_requests(request_date, status);

  CREATE TABLE IF NOT EXISTS preheat_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id           UUID NOT NULL UNIQUE REFERENCES preheat_requests(id),
    mechanic_id          UUID NOT NULL REFERENCES users(id),
    current_temp_celsius NUMERIC(5,2),
    started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_preheat_sessions_request_id ON preheat_sessions(request_id);

  CREATE TABLE IF NOT EXISTS session_readings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES preheat_sessions(id) ON DELETE CASCADE,
    temp_celsius NUMERIC(5,2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_session_readings_session_id ON session_readings(session_id);

  -- Notification preferences (JSONB with defaults)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"scheduleAlerts":true,"confirmReminder":true,"preheatProgress":true,"queueChanges":false}';

  -- Timer duration columns (idempotent)
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'preheat_sessions' AND column_name = 'duration_minutes'
    ) THEN
      ALTER TABLE preheat_sessions ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 20;
    END IF;
  END $$;

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'preheat_requests' AND column_name = 'preferred_duration_minutes'
    ) THEN
      ALTER TABLE preheat_requests ADD COLUMN preferred_duration_minutes INTEGER;
    END IF;
  END $$;

  -- Payments are billed per aircraft (per plane), not per user
  CREATE TABLE IF NOT EXISTS payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id  UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    session_id   UUID UNIQUE REFERENCES preheat_sessions(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
    notes        TEXT,
    paid_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_payments_aircraft_id ON payments(aircraft_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
`

try {
  await db.query(sql)
  console.warn('Migration complete.')
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
} finally {
  await db.end()
}
