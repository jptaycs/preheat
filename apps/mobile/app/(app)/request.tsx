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
import { useState, useEffect } from 'react'
import { aircraftApi, preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { AircraftItem } from '../../src/lib/api'
import { colors, font, radius } from '../../src/theme'

export default function RequestScreen() {
  const router = useRouter()

  const [aircraft, setAircraft] = useState<AircraftItem[]>([])
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null)
  const [engineStartDate, setEngineStartDate] = useState('')
  const [engineStartTime, setEngineStartTime] = useState('')
  const [notes, setNotes] = useState('')
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
  }, [])

  async function handleSubmit() {
    setError(null)

    if (!selectedAircraftId) {
      setError('Please select an aircraft')
      return
    }
    if (!engineStartDate || !engineStartTime) {
      setError('Please enter engine start date and time (YYYY-MM-DD and HH:MM)')
      return
    }

    const engineStartISO = `${engineStartDate}T${engineStartTime}:00.000Z`
    if (isNaN(Date.parse(engineStartISO))) {
      setError('Invalid date/time. Use YYYY-MM-DD and HH:MM format.')
      return
    }

    setIsLoading(true)
    try {
      const result = await preheatRequestsApi.create({
        aircraftId: selectedAircraftId,
        engineStartTime: engineStartISO,
        notes: notes.trim() || undefined,
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
        <Text style={styles.successIcon}>✅</Text>
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

        {/* Error */}
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
              >
                <View style={styles.aircraftCardInner}>
                  <Text style={styles.aircraftTail}>{a.tailNumber}</Text>
                  <Text style={styles.aircraftType}>{a.type}</Text>
                </View>
                {selectedAircraftId === a.id && <Text style={styles.selectedCheck}>✓</Text>}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>ENGINE START DATE (UTC)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.t3}
            value={engineStartDate}
            onChangeText={setEngineStartDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>ENGINE START TIME (UTC)</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM  (e.g. 07:30)"
            placeholderTextColor={colors.t3}
            value={engineStartTime}
            onChangeText={setEngineStartTime}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
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
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
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
  label: { fontSize: 11, fontWeight: '700', color: colors.t2, letterSpacing: 0.8, marginBottom: 8 },

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
