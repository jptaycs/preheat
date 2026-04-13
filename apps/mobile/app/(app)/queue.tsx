import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { queueApi, preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { QueueEntry, QueueResponse } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'

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
  const now = Date.now()
  const opens = new Date(entry.confirmOpensAt).getTime()
  const deadline = new Date(entry.confirmDeadline).getTime()
  return now >= opens && now <= deadline
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  waiting: { bg: '#3A3420', fg: colors.yellow, label: 'Waiting' },
  confirmed: { bg: colors.blueD, fg: colors.blue, label: 'Confirmed' },
  active: { bg: colors.orangeD, fg: colors.orange, label: 'Heating' },
  completed: { bg: colors.greenD, fg: colors.green, label: 'Done' },
  cancelled: { bg: colors.redD, fg: colors.red, label: 'Cancelled' },
}

export default function QueueScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const isMechanic = user?.role === 'mechanic'
  const today = new Date()
  const dates = [addDays(today, 0), addDays(today, 1), addDays(today, 2)]

  const [selectedDate, setSelectedDate] = useState(dates[0])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueData, setQueueData] = useState<QueueResponse | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchQueue = useCallback(async (date: string) => {
    try {
      setError(null)
      const data = await queueApi.get({ date })
      setQueueData(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void fetchQueue(selectedDate)
  }, [selectedDate, fetchQueue])

  useWebSocket({
    'queue.updated': () => {
      void fetchQueue(selectedDate)
    },
  })

  async function handleConfirm(entry: QueueEntry) {
    setConfirming(entry.id)
    try {
      await preheatRequestsApi.confirm(entry.id)
      await fetchQueue(selectedDate)
    } catch {
      // ignore
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
      if (item.status === 'confirmed' || item.status === 'active') {
        router.push(
          `/(app)/track?requestId=${item.id}&tailNumber=${encodeURIComponent(item.tailNumber)}&aircraftType=${encodeURIComponent(item.aircraftType)}&pilotName=${encodeURIComponent(item.pilotFirstName)}`,
        )
      }
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
    const tappable =
      item.isMine ||
      item.status === 'active' ||
      (isMechanic && (item.status === 'confirmed' || item.status === 'active'))

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
        style={[
          styles.queueItem,
          isMine && styles.queueItemMine,
          isActive && styles.queueItemActive,
          isDone && styles.queueItemDone,
        ]}
        onPress={() => handleCardPress(item)}
        activeOpacity={tappable ? 0.75 : 1}
        disabled={!tappable}
      >
        {/* Position panel */}
        <View
          style={[
            styles.posPanel,
            isMine && styles.posPanelMine,
            isActive && styles.posPanelActive,
            isDone && styles.posPanelDone,
          ]}
        >
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
          <Text style={[styles.queueMeta, isMine && { color: colors.blue }]}>
            {isMine ? '✈ My Aircraft' : `${item.aircraftType} · ${item.pilotFirstName}`}
          </Text>

          {/* Times row */}
          <View style={styles.timesRow}>
            <View>
              <Text style={styles.timeLabel}>🔥 Preheat</Text>
              <Text style={styles.timeValue}>{fmtTime(item.engineStartTime)}</Text>
            </View>
            <View>
              <Text style={styles.timeLabel}>✈ Flight</Text>
              <Text style={styles.timeValue}>{fmtTime(item.engineStartTime)}</Text>
            </View>
          </View>

          {/* Confirm button for mine items in window */}
          {isMine && inWindow && (
            <TouchableOpacity
              style={styles.inlineConfirmBtn}
              onPress={() => void handleConfirm(item)}
              disabled={confirming === item.id}
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
        <Text style={styles.screenTitle}>Preheat Queue</Text>
        <Text style={styles.screenSub}>
          {selectedDate === dates[0] ? 'Today' : fmtDate(selectedDate)} · {totalCount} aircraft
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        {(['all', 'waiting', 'active', 'completed'] as FilterStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all'
                ? 'All'
                : f === 'waiting'
                  ? 'Upcoming'
                  : f === 'active'
                    ? 'Active'
                    : 'Done'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats bar */}
      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>Waiting</Text>
            <Text style={[styles.statItemNum, { color: colors.yellow }]}>{stats.waiting}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>Active</Text>
            <Text style={[styles.statItemNum, { color: colors.orange }]}>{stats.active}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>Done</Text>
            <Text style={[styles.statItemNum, { color: colors.green }]}>{stats.completed}</Text>
          </View>
        </View>
      )}

      {/* Date chips */}
      <View style={styles.dateRow}>
        {dates.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dateChip, selectedDate === d && styles.dateChipActive]}
            onPress={() => setSelectedDate(d)}
          >
            <Text style={[styles.dateChipText, selectedDate === d && styles.dateChipTextActive]}>
              {d === dates[0] ? 'Today' : fmtDate(d)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerPad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  screenTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
  screenSub: { fontSize: 13, color: colors.t2, marginBottom: 14 },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.blueD, borderColor: colors.blue },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.t2 },
  chipTextActive: { color: colors.blue },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statItemLabel: {
    fontSize: 10,
    color: colors.t3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statItemNum: { fontSize: 22, fontWeight: '800' },

  // Date row
  dateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  dateChipText: { fontSize: font.sm, color: colors.t2, fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },

  // Queue item
  queueItem: {
    flexDirection: 'row',
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  queueItemMine: {
    borderColor: colors.blue,
    backgroundColor: '#12203F',
    shadowColor: colors.blue,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  queueItemActive: {
    borderColor: colors.orange,
    shadowColor: colors.orange,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  queueItemDone: { borderColor: colors.greenD },

  // Position panel
  posPanel: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 14,
  },
  posPanelMine: { borderRightColor: colors.blue, backgroundColor: 'rgba(59,142,240,0.07)' },
  posPanelActive: { borderRightColor: colors.orange },
  posPanelDone: { borderRightColor: colors.greenD },
  posNum: { fontSize: 20, fontWeight: '800' },
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
  queueTail: { fontSize: 16, fontWeight: '800', color: colors.text },
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
    shadowColor: colors.orange,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  inlineConfirmText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // List
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: 16, backgroundColor: colors.redD, borderRadius: radius.md, padding: 16 },
  errorText: { color: colors.red, fontSize: font.base, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.t3, fontSize: font.base },
})
