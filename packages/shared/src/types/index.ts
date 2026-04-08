// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'pilot' | 'dispatcher' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  licenseNumber: string | null
  createdAt: string
}

// ── Aircraft ──────────────────────────────────────────────────────────────────

export interface Aircraft {
  id: string
  tailNumber: string
  type: string
  ownerId: string
}

// ── Preheat Request ───────────────────────────────────────────────────────────

export type PreheatRequestStatus = 'waiting' | 'confirmed' | 'active' | 'done' | 'canceled'

export interface PreheatRequest {
  id: string
  pilotId: string
  aircraftId: string
  date: string // ISO date string YYYY-MM-DD
  requestedTime: string // HH:mm
  assignedTime: string // HH:mm
  queuePosition: number
  status: PreheatRequestStatus
  notes: string | null
  delayMinutes: number
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PreheatRequestWithDetails extends PreheatRequest {
  aircraft: Aircraft
  pilotName: string // first name only for privacy in queue view
}

// ── Preheat Session ───────────────────────────────────────────────────────────

export interface PreheatSession {
  id: string
  requestId: string
  startedAt: string
  completedAt: string | null
  ambientTemp: number // °C
  startTemp: number // °C
  targetTemp: number // °C
  currentTemp: number // °C
  progressPct: number // 0–100
}

// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'confirmation_required'
  | 'schedule_assigned'
  | 'preheat_started'
  | 'preheat_done'
  | 'queue_changed'
  | 'slot_canceled'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ── WebSocket Events ──────────────────────────────────────────────────────────

export type WsEventType = 'queue.updated' | 'session.updated' | 'session.completed'

export interface WsEvent<T = unknown> {
  type: WsEventType
  payload: T
}
