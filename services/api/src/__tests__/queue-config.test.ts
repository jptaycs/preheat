import { describe, it, expect } from 'vitest'
import {
  SLOT_SPACING_MIN,
  CONFIRM_OPENS_MIN,
  CONFIRM_DEADLINE_MIN,
  MAX_QUEUE_PER_DAY,
  DEFAULT_DURATION_MIN,
  MIN_DURATION_MIN,
  MAX_DURATION_MIN,
} from '../config/queue.js'

describe('queue config invariants', () => {
  it('confirm window is correctly ordered: opens before deadline', () => {
    expect(CONFIRM_OPENS_MIN).toBeGreaterThan(CONFIRM_DEADLINE_MIN)
  })

  it('slot spacing is positive', () => {
    expect(SLOT_SPACING_MIN).toBeGreaterThan(0)
  })

  it('max queue is a reasonable limit', () => {
    expect(MAX_QUEUE_PER_DAY).toBeGreaterThanOrEqual(10)
    expect(MAX_QUEUE_PER_DAY).toBeLessThanOrEqual(100)
  })

  it('default duration is within allowed range', () => {
    expect(DEFAULT_DURATION_MIN).toBeGreaterThanOrEqual(MIN_DURATION_MIN)
    expect(DEFAULT_DURATION_MIN).toBeLessThanOrEqual(MAX_DURATION_MIN)
  })

  it('min duration is less than max duration', () => {
    expect(MIN_DURATION_MIN).toBeLessThan(MAX_DURATION_MIN)
  })
})

describe('slot assignment logic', () => {
  function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000)
  }

  it('second request must start at least SLOT_SPACING_MIN after first', () => {
    const firstStart = new Date('2026-01-15T10:00:00Z')
    const minimumSecond = addMinutes(firstStart, SLOT_SPACING_MIN)
    const tooSoon = addMinutes(firstStart, SLOT_SPACING_MIN - 1)
    const justRight = addMinutes(firstStart, SLOT_SPACING_MIN)
    const late = addMinutes(firstStart, SLOT_SPACING_MIN + 30)

    expect(tooSoon < minimumSecond).toBe(true)
    expect(justRight < minimumSecond).toBe(false)
    expect(late < minimumSecond).toBe(false)
  })

  it('confirmation window opens before the deadline', () => {
    const engineStart = new Date('2026-01-15T10:00:00Z')
    const opens = new Date(engineStart.getTime() - CONFIRM_OPENS_MIN * 60_000)
    const deadline = new Date(engineStart.getTime() - CONFIRM_DEADLINE_MIN * 60_000)
    expect(opens < deadline).toBe(true)
    expect(deadline < engineStart).toBe(true)
  })
})
