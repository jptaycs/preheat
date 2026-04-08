import { createHmac, randomBytes } from 'crypto'

const secret = process.env.JWT_SECRET
if (!secret) throw new Error('JWT_SECRET environment variable is required')

export interface AccessTokenPayload {
  sub: string // user id
  role: string
  iat: number
  exp: number
}

function base64url(input: string | Buffer): string {
  const str = typeof input === 'string' ? Buffer.from(input) : input
  return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function sign(payload: object): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const sig = base64url(createHmac('sha256', secret!).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

function verify(token: string): AccessTokenPayload {
  const [header, body, sig] = token.split('.')
  if (!header || !body || !sig) throw new Error('Invalid token format')

  const expected = base64url(createHmac('sha256', secret!).update(`${header}.${body}`).digest())
  if (sig !== expected) throw new Error('Invalid token signature')

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AccessTokenPayload
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')

  return payload
}

export function signAccessToken(userId: string, role: string): string {
  const now = Math.floor(Date.now() / 1000)
  return sign({ sub: userId, role, iat: now, exp: now + 15 * 60 }) // 15 min
}

export function signRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(40).toString('hex')
  const hash = createHmac('sha256', secret!).update(raw).digest('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  return { raw, hash, expiresAt }
}

export function hashRefreshToken(raw: string): string {
  return createHmac('sha256', secret!).update(raw).digest('hex')
}

export { verify as verifyAccessToken }
