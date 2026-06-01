/**
 * METAR weather lookup and OAT → preheat-duration mapping.
 *
 * Data source: aviationweather.gov public API (no key required).
 * Per their TOS we cache responses for 10 minutes to avoid being rate-limited.
 */

const METAR_URL = 'https://aviationweather.gov/api/data/metar'
const CACHE_TTL_MS = 10 * 60 * 1000

interface MetarResponse {
  temp: number | null
  obsTime: number | null
  rawOb: string | null
}

interface CachedEntry {
  fetchedAt: number
  data: WeatherSnapshot
}

export interface WeatherSnapshot {
  icao: string
  tempC: number | null
  observedAt: string | null
  rawMetar: string | null
  suggestedDurationMin: number
}

const cache = new Map<string, CachedEntry>()

/**
 * Cold-engine GA preheat duration rule-of-thumb. Single source of truth — tweak here.
 * Boundaries are inclusive on the lower end (e.g. exactly -10°C → 22 min).
 */
export function suggestedDuration(tempC: number | null): number {
  if (tempC === null || Number.isNaN(tempC)) return 20 // fall back to current default
  if (tempC > 5) return 10
  if (tempC > 0) return 12
  if (tempC > -5) return 15
  if (tempC > -10) return 18
  if (tempC > -15) return 22
  return 25
}

export async function getWeather(icao: string): Promise<WeatherSnapshot> {
  const key = icao.toUpperCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const url = `${METAR_URL}?ids=${encodeURIComponent(key)}&format=json&hours=1`
  let payload: MetarResponse[] = []
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'AeroFluxPro/1.0' } })
    if (!res.ok) throw new Error(`METAR HTTP ${res.status}`)
    payload = (await res.json()) as MetarResponse[]
  } catch {
    // Network or parse failure — return a snapshot with no temp so callers can fall back.
    const fallback: WeatherSnapshot = {
      icao: key,
      tempC: null,
      observedAt: null,
      rawMetar: null,
      suggestedDurationMin: suggestedDuration(null),
    }
    return fallback
  }

  const latest = payload[0]
  const tempC = latest?.temp ?? null
  const observedAt = latest?.obsTime ? new Date(latest.obsTime * 1000).toISOString() : null

  const snapshot: WeatherSnapshot = {
    icao: key,
    tempC,
    observedAt,
    rawMetar: latest?.rawOb ?? null,
    suggestedDurationMin: suggestedDuration(tempC),
  }

  cache.set(key, { fetchedAt: Date.now(), data: snapshot })
  return snapshot
}
