// ── Types ──────────────────────────────────────────────────────────────────

export interface QueueEntry {
  id: string
  queuePosition: number
  engineStartTime: string
  assignedTime: string
  confirmOpensAt: string
  confirmDeadline: string
  status: string
  notes?: string
  pilotFirstName: string
  tailNumber: string
  aircraftType: string
  isMine: boolean
  sessionId?: string
}

export interface QueueResponse {
  date: string
  entries: QueueEntry[]
  stats: {
    waiting: number
    confirmed: number
    active: number
    completed: number
  }
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  licenseNumber: string | null
  createdAt: string
}

// ── Token storage ──────────────────────────────────────────────────────────

const KEYS = {
  access: 'preheat_access_token',
  refresh: 'preheat_refresh_token',
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.access)
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refresh)
}
export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(KEYS.access, accessToken)
  localStorage.setItem(KEYS.refresh, refreshToken)
}
export function clearTokens(): void {
  localStorage.removeItem(KEYS.access)
  localStorage.removeItem(KEYS.refresh)
}

// ── HTTP client ────────────────────────────────────────────────────────────

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    window.location.href = '/login'
    throw new Error('Token refresh failed')
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string }
  saveTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push((newToken) => {
          headers['Authorization'] = `Bearer ${newToken}`
          fetch(`/api${path}`, { ...options, headers })
            .then((r) => r.json() as Promise<T>)
            .then(resolve)
            .catch(reject)
        })
      })
    }

    isRefreshing = true
    try {
      const newToken = await refreshAccessToken()
      isRefreshing = false
      onRefreshed(newToken)
      return request<T>(path, options, false)
    } catch (e) {
      isRefreshing = false
      throw e
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string
    }
    throw new Error(body.message ?? res.statusText)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  me(): Promise<{ id: string; name: string; email: string; role: string }> {
    return request('/auth/me')
  },

  logout(): Promise<void> {
    return request('/auth/logout', { method: 'POST' })
  },
}

// ── Queue API ──────────────────────────────────────────────────────────────

export const queueApi = {
  get(date?: string): Promise<QueueResponse> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : ''
    return request(`/queue${qs}`)
  },

  cancelRequest(requestId: string): Promise<{ success: boolean }> {
    return request(`/queue/${requestId}`, { method: 'DELETE' })
  },
}

// ── Sessions API ───────────────────────────────────────────────────────────

export interface SessionReading {
  id: string
  tempCelsius: number
  recordedAt: string
}

export interface SessionDetail {
  id: string
  startedAt: string
  completedAt: string | null
  currentTempCelsius: number | null
  durationMinutes: number
  readings: SessionReading[]
}

export const sessionsApi = {
  start(requestId: string): Promise<{ id: string; startedAt: string }> {
    return request('/preheat-sessions', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    })
  },

  getByRequest(requestId: string): Promise<SessionDetail> {
    return request(`/preheat-sessions/by-request/${requestId}`)
  },

  addReading(sessionId: string, tempCelsius: number): Promise<void> {
    return request(`/preheat-sessions/${sessionId}/reading`, {
      method: 'POST',
      body: JSON.stringify({ tempCelsius }),
    })
  },

  complete(sessionId: string): Promise<void> {
    return request(`/preheat-sessions/${sessionId}/complete`, {
      method: 'POST',
    })
  },
}

// ── Admin API ──────────────────────────────────────────────────────────────

export const adminApi = {
  getUsers(): Promise<User[]> {
    return request('/admin/users')
  },

  createUser(body: { name: string; email: string; password: string; role: string }): Promise<User> {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateRole(userId: string, role: string): Promise<User> {
    return request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  deleteUser(userId: string): Promise<void> {
    return request(`/admin/users/${userId}`, { method: 'DELETE' })
  },
}

// ── Preheat Requests API ───────────────────────────────────────────────────

export const preheatRequestsApi = {
  cancel(requestId: string): Promise<void> {
    return request(`/preheat-requests/${requestId}`, { method: 'DELETE' })
  },
}
