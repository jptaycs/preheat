import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  Sun,
  CloudSun,
  Moon,
  AlertTriangle,
  Flame,
  Plane,
  MapPin,
  BarChart3,
  PlusCircle,
  ListOrdered,
  Activity,
  CheckCircle,
  XCircle,
  Calendar,
  Thermometer,
  Wind,
  Eye,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useAuth } from '../../src/context/AuthContext'
import { useBadge } from '../../src/context/BadgeContext'
import { preheatRequestsApi, queueApi, weatherApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest, QueueResponse, WeatherSnapshot } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import {
  Card,
  ListGroup,
  ListRow,
  Button,
  SectionHeader,
  StatTile,
  IconGlyph,
} from '../../src/components/ui'
import type { Tone } from '../../src/components/ui'

function getGreeting(): { text: string; iconName: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', iconName: 'sun' }
  if (h < 18) return { text: 'Good afternoon', iconName: 'cloudsun' }
  return { text: 'Good evening', iconName: 'moon' }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function fmtWind(metar: string | null): string {
  if (!metar) return '—'
  const m = metar.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/)
  if (!m) return '—'
  const dir = m[1] === 'VRB' ? 'VRB' : `${m[1]}°`
  return m[3] ? `${dir} ${m[2]}G${m[3]}kt` : `${dir} ${m[2]}kt`
}

function fmtVisibility(metar: string | null): string {
  if (!metar) return '—'
  const m = metar.match(/\b(\d{1,2})SM\b/)
  return m ? `${m[1]}SM` : '—'
}

function getActivityIcon(status: string): { Icon: LucideIcon; tone: Tone } {
  switch (status) {
    case 'completed':
      return { Icon: CheckCircle, tone: 'green' }
    case 'active':
      return { Icon: Flame, tone: 'orange' }
    case 'cancelled':
      return { Icon: XCircle, tone: 'red' }
    default:
      return { Icon: Calendar, tone: 'blue' }
  }
}

export default function DashboardScreen() {
  const { user, logout, devLogin } = useAuth()
  const { setConfirmBadge } = useBadge()
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRequests, setMyRequests] = useState<PreheatRequest[]>([])
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [reqs, q] = await Promise.all([
        preheatRequestsApi.list({ date: todayISO() }),
        queueApi.get({ date: todayISO() }),
      ])
      setMyRequests(reqs)
      setQueue(q)
      const now = Date.now()
      const pendingCount = reqs.filter((r) => {
        if (r.status !== 'waiting') return false
        if (__DEV__) return true
        const opens = new Date(r.confirmOpensAt).getTime()
        const deadline = new Date(r.confirmDeadline).getTime()
        return now >= opens && now <= deadline
      }).length
      setConfirmBadge(pendingCount)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [setConfirmBadge])

  useFocusEffect(
    useCallback(() => {
      void fetchData()
    }, [fetchData]),
  )

  useEffect(() => {
    void (async () => {
      try {
        const w = await weatherApi.get()
        setWeather(w)
      } catch {
        // Soft-fail: weather is decorative on the dashboard.
      }
    })()
  }, [])

  useWebSocket({
    'queue.updated': () => {
      void fetchData()
    },
  })

  useEffect(() => {
    const interval = setInterval(() => void fetchData(), 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const activeRequest = myRequests.find((r) => r.status === 'active')
  const mechanicActiveEntry = queue?.entries.find((e) => e.status === 'active')
  const confirmNeeded = myRequests.filter((r) => {
    if (r.status !== 'waiting') return false
    if (__DEV__) return true
    const now = Date.now()
    const opens = new Date(r.confirmOpensAt).getTime()
    const deadline = new Date(r.confirmDeadline).getTime()
    return now >= opens && now <= deadline
  })

  const greeting = getGreeting()

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Header row with avatar */}
        <View style={styles.headerRow}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting.text}</Text>
              {greeting.iconName === 'sun' && <Sun size={14} color={colors.t2} />}
              {greeting.iconName === 'cloudsun' && <CloudSun size={14} color={colors.t2} />}
              {greeting.iconName === 'moon' && <Moon size={14} color={colors.t2} />}
            </View>
            <Text style={styles.name}>{user?.name ?? 'Pilot'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push('/(app)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name ?? 'P')}</Text>
            </View>
            {confirmNeeded.length > 0 && <View style={styles.avatarDot} />}
          </TouchableOpacity>
        </View>

        {/* Weather */}
        {weather && weather.tempC !== null && (
          <View style={styles.section}>
            <SectionHeader title="Weather" />
            <Card>
              <View style={styles.weatherHeaderRow}>
                <IconGlyph icon={Thermometer} tone="blue" size={40} />
                <View style={styles.weatherBody}>
                  <Text style={styles.weatherIcao}>{weather.icao}</Text>
                  <Text style={styles.weatherSub}>
                    {weather.observedAt
                      ? `Observed ${fmtTime(weather.observedAt)}`
                      : 'Latest observation'}
                  </Text>
                </View>
              </View>
              <View style={styles.flightGrid}>
                <StatTile
                  icon={Thermometer}
                  label="Temp"
                  value={`${weather.tempC.toFixed(0)}°C`}
                  tone="blue"
                />
                <StatTile icon={Wind} label="Wind" value={fmtWind(weather.rawMetar)} />
                <StatTile icon={Eye} label="Visibility" value={fmtVisibility(weather.rawMetar)} />
                <StatTile
                  icon={Flame}
                  label="Preheat"
                  value={`${weather.suggestedDurationMin}m`}
                  tone="orange"
                />
              </View>
              {weather.rawMetar && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.weatherMetar} numberOfLines={2}>
                    {weather.rawMetar}
                  </Text>
                </>
              )}
            </Card>
          </View>
        )}

        {/* Queue summary */}
        {!loading && queue && (
          <View style={styles.section}>
            <SectionHeader title="Today's queue" />
            <Card>
              <View style={styles.statsRow}>
                <StatTile label="Waiting" value={String(queue.stats.waiting)} tone="yellow" />
                <StatTile label="Active" value={String(queue.stats.active)} tone="orange" />
                <StatTile label="Done" value={String(queue.stats.completed)} tone="green" />
              </View>
            </Card>
          </View>
        )}

        {/* Alert banner */}
        {confirmNeeded.length > 0 && (
          <ListGroup style={styles.alertGroup}>
            <ListRow
              icon={AlertTriangle}
              tone="red"
              title="Confirmation required"
              subtitle={`${confirmNeeded.length} request${confirmNeeded.length > 1 ? 's' : ''} need confirmation`}
              showChevron
              onPress={() => router.push('/(app)/confirm')}
            />
          </ListGroup>
        )}

        {/* Loading / Error */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} />
          </View>
        )}
        {!loading && error && (
          <Card style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void fetchData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Active flight card */}
        {!loading && activeRequest && (
          <FlightCard
            tail={activeRequest.tailNumber}
            status={activeRequest.status}
            stats={[
              { icon: Flame, label: 'Preheat', value: fmtTime(activeRequest.assignedTime) },
              { icon: Plane, label: 'Engine start', value: fmtTime(activeRequest.engineStartTime) },
              {
                icon: MapPin,
                label: 'Queue pos.',
                value: `#${activeRequest.queuePosition}`,
                tone: 'blue',
              },
              { icon: BarChart3, label: 'Status', value: 'Active', tone: 'green' },
            ]}
            buttonTitle="Track Session"
            onPress={() => router.push('/(app)/track')}
          />
        )}

        {/* Confirm needed flight card */}
        {!loading && !activeRequest && confirmNeeded.length > 0 && (
          <FlightCard
            tail={confirmNeeded[0].tailNumber}
            status="confirm"
            stats={[
              { icon: Flame, label: 'Preheat', value: fmtTime(confirmNeeded[0].assignedTime) },
              {
                icon: Plane,
                label: 'Engine start',
                value: fmtTime(confirmNeeded[0].engineStartTime),
              },
              {
                icon: MapPin,
                label: 'Queue pos.',
                value: `#${confirmNeeded[0].queuePosition}`,
                tone: 'blue',
              },
            ]}
            buttonTitle="Confirm My Attendance"
            buttonTone="orange"
            onPress={() => router.push('/(app)/confirm')}
          />
        )}

        {/* Mechanic active session card */}
        {!loading && user?.role === 'mechanic' && mechanicActiveEntry && (
          <FlightCard
            tail={mechanicActiveEntry.tailNumber}
            status="active"
            stats={[
              { icon: Plane, label: 'Pilot', value: mechanicActiveEntry.pilotFirstName },
              {
                icon: Flame,
                label: 'Engine start',
                value: fmtTime(mechanicActiveEntry.engineStartTime),
              },
            ]}
            buttonTitle="Track Active Session"
            onPress={() =>
              router.push({
                pathname: '/(app)/track',
                params: { requestId: mechanicActiveEntry.id },
              })
            }
          />
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick actions" />
          <View style={styles.quickRow}>
            {user?.role === 'pilot' && (
              <QuickAction
                icon={PlusCircle}
                tone="blue"
                label="Request"
                sub="Preheat"
                onPress={() => router.push('/(app)/request')}
              />
            )}
            <QuickAction
              icon={ListOrdered}
              tone="orange"
              label="View"
              sub="Queue"
              onPress={() => router.push('/(app)/queue')}
            />
            <QuickAction
              icon={Activity}
              tone="green"
              label="Track"
              sub="Status"
              onPress={() => router.push('/(app)/track')}
            />
          </View>
        </View>

        {/* Recent activity */}
        {!loading && myRequests.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Recent activity" />
            <ListGroup>
              {myRequests.slice(0, 5).map((req) => {
                const iconStyle = getActivityIcon(req.status)
                return (
                  <ListRow
                    key={req.id}
                    icon={iconStyle.Icon}
                    tone={iconStyle.tone}
                    title={
                      req.status === 'completed'
                        ? `Preheat completed – ${req.tailNumber}`
                        : req.status === 'active'
                          ? `Preheat active – ${req.tailNumber}`
                          : `Schedule assigned – ${req.tailNumber}`
                    }
                    subtitle={`Engine start: ${fmtTime(req.engineStartTime)}`}
                  />
                )
              })}
            </ListGroup>
          </View>
        )}

        {/* Dev panel */}
        {__DEV__ && (
          <View style={styles.section}>
            <SectionHeader title="Dev panel" />
            <View style={styles.devRow}>
              <TouchableOpacity
                style={styles.devBox}
                onPress={() => void devLogin('pilot')}
                activeOpacity={0.7}
              >
                <Text style={styles.devBoxText}>Dev Pilot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devBox}
                onPress={() => void devLogin('mechanic')}
                activeOpacity={0.7}
              >
                <Text style={styles.devBoxText}>Dev Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devBox}
                onPress={() => void logout()}
                activeOpacity={0.7}
              >
                <Text style={[styles.devBoxText, styles.devBoxTextDestructive]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

interface StatSpec {
  icon: LucideIcon
  label: string
  value: string
  tone?: Tone
}

function FlightCard({
  tail,
  status,
  stats,
  buttonTitle,
  buttonTone,
  onPress,
}: {
  tail: string | null | undefined
  status: string
  stats: StatSpec[]
  buttonTitle: string
  buttonTone?: Tone
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <Card style={styles.flightCard}>
      <View style={styles.flightCardHeader}>
        <Text style={styles.flightTail}>{tail ?? '—'}</Text>
        <StatusPill status={status} />
      </View>
      <View style={styles.flightGrid}>
        {stats.map((s) => (
          <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </View>
      <View style={styles.divider} />
      <Button title={buttonTitle} tone={buttonTone ?? 'blue'} onPress={onPress} />
    </Card>
  )
}

function QuickAction({
  icon,
  tone,
  label,
  sub,
  onPress,
}: {
  icon: LucideIcon
  tone: Tone
  label: string
  sub: string
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.quickBox} onPress={onPress} activeOpacity={0.7}>
      <IconGlyph icon={icon} tone={tone} size={40} />
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </TouchableOpacity>
  )
}

function StatusPill({ status }: { status: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    waiting: { bg: colors.yellow + '33', fg: colors.yellow, label: 'Waiting' },
    confirm: { bg: colors.orangeD, fg: colors.orange, label: 'Confirm Required' },
    confirmed: { bg: colors.blue + '33', fg: colors.blue, label: 'Confirmed' },
    active: { bg: colors.green + '33', fg: colors.green, label: 'Active' },
    completed: { bg: colors.t3 + '55', fg: colors.t2, label: 'Done' },
    cancelled: { bg: colors.redD, fg: colors.red, label: 'Cancelled' },
  }
  const c = map[status] ?? { bg: colors.s3, fg: colors.t2, label: status }
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: c.fg }]} />
      <Text style={[styles.pillText, { color: c.fg }]}>{c.label.toUpperCase()}</Text>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingBottom: 110 },

    // Header
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 22,
    },
    greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    greeting: { fontSize: 14, color: colors.t2 },
    name: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 2 },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.blueD,
    },
    avatarText: { fontSize: 17, fontWeight: '600', color: colors.blue },
    avatarDot: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 11,
      height: 11,
      backgroundColor: colors.red,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.bg,
    },

    alertGroup: { marginBottom: 14 },

    // Loading / Error
    center: { alignItems: 'center', paddingVertical: 40 },
    errorBox: {
      backgroundColor: colors.redD,
      marginBottom: 20,
      alignItems: 'center',
      shadowOpacity: 0,
      elevation: 0,
    },
    errorText: { color: colors.red, fontSize: 14 },
    retryText: {
      color: colors.red,
      fontSize: 14,
      marginTop: 8,
      textDecorationLine: 'underline',
    },

    // Flight card
    flightCard: { marginBottom: 14 },
    flightCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    flightTail: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
    flightGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 16,
    },

    // Pill
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 99,
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

    // Quick actions
    section: { marginTop: 6, marginBottom: 14 },
    quickRow: { flexDirection: 'row', gap: 10 },
    quickBox: {
      flex: 1,
      backgroundColor: colors.s1,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    quickLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    quickSub: { fontSize: 11, color: colors.t3, marginTop: -4 },

    // Dev panel
    devRow: { flexDirection: 'row', gap: 10 },
    devBox: {
      flex: 1,
      backgroundColor: colors.s1,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    devBoxText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    devBoxTextDestructive: { color: colors.red },

    // Stats
    statsRow: { flexDirection: 'row' },

    // Weather
    weatherHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    weatherBody: { flex: 1 },
    weatherIcao: { fontSize: 15, fontWeight: '700', color: colors.text },
    weatherSub: { fontSize: 12, color: colors.t2, marginTop: 2 },
    weatherMetar: {
      fontSize: 11,
      color: colors.t3,
      fontFamily: 'monospace',
      lineHeight: 16,
    },
  })
