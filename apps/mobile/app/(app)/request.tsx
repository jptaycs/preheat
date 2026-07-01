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
  Modal,
  FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { aircraftApi, preheatRequestsApi, weatherApi, ApiError } from '../../src/lib/api'
import type { AircraftItem, WeatherSnapshot } from '../../src/lib/api'
import { ChevronDown, X, Check, CheckCircle, Thermometer } from 'lucide-react-native'
import { font, radius } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { DurationPicker } from '../../src/components/DurationPicker'

// ── Dropdown helpers ────────────────────────────────────────────────────────

function range(start: number, end: number, pad = 2): string[] {
  const out: string[] = []
  for (let i = start; i <= end; i++) out.push(String(i).padStart(pad, '0'))
  return out
}

const MONTHS = [
  '01 – Jan',
  '02 – Feb',
  '03 – Mar',
  '04 – Apr',
  '05 – May',
  '06 – Jun',
  '07 – Jul',
  '08 – Aug',
  '09 – Sep',
  '10 – Oct',
  '11 – Nov',
  '12 – Dec',
]

function daysInMonth(year: string, month: string): string[] {
  const y = parseInt(year) || new Date().getUTCFullYear()
  const m = parseInt(month) || 1
  const count = new Date(y, m, 0).getDate()
  return range(1, count)
}

const now = new Date()
const YEARS = range(now.getUTCFullYear(), now.getUTCFullYear() + 1, 4)
const HOURS = range(0, 23)
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

interface DropdownProps {
  label: string
  value: string
  placeholder: string
  options: string[]
  onSelect: (v: string) => void
}

function Dropdown({ label, value, placeholder, options, onSelect }: DropdownProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity style={styles.dropBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={value ? styles.dropValue : styles.dropPlaceholder}>
          {value || placeholder}
        </Text>
        <ChevronDown size={14} color={colors.t2} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={18} color={colors.t2} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === value && styles.modalItemSelected]}
                  onPress={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                >
                  <Text
                    style={[styles.modalItemText, item === value && styles.modalItemTextSelected]}
                  >
                    {item}
                  </Text>
                  {item === value && <Check size={16} color={colors.blue} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function RequestScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [aircraft, setAircraft] = useState<AircraftItem[]>([])
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null)

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')

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

  // Reset day if it exceeds days-in-month when year/month changes
  const availableDays = daysInMonth(year, month.slice(0, 2))
  const resetDayIfNeeded = useCallback(
    (d: string) => {
      if (d && !availableDays.includes(d)) setDay('')
    },
    [availableDays],
  )

  useEffect(() => {
    resetDayIfNeeded(day)
  }, [year, month, resetDayIfNeeded, day])

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
    if (!year || !month || !day) {
      setError('Please select a date')
      return
    }
    if (!hour || !minute) {
      setError('Please select a time')
      return
    }

    const monthNum = month.slice(0, 2)
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
        <TouchableOpacity style={styles.successBtn} onPress={() => router.replace('/(app)/queue')}>
          <Text style={styles.successBtnText}>View Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successBtnGhost} onPress={() => router.replace('/(app)')}>
          <Text style={styles.successBtnGhostText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Request Preheat</Text>
        <Text style={styles.pageSub}>Book a slot for engine preheat service</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Aircraft picker */}
        <View style={styles.section}>
          <Text style={styles.label}>SELECT AIRCRAFT</Text>
          {isLoadingAircraft ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
          ) : aircraft.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No aircraft registered.</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
                <Text style={styles.emptyLink}>Add aircraft in Profile →</Text>
              </TouchableOpacity>
            </View>
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

        {/* Date pickers */}
        <View style={styles.section}>
          <Text style={styles.label}>ENGINE START DATE (UTC)</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateColWide}>
              <Text style={styles.subLabel}>Month</Text>
              <Dropdown
                label="Month"
                value={month}
                placeholder="Month"
                options={MONTHS}
                onSelect={setMonth}
              />
            </View>
            <View style={styles.dateColNarrow}>
              <Text style={styles.subLabel}>Day</Text>
              <Dropdown
                label="Day"
                value={day}
                placeholder="Day"
                options={availableDays}
                onSelect={setDay}
              />
            </View>
            <View style={styles.dateColNarrow}>
              <Text style={styles.subLabel}>Year</Text>
              <Dropdown
                label="Year"
                value={year}
                placeholder="Year"
                options={YEARS}
                onSelect={setYear}
              />
            </View>
          </View>
        </View>

        {/* Time pickers */}
        <View style={styles.section}>
          <Text style={styles.label}>ENGINE START TIME (UTC)</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.subLabel}>Hour (00–23)</Text>
              <Dropdown
                label="Hour"
                value={hour}
                placeholder="HH"
                options={HOURS}
                onSelect={setHour}
              />
            </View>
            <Text style={styles.timeSep}>:</Text>
            <View style={styles.timeCol}>
              <Text style={styles.subLabel}>Minute</Text>
              <Dropdown
                label="Minute"
                value={minute}
                placeholder="MM"
                options={MINUTES}
                onSelect={setMinute}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Slot must be at least 35 min in the future. Booking opens at 19:00 UTC the day before.
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>NOTES (OPTIONAL)</Text>
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
            label="PREFERRED DURATION"
            value={preferredDuration}
            onChange={handleDurationChange}
          />
        </View>

        {/* Rules reminder */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Booking rules</Text>
          <Text style={styles.rulesItem}>• Slots spaced minimum 15 min apart</Text>
          <Text style={styles.rulesItem}>• Confirm your slot 40–30 min before engine start</Text>
          <Text style={styles.rulesItem}>• Unconfirmed slots are auto-released</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (isLoading || aircraft.length === 0) && styles.submitBtnDisabled,
          ]}
          onPress={() => {
            void handleSubmit()
          }}
          disabled={isLoading || aircraft.length === 0}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Submit preheat request"
          accessibilityState={{ disabled: isLoading || aircraft.length === 0, busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request</Text>
          )}
        </TouchableOpacity>

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

    pageTitle: {
      fontSize: font.xxl,
      fontWeight: '800',
      color: colors.text,
      marginTop: 20,
      marginBottom: 4,
    },
    pageSub: { fontSize: font.sm, color: colors.t2, marginBottom: 28 },

    errorBox: {
      backgroundColor: colors.redD,
      borderWidth: 1,
      borderColor: colors.red,
      borderRadius: radius.sm,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: colors.red, fontSize: font.sm },

    section: { marginBottom: 20 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.t2,
      letterSpacing: 0.8,
      marginBottom: 8,
    },

    weatherChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.s2,
      borderWidth: 1,
      borderColor: colors.orangeD,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
    },
    weatherChipText: { fontSize: font.sm, color: colors.text, fontWeight: '600' },
    subLabel: { fontSize: 10, color: colors.t3, marginBottom: 4, fontWeight: '600' },

    aircraftCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.s2,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 16,
      marginBottom: 8,
    },
    aircraftCardSelected: { borderColor: colors.blue, backgroundColor: colors.blueG },
    aircraftCardInner: { flex: 1 },
    aircraftTail: { fontSize: font.lg, fontWeight: '700', color: colors.text },
    aircraftType: { fontSize: font.sm, color: colors.t2, marginTop: 2 },
    selectedCheck: { fontSize: 20, color: colors.blue, fontWeight: '700' },

    emptyBox: {
      backgroundColor: colors.s2,
      borderRadius: radius.md,
      padding: 20,
      alignItems: 'center',
    },
    emptyText: { fontSize: font.base, color: colors.t2, marginBottom: 8 },
    emptyLink: { fontSize: font.base, color: colors.blue, fontWeight: '600' },

    // Date row
    dateRow: { flexDirection: 'row', gap: 8 },
    dateColWide: { flex: 2 },
    dateColNarrow: { flex: 1 },

    // Time row
    timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    timeCol: { flex: 1 },
    timeSep: {
      fontSize: font.xl,
      color: colors.t2,
      fontWeight: '700',
      paddingBottom: 10,
      paddingHorizontal: 2,
    },

    // Dropdown button
    dropBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.s2,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 13,
    },
    dropValue: { fontSize: font.md, color: colors.text, flex: 1 },
    dropPlaceholder: { fontSize: font.md, color: colors.t3, flex: 1 },
    dropArrow: { fontSize: 12, color: colors.t2, marginLeft: 4 },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.s1,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '60%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
    modalClose: { fontSize: 18, color: colors.t2, padding: 4 },
    modalList: { paddingVertical: 4 },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '44',
    },
    modalItemSelected: { backgroundColor: colors.blueD },
    modalItemText: { fontSize: font.base, color: colors.text },
    modalItemTextSelected: { color: colors.blue, fontWeight: '700' },
    modalCheck: { fontSize: 16, color: colors.blue },

    input: {
      backgroundColor: colors.s2,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: colors.text,
      fontSize: font.md,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    hint: { fontSize: font.sm, color: colors.t3, marginTop: 6 },

    rulesBox: {
      backgroundColor: colors.s1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 24,
    },
    rulesTitle: { fontSize: font.sm, fontWeight: '700', color: colors.t2, marginBottom: 8 },
    rulesItem: { fontSize: font.sm, color: colors.t3, marginBottom: 4 },

    submitBtn: {
      backgroundColor: colors.blue,
      borderRadius: radius.md,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: colors.blue,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 4,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },

    cancelLink: { alignItems: 'center', marginTop: 16 },
    cancelLinkText: { fontSize: font.base, color: colors.t3 },

    successRoot: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    successIcon: { fontSize: 56, marginBottom: 16 },
    successTitle: { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginBottom: 8 },
    successSub: { fontSize: font.xl, fontWeight: '700', color: colors.blue, marginBottom: 8 },
    successTime: { fontSize: font.base, color: colors.t2, marginBottom: 16 },
    successNote: {
      fontSize: font.sm,
      color: colors.t3,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 32,
    },
    successBtn: {
      backgroundColor: colors.blue,
      borderRadius: radius.md,
      paddingVertical: 16,
      paddingHorizontal: 40,
      marginBottom: 12,
      width: '100%',
      alignItems: 'center',
    },
    successBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
    successBtnGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 40,
      width: '100%',
      alignItems: 'center',
    },
    successBtnGhostText: { color: colors.t2, fontWeight: '600', fontSize: font.base },
  })
