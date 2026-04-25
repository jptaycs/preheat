import React, { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { colors, font, radius } from '../theme'

const PRESETS = [10, 15, 20, 25, 30]

interface DurationPickerProps {
  value: number
  onChange: (minutes: number) => void
  label?: string
}

export function DurationPicker({ value, onChange, label }: DurationPickerProps) {
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')

  const isPreset = PRESETS.includes(value)

  function handleCustomSubmit() {
    const n = parseInt(customText, 10)
    if (!isNaN(n) && n >= 5 && n <= 60) {
      onChange(n)
      setCustomMode(false)
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {PRESETS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.preset, value === m && styles.presetActive]}
            onPress={() => {
              setCustomMode(false)
              onChange(m)
            }}
          >
            <Text style={[styles.presetText, value === m && styles.presetTextActive]}>{m}m</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.preset,
            !isPreset && !customMode && styles.presetActive,
            customMode && styles.presetActive,
          ]}
          onPress={() => setCustomMode(true)}
        >
          <Text style={[styles.presetText, (!isPreset || customMode) && styles.presetTextActive]}>
            {!isPreset && !customMode ? `${value}m` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </View>
      {customMode && (
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={setCustomText}
            placeholder="5-60"
            placeholderTextColor={colors.t3}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleCustomSubmit}
          />
          <Text style={styles.customUnit}>min</Text>
          <TouchableOpacity style={styles.customBtn} onPress={handleCustomSubmit}>
            <Text style={styles.customBtnText}>Set</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.t2,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.s2,
  },
  presetActive: {
    borderColor: colors.blue,
    backgroundColor: colors.blueD,
  },
  presetText: { fontSize: font.sm, fontWeight: '700', color: colors.t2 },
  presetTextActive: { color: colors.blue },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: font.md,
    color: colors.text,
    fontWeight: '700',
  },
  customUnit: { fontSize: font.base, color: colors.t2, fontWeight: '600' },
  customBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
})
