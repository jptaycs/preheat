import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { queueApi, preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { QueueEntry, QueueResponse } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { Flame, Plane } from 'lucide-react-native'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { Card, Chip, LargeTitle, StatTile } from '../../src/components/ui'

type FilterStatus = 'all' | 'waiting' | 'confirmed' | 'active' | 'completed'

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function isInConfirmWindow(entry: QueueEntry): boolean {
  if (entry.status !== 'waiting') return false
  if (__DEV__) return true // skip time window check in dev
  const now = Date.now()
  const opens = new Date(entry.confirmOpensAt).getTime()
  const deadline = new Date(entry.confirmDeadline).getTime()
  return now >= opens && now <= deadline
}

const getStatusColors = (
  colors: ThemeColors,
): Record<string, { bg: string; fg: string; label: string }> => ({
  waiting: { bg: colors.yellowD, fg: colors.yellow, label: 'Waiting' },
  confirmed: { bg: colors.blueD, fg: colors.blue, label: 'Confirmed' },
  active: { bg: colors.orangeD, fg: colors.orange, label: 'Heating' },
  completed: { bg: colors.greenD, fg: colors.green, label: 'Done' },
  cancelled: { bg: colors.redD, fg: colors.red, label: 'Cancelled' },
})

export default function QueueScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const STATUS_COLORS = useMemo(() => getStatusColors(colors), [colors])
  const isMechanic = user?.role === 'mechanic'
  const today = new Date()
  const dates = ['all', addDays(today, 0), addDays(today, 1), addDays(today, 2)]

  const [selectedDate, setSelectedDate] = useState('all')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueData, setQueueData] = useState<QueueResponse | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchQueue = useCallback(async (date: string) => {
    try {
      setError(null)
      const data = await queueApi.get(date === 'all' ? undefined : { date })
      setQueueData(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      void fetchQueue(selectedDate)
    }, [selectedDate, fetchQueue]),
  )

  useWebSocket({
    'queue.updated': () => {
      void fetchQueue(selectedDate)
    },
  })

  useEffect(() => {
    const interval = setInterval(() => void fetchQueue(selectedDate), 5000)
    return () => clearInterval(interval)
  }, [fetchQueue, selectedDate])

  async function handleConfirm(entry: QueueEntry) {
    setConfirming(entry.id)
    try {
      await preheatRequestsApi.confirm(entry.id)
      await fetchQueue(selectedDate)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Confirmation failed')
    } finally {
      setConfirming(null)
    }
  }

  const entries = queueData?.entries ?? []
  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter)
  const stats = queueData?.stats
  const totalCount = stats
    ? stats.waiting + stats.confirmed + stats.active + stats.completed
    : entries.length

  function handleCardPress(item: QueueEntry) {
    if (isMechanic) {
      router.push(
        `/(app)/track?requestId=${item.id}&tailNumber=${encodeURIComponent(item.tailNumber)}&aircraftType=${encodeURIComponent(item.aircraftType)}&pilotName=${encodeURIComponent(item.pilotFirstName)}`,
      )
      return
    }
    if (item.status === 'active') {
      router.push(`/(app)/track?requestId=${item.id}`)
    } else if (item.isMine && item.status === 'waiting') {
      router.push('/(app)/confirm')
    } else if (item.isMine) {
      router.push(`/(app)/track?requestId=${item.id}`)
    }
  }

  function renderItem({ item, index }: { item: QueueEntry; index: number }) {
    const sc = STATUS_COLORS[item.status] ?? { bg: colors.s3, fg: colors.t2, label: item.status }
    const inWindow = isInConfirmWindow(item)
    const tappable = item.isMine || item.status === 'active' || isMechanic

    const isMine = item.isMine
    const isActive = item.status === 'active'
    const isDone = item.status === 'completed'
    const posColor = isMine
      ? colors.blue
      : isActive
        ? colors.orange
        : isDone
          ? colors.green
          : colors.t2

    return (
      <TouchableOpacity
        style={[styles.queueItem, isMine && { backgroundColor: colors.blueG }]}
        onPress={() => handleCardPress(item)}
        activeOpacity={tappable ? 0.75 : 1}
        disabled={!tappable}
        accessibilityRole={tappable ? 'button' : 'none'}
        accessibilityLabel={`${item.tailNumber}, queue position ${item.queuePosition ?? index + 1}, status ${sc.label}${isMine ? ', your aircraft' : ''}`}
        accessibilityHint={tappable ? 'Tap to view details' : undefined}
      >
        {/* Position panel */}
        <View style={styles.posPanel}>
          <Text style={[styles.posNum, { color: posColor }]}>
            #{item.queuePosition ?? index + 1}
          </Text>
          <Text
            style={[
              styles.posLabel,
              isMine && { color: colors.blue },
              isActive && { color: colors.orange },
            ]}
          >
            {isMine ? 'You' : isDone ? 'Done' : isActive ? 'Active' : 'Wait'}
          </Text>
        </View>

        {/* Body */}
        <View style={styles.queueBody}>
          <View style={styles.queueTopRow}>
            <Text style={styles.queueTail}>{item.tailNumber}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: sc.fg }]} />
              <Text style={[styles.statusPillText, { color: sc.fg }]}>{sc.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isMine && <Plane size={12} color={colors.blue} />}
            <Text style={[styles.queueMeta, isMine && { color: colors.blue }]}>
              {isMine ? 'My Aircraft' : `${item.aircraftType} · ${item.pilotFirstName}`}
            </Text>
          </View>

          {/* Times row */}
          <View style={styles.timesRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Flame size={10} color={colors.t3} />
                <Text style={styles.timeLabel}>Preheat</Text>
              </View>
              <Text style={styles.timeValue}>{fmtTime(item.engineStartTime)}</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Plane size={10} color={colors.t3} />
                <Text style={styles.timeLabel}>Flight</Text>
              </View>
              <Text style={styles.timeValue}>{fmtTime(item.engineStartTime)}</Text>
            </View>
          </View>

          {/* Confirm button for mine items in window */}
          {isMine && inWindow && (
            <TouchableOpacity
              style={styles.inlineConfirmBtn}
              onPress={() => void handleConfirm(item)}
              disabled={confirming === item.id}
              accessibilityRole="button"
              accessibilityLabel={`Confirm preheat for ${item.tailNumber}`}
              accessibilityState={{
                disabled: confirming === item.id,
                busy: confirming === item.id,
              }}
            >
              {confirming === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.inlineConfirmText}>Confirm Now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerPad}>
        <LargeTitle
          title="Preheat Queue"
          subtitle={`${selectedDate === dates[0] ? 'Today' : fmtDate(selectedDate)} · ${totalCount} aircraft`}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        {(['all', 'waiting', 'active', 'completed'] as FilterStatus[]).map((f) => (
          <Chip
            key={f}
            active={filter === f}
            onPress={() => setFilter(f)}
            label={
              f === 'all'
                ? 'All'
                : f === 'waiting'
                  ? 'Upcoming'
                  : f === 'active'
                    ? 'Active'
                    : 'Done'
            }
          />
        ))}
      </View>

      {/* Stats bar */}
      {stats && (
        <View style={styles.statsBar}>
          <Card>
            <View style={styles.statsRow}>
              <StatTile label="Waiting" value={String(stats.waiting)} tone="yellow" />
              <StatTile label="Active" value={String(stats.active)} tone="orange" />
              <StatTile label="Done" value={String(stats.completed)} tone="green" />
            </View>
          </Card>
        </View>
      )}

      {/* Date chips */}
      <View style={styles.dateRow}>
        {dates.map((d) => (
          <Chip
            key={d}
            active={selectedDate === d}
            onPress={() => setSelectedDate(d)}
            label={d === 'all' ? 'All' : d === dates[1] ? 'Today' : fmtDate(d)}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : error ? (
        <Card style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No entries for this filter</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerPad: { paddingHorizontal: 20, paddingTop: 10 },

    // Chips
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      marginBottom: 14,
    },

    // Stats bar
    statsBar: { paddingHorizontal: 20, marginBottom: 14 },
    statsRow: { flexDirection: 'row' },

    // Date row
    dateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },

    // Queue item
    queueItem: {
      flexDirection: 'row',
      backgroundColor: colors.s1,
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },

    // Position panel
    posPanel: {
      width: 54,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 14,
    },
    posNum: { fontSize: 20, fontWeight: '700' },
    posLabel: {
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: colors.t3,
      letterSpacing: 0.4,
    },

    // Body
    queueBody: { flex: 1, padding: 13 },
    queueTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    queueTail: { fontSize: 16, fontWeight: '600', color: colors.text },
    queueMeta: { fontSize: 12, color: colors.t2, marginTop: 2 },

    // Status pill
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: '700' },

    // Times
    timesRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
    timeLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeValue: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 1 },

    // Inline confirm
    inlineConfirmBtn: {
      backgroundColor: colors.orange,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 14,
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    inlineConfirmText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    // List
    listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorBox: { margin: 16, backgroundColor: colors.redD, shadowOpacity: 0, elevation: 0 },
    errorText: { color: colors.red, fontSize: 14, textAlign: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { color: colors.t3, fontSize: 14 },
  })
