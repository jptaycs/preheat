import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../db/client.js', () => ({
  db: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) },
  withTransaction: vi.fn(),
}))
vi.mock('../lib/broadcast.js', () => ({ broadcast: vi.fn() }))
vi.mock('../lib/push.js', () => ({ sendPushNotification: vi.fn() }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockApp() {
  return {
    addHook: vi.fn(),
    log: { info: vi.fn(), error: vi.fn() },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auto-cancel job: startup and idle behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('starts without throwing', async () => {
    const { startAutoCancelJob } = await import('../jobs/autoCancel.js')
    const app = makeMockApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    expect(() => startAutoCancelJob(app as any)).not.toThrow()
    vi.clearAllTimers()
  })

  it('queries the database on initial run', async () => {
    const { db } = await import('../db/client.js')
    const mockDb = db as { query: ReturnType<typeof vi.fn> }

    const { startAutoCancelJob } = await import('../jobs/autoCancel.js')
    const app = makeMockApp()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    startAutoCancelJob(app as any)

    // Let the initial run() Promise settle
    await vi.advanceTimersByTimeAsync(1)

    expect(mockDb.query).toHaveBeenCalled()
    vi.clearAllTimers()
  })

  it('does not cancel anything when no expired requests are found', async () => {
    const { db } = await import('../db/client.js')
    const mockDb = db as { query: ReturnType<typeof vi.fn> }
    mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 })

    const { startAutoCancelJob } = await import('../jobs/autoCancel.js')
    const app = makeMockApp()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    startAutoCancelJob(app as any)
    await vi.advanceTimersByTimeAsync(1)

    const cancelCalls = mockDb.query.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes("status = 'cancelled'"),
    )
    expect(cancelCalls).toHaveLength(0)
    vi.clearAllTimers()
  })
})

describe('confirm reminder job: startup and idle behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('starts without throwing', async () => {
    const { startConfirmReminderJob } = await import('../jobs/confirmReminder.js')
    const app = makeMockApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    expect(() => startConfirmReminderJob(app as any)).not.toThrow()
    vi.clearAllTimers()
  })

  it('does not send push when no requests are in the confirmation window', async () => {
    const { sendPushNotification } = await import('../lib/push.js')
    const mockPush = sendPushNotification as ReturnType<typeof vi.fn>
    mockPush.mockClear()

    const { db } = await import('../db/client.js')
    const mockDb = db as { query: ReturnType<typeof vi.fn> }
    mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 })

    const { startConfirmReminderJob } = await import('../jobs/confirmReminder.js')
    const app = makeMockApp()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    startConfirmReminderJob(app as any)
    await vi.advanceTimersByTimeAsync(1)

    expect(mockPush).not.toHaveBeenCalled()
    vi.clearAllTimers()
  })
})
