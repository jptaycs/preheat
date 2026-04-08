import { storage } from './storage'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:4000'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  auth?: boolean // attach Bearer token (default: true)
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    await storage.clearTokens()
    return null
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string }
  await storage.setTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = await storage.getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Token expired — attempt refresh once
  if (res.status === 401 && auth) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingRequests.push((_token) => {
          request<T>(path, { ...options, auth: false, body: options.body })
            .then(resolve)
            .catch((e: unknown) => {
              reject(e)
            })
        })
      })
    }

    isRefreshing = true
    const newToken = await refreshAccessToken()
    isRefreshing = false

    if (newToken) {
      pendingRequests.forEach((cb) => cb(newToken))
      pendingRequests = []
      return request<T>(path, options)
    } else {
      pendingRequests = []
      throw new ApiError(401, 'Session expired. Please sign in again.')
    }
  }

  const data = (await res.json()) as T
  if (!res.ok) {
    const err = data as { message?: string }
    throw new ApiError(res.status, err.message ?? 'Something went wrong')
  }

  return data
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  register(payload: { name: string; email: string; password: string; licenseNumber?: string }) {
    return request<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    })
  },

  login(payload: { email: string; password: string }) {
    return request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    })
  },

  me() {
    return request<{
      id: string
      name: string
      email: string
      role: string
      licenseNumber: string | null
    }>('/auth/me')
  },

  logout() {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
  },
}

export { ApiError }
