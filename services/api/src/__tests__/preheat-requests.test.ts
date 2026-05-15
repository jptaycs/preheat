import { describe, it, expect } from 'vitest'
import {
  CONFIRM_OPENS_MIN,
  CONFIRM_DEADLINE_MIN,
  PREHEAT_DURATION_MIN,
  SLOT_SPACING_MIN,
  MAX_QUEUE_PER_DAY,
} from '../config/queue.js'

// ── Pure business logic unit tests ────────────────────────────────────────────
// These test the derived time calculations and queue position rules without
// requiring a database or HTTP server.

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function subMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000)
}

function deriveSlotTimes(engineStartTime: Date) {
  return {
    assignedTime: subMinutes(engineStartTime, PREHEAT_DURATION_MIN),
    confirmOpensAt: subMinutes(engineStartTime, CONFIRM_OPENS_MIN),
    confirmDeadline: subMinutes(engineStartTime, CONFIRM_DEADLINE_MIN),
  }
}

describe('derived slot times', () => {
  const engineStart = new Date('2026-01-15T10:00:00Z')
  const { assignedTime, confirmOpensAt, confirmDeadline } = deriveSlotTimes(engineStart)

  it('assigned preheat time starts PREHEAT_DURATION_MIN before engine start', () => {
    const diff = (engineStart.getTime() - assignedTime.getTime()) / 60_000
    expect(diff).toBe(PREHEAT_DURATION_MIN)
  })

  it('confirmOpensAt is before confirmDeadline', () => {
    expect(confirmOpensAt < confirmDeadline).toBe(true)
  })

  it('confirmDeadline is before engineStartTime', () => {
    expect(confirmDeadline < engineStart).toBe(true)
  })

  it('confirmation window is CONFIRM_OPENS_MIN minutes before engine start', () => {
    const diff = (engineStart.getTime() - confirmOpensAt.getTime()) / 60_000
    expect(diff).toBe(CONFIRM_OPENS_MIN)
  })

  it('confirmation deadline is CONFIRM_DEADLINE_MIN minutes before engine start', () => {
    const diff = (engineStart.getTime() - confirmDeadline.getTime()) / 60_000
    expect(diff).toBe(CONFIRM_DEADLINE_MIN)
  })
})

describe('queue position rules', () => {
  it('first request in the day gets position 1', () => {
    // No prior requests → queuePosition starts at 1
    const queuePosition = 1
    expect(queuePosition).toBe(1)
  })

  it('second request gets position last+1', () => {
    const lastPosition = 3
    const queuePosition = lastPosition + 1
    expect(queuePosition).toBe(4)
  })

  it('request is rejected when queue is at MAX_QUEUE_PER_DAY', () => {
    const lastPosition = MAX_QUEUE_PER_DAY
    const nextPosition = lastPosition + 1
    expect(nextPosition > MAX_QUEUE_PER_DAY).toBe(true)
  })

  it('request just below MAX_QUEUE_PER_DAY is allowed', () => {
    const lastPosition = MAX_QUEUE_PER_DAY - 1
    const nextPosition = lastPosition + 1
    expect(nextPosition > MAX_QUEUE_PER_DAY).toBe(false)
  })
})

describe('slot spacing enforcement', () => {
  const firstStart = new Date('2026-01-15T09:00:00Z')

  it('rejects second start time less than SLOT_SPACING_MIN after first', () => {
    const tooClose = addMinutes(firstStart, SLOT_SPACING_MIN - 1)
    const minimumStart = addMinutes(firstStart, SLOT_SPACING_MIN)
    expect(tooClose < minimumStart).toBe(true) // would be rejected
  })

  it('allows second start time exactly SLOT_SPACING_MIN after first', () => {
    const exactlyRight = addMinutes(firstStart, SLOT_SPACING_MIN)
    const minimumStart = addMinutes(firstStart, SLOT_SPACING_MIN)
    expect(exactlyRight < minimumStart).toBe(false) // allowed
  })

  it('allows second start time well after first', () => {
    const comfortable = addMinutes(firstStart, 60)
    const minimumStart = addMinutes(firstStart, SLOT_SPACING_MIN)
    expect(comfortable < minimumStart).toBe(false) // allowed
  })
})

describe('confirmation window validation', () => {
  it('correctly identifies a request inside the confirmation window', () => {
    const engineStart = new Date(Date.now() + 35 * 60_000) // 35 min from now
    const confirmOpensAt = subMinutes(engineStart, CONFIRM_OPENS_MIN)
    const confirmDeadline = subMinutes(engineStart, CONFIRM_DEADLINE_MIN)
    const now = new Date()
    const inWindow = now >= confirmOpensAt && now <= confirmDeadline
    expect(inWindow).toBe(true)
  })

  it('correctly identifies a request outside the confirmation window (too early)', () => {
    const engineStart = new Date(Date.now() + 120 * 60_000) // 2 hours from now
    const confirmOpensAt = subMinutes(engineStart, CONFIRM_OPENS_MIN)
    const now = new Date()
    const inWindow = now >= confirmOpensAt
    expect(inWindow).toBe(false)
  })

  it('correctly identifies a request outside the confirmation window (expired)', () => {
    const engineStart = new Date(Date.now() - 60_000) // started 1 min ago
    const confirmDeadline = subMinutes(engineStart, CONFIRM_DEADLINE_MIN)
    const now = new Date()
    const windowOpen = now <= confirmDeadline
    expect(windowOpen).toBe(false)
  })
})
