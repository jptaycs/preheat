/**
 * Queue configuration — single source of truth for all preheat scheduling constants.
 *
 * To change a value, edit it here. All routes and jobs import from this file.
 */

/** Average preheat duration in minutes (range: 10-25 depending on OAT) */
export const PREHEAT_DURATION_MIN = 20

/** Minimum gap in minutes between consecutive engine start times (Rule #2) */
export const SLOT_SPACING_MIN = 15

/** Confirmation window opens this many minutes before engine start (Rule #3) */
export const CONFIRM_OPENS_MIN = 40

/** Confirmation deadline: must confirm before this many minutes before engine start (Rule #3) */
export const CONFIRM_DEADLINE_MIN = 30

/** UTC hour at which booking opens for the next day (Rule #1) */
export const BOOKING_OPENS_HOUR = 19

/** Background job polling interval in milliseconds */
export const JOB_INTERVAL_MS = 60_000
