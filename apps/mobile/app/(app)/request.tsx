import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { aircraftApi, preheatRequestsApi, weatherApi, ApiError } from '../../src/lib/api'
import type { AircraftItem, WeatherSnapshot } from '../../src/lib/api'
import {
  Check,
  CheckCircle,
  Thermometer,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { DurationPicker } from '../../src/components/DurationPicker'
import {
  Card,
  Button,
  LargeTitle,
  SectionHeader,
  Calendar,
  WheelPicker,
} from '../../src/components/ui'

// ── Time options ────────────────────────────────────────────────────────────

function range(start: number, end: number, pad = 2): string[] {
  const out: string[] = []
  for (let i = start; i <= end; i++) out.push(String(i).padStart(pad, '0'))
  return out
}

const HOURS = range(0, 23)
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function RequestScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [aircraft, setAircraft] = useState<AircraftItem[]>([])
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dateOpen, setDateOpen] = useState(false)
  const [hour, setHour] = useState('00')
  const [minute, setMinute] = useState('00')

  const [notes, setNotes] = useState('')
  const [preferredDuration, setPreferredDuration] = useState(20)
  const [userTouchedDuration, setUserTouchedDuration] = useState(false)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAircraft, setIsLoadingAircraft] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ queuePosition: number; assignedTime: string } | null>(
    null,
  )

  useEffect(() => {
    void (async () => {
      try {
        const list = await aircraftApi.list()
        setAircraft(list)
      } catch {
        setError('Failed to load your aircraft')
      } finally {
        setIsLoadingAircraft(false)
      }
    })()

    void (async () => {
      try {
        const w = await weatherApi.get()
        setWeather(w)
      } catch {
        // Soft-fail: weather is decorative. Pilot can pick duration manually.
      }
    })()
  }, [])

  // Auto-fill duration from METAR once weather arrives, unless the pilot already changed it.
  useEffect(() => {
    if (weather && !userTouchedDuration) {
      setPreferredDuration(weather.suggestedDurationMin)
    }
  }, [weather, userTouchedDuration])

  const handleDurationChange = useCallback((mins: number) => {
    setUserTouchedDuration(true)
    setPreferredDuration(mins)
  }, [])

  async function handleSubmit() {
    setError(null)

    if (!selectedAircraftId) {
      setError('Please select an aircraft')
      return
    }
    if (!selectedDate) {
      setError('Please select a date')
      return
    }

    const year = selectedDate.getFullYear()
    const monthNum = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const engineStartISO = `${year}-${monthNum}-${day}T${hour}:${minute}:00.000Z`

    setIsLoading(true)
    try {
      const result = await preheatRequestsApi.create({
        aircraftId: selectedAircraftId,
        engineStartTime: engineStartISO,
        notes: notes.trim() || undefined,
        preferredDurationMinutes: preferredDuration,
      })
      setSuccess({ queuePosition: result.queuePosition, assignedTime: result.assignedTime })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit request')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <View style={styles.successRoot}>
        <CheckCircle size={56} color={colors.green} />
        <Text style={styles.successTitle}>Preheat Requested!</Text>
        <Text style={styles.successSub}>You're #{success.queuePosition} in the queue</Text>
        <Text style={styles.successTime}>
          Assigned preheat time:{' '}
          {new Date(success.assignedTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          UTC
        </Text>
        <Text style={styles.successNote}>
          You'll receive a push notification when the confirmation window opens (40–30 min before
          engine start). Confirm in the app to secure your slot.
        </Text>
        <Button
          title="View Queue"
          onPress={() => router.replace('/(app)/queue')}
          style={styles.successBtn}
        />
        <Button
          title="Back to Home"
          variant="secondary"
          onPress={() => router.replace('/(app)')}
          style={styles.successBtnGhost}
        />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LargeTitle title="Request Preheat" subtitle="Book a slot for engine preheat service" />

        {error ? (
          <Card style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* Aircraft picker */}
        <View style={styles.section}>
          <SectionHeader title="Select aircraft" />
          {isLoadingAircraft ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
          ) : aircraft.length === 0 ? (
            <Card style={styles.emptyBox}>
              <Text style={styles.emptyText}>No aircraft registered.</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
                <Text style={styles.emptyLink}>Add aircraft in Profile →</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            aircraft.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.aircraftCard,
                  selectedAircraftId === a.id && styles.aircraftCardSelected,
                ]}
                onPress={() => setSelectedAircraftId(a.id)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={`${a.tailNumber}, ${a.type}`}
                accessibilityState={{ selected: selectedAircraftId === a.id }}
              >
                <View style={styles.aircraftCardInner}>
                  <Text style={styles.aircraftTail}>{a.tailNumber}</Text>
                  <Text style={styles.aircraftType}>{a.type}</Text>
                </View>
                {selectedAircraftId === a.id && <Check size={20} color={colors.blue} />}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Date picker */}
        <View style={styles.section}>
          <SectionHeader title="Engine start date (UTC)" />
          <Card padded={false}>
            <TouchableOpacity
              style={styles.dateFieldRow}
              onPress={() => setDateOpen((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select date"
              accessibilityState={{ expanded: dateOpen }}
            >
              <CalendarDays size={18} color={colors.t2} />
              <Text style={selectedDate ? styles.dateFieldValue : styles.dateFieldPlaceholder}>
                {selectedDate ? fmtDateLong(selectedDate) : 'Select date'}
              </Text>
              {dateOpen ? (
                <ChevronUp size={18} color={colors.t2} />
              ) : (
                <ChevronDown size={18} color={colors.t2} />
              )}
            </TouchableOpacity>
            {dateOpen && (
              <>
                <View style={styles.divider} />
                <View style={styles.calendarWrap}>
                  <Calendar
                    value={selectedDate}
                    onChange={(d) => {
                      setSelectedDate(d)
                      setDateOpen(false)
                    }}
                  />
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Time picker */}
        <View style={styles.section}>
          <SectionHeader title="Engine start time (UTC)" />
          <Card>
            <View style={styles.wheelRow}>
              <View style={styles.wheelCol}>
                <Text style={styles.timeGroupLabel}>Hour</Text>
                <WheelPicker options={HOURS} value={hour} onChange={setHour} />
              </View>
              <Text style={styles.wheelSep}>:</Text>
              <View style={styles.wheelCol}>
                <Text style={styles.timeGroupLabel}>Minute</Text>
                <WheelPicker options={MINUTES} value={minute} onChange={setMinute} />
              </View>
            </View>
          </Card>
          <Text style={styles.hint}>
            Slot must be at least 35 min in the future. Booking opens at 19:00 UTC the day before.
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <SectionHeader title="Notes (optional)" />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special instructions for the mechanic..."
            placeholderTextColor={colors.t3}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Preferred duration */}
        <View style={styles.section}>
          {weather && weather.tempC !== null && (
            <View style={styles.weatherChip}>
              <Thermometer size={14} color={colors.orange} />
              <Text style={styles.weatherChipText}>
                {weather.icao} OAT {weather.tempC.toFixed(0)}°C
                {!userTouchedDuration && ` → suggesting ${weather.suggestedDurationMin} min`}
              </Text>
            </View>
          )}
          <DurationPicker
            label="Preferred duration"
            value={preferredDuration}
            onChange={handleDurationChange}
          />
        </View>

        {/* Rules reminder */}
        <Card style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Booking rules</Text>
          <Text style={styles.rulesItem}>• Slots spaced minimum 15 min apart</Text>
          <Text style={styles.rulesItem}>• Confirm your slot 40–30 min before engine start</Text>
          <Text style={styles.rulesItem}>• Unconfirmed slots are auto-released</Text>
        </Card>

        {/* Submit */}
        <Button
          title="Submit Request"
          loading={isLoading}
          disabled={aircraft.length === 0}
          onPress={() => {
            void handleSubmit()
          }}
        />

        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel and go back"
        >
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 24, paddingBottom: 48 },

    errorBox: {
      backgroundColor: colors.redD,
      marginBottom: 16,
      shadowOpacity: 0,
      elevation: 0,
    },
    errorText: { color: colors.red, fontSize: font.sm },

    section: { marginBottom: 20 },

    weatherChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.orangeD,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
    },
    weatherChipText: { fontSize: font.sm, color: colors.text, fontWeight: '600' },

    aircraftCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.s1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    aircraftCardSelected: { backgroundColor: colors.blueG },
    aircraftCardInner: { flex: 1 },
    aircraftTail: { fontSize: font.lg, fontWeight: '700', color: colors.text },
    aircraftType: { fontSize: font.sm, color: colors.t2, marginTop: 2 },

    emptyBox: { alignItems: 'center', shadowOpacity: 0, elevation: 0 },
    emptyText: { fontSize: font.base, color: colors.t2, marginBottom: 8 },
    emptyLink: { fontSize: font.base, color: colors.blue, fontWeight: '600' },

    // Date field
    dateFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 16,
    },
    dateFieldValue: { flex: 1, fontSize: font.md, color: colors.text, fontWeight: '600' },
    dateFieldPlaceholder: { flex: 1, fontSize: font.md, color: colors.t3 },
    calendarWrap: { padding: 16, paddingTop: 14 },

    // Time picker
    wheelRow: { flexDirection: 'row', alignItems: 'center' },
    wheelCol: { flex: 1 },
    wheelSep: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.t3,
      marginTop: 22,
      paddingHorizontal: 4,
    },
    timeGroupLabel: {
      fontSize: 10,
      color: colors.t3,
      marginBottom: 8,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 14,
    },

    input: {
      backgroundColor: colors.s2,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: colors.text,
      fontSize: font.md,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    hint: { fontSize: font.sm, color: colors.t3, marginTop: 6 },

    rulesBox: { marginBottom: 24, shadowOpacity: 0, elevation: 0 },
    rulesTitle: { fontSize: font.sm, fontWeight: '700', color: colors.t2, marginBottom: 8 },
    rulesItem: { fontSize: font.sm, color: colors.t3, marginBottom: 4 },

    cancelLink: { alignItems: 'center', marginTop: 16 },
    cancelLinkText: { fontSize: font.base, color: colors.t3 },

    successRoot: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    successTitle: {
      fontSize: font.xxl,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    successSub: { fontSize: font.xl, fontWeight: '700', color: colors.blue, marginBottom: 8 },
    successTime: { fontSize: font.base, color: colors.t2, marginBottom: 16 },
    successNote: {
      fontSize: font.sm,
      color: colors.t3,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 32,
    },
    successBtn: { width: '100%', marginBottom: 12 },
    successBtnGhost: { width: '100%' },
  })
