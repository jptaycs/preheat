/** Minutes of preheat duration (avg of 10-25 min OAT range) */
export const PREHEAT_DURATION_MINUTES = 20

/** Minutes of spacing between consecutive engine start times */
export const SLOT_SPACING_MINUTES = 15

/** Minutes before engine start that confirmation window opens */
export const CONFIRM_OPENS_MINUTES = 40

/** Minutes before engine start that confirmation deadline closes */
export const CONFIRM_DEADLINE_MINUTES = 30

/** UTC hour at which booking opens for the next day */
export const BOOKING_OPENS_HOUR_UTC = 19

/** Default target preheat temperature in Celsius */
export const DEFAULT_TARGET_TEMP_CELSIUS = 5

/** Max queue length per day (default) */
export const DEFAULT_MAX_QUEUE_LENGTH = 20

/** Background job polling interval in milliseconds */
export const JOB_INTERVAL_MS = 60_000
