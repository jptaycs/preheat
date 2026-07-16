import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { font } from '../theme'
import type { ThemeColors } from '../theme'
import { useTheme } from '../context/ThemeContext'
import { Chip, SectionHeader } from './ui'

const PRESETS = [-10, -5, 5, 10, 15]
const MAX_DELTA = 30

function fmtDelta(minutes: number): string {
  return `${minutes > 0 ? '+' : '−'}${Math.abs(minutes)}m`
}

interface DeltaPickerProps {
  value: number | null
  onChange: (deltaMinutes: number) => void
  label?: string
}

export function DeltaPicker({ value, onChange, label }: DeltaPickerProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const [customSign, setCustomSign] = useState<1 | -1>(1)

  const isPreset = value !== null && PRESETS.includes(value)

  function handleCustomSubmit() {
    const n = parseInt(customText, 10)
    if (!isNaN(n) && n >= 1 && n <= MAX_DELTA) {
      onChange(customSign * n)
      setCustomMode(false)
    }
  }

  return (
    <View style={styles.container}>
      {label && <SectionHeader title={label} style={styles.label} />}
      <View style={styles.row}>
        {PRESETS.map((m) => (
          <Chip
            key={m}
            label={fmtDelta(m)}
            active={value === m}
            onPress={() => {
              setCustomMode(false)
              onChange(m)
            }}
          />
        ))}
        <Chip
          label={value !== null && !isPreset && !customMode ? fmtDelta(value) : 'Custom'}
          active={(value !== null && !isPreset && !customMode) || customMode}
          onPress={() => setCustomMode(true)}
        />
      </View>
      {customMode && (
        <View style={styles.customRow}>
          <View style={styles.signToggle}>
            <TouchableOpacity
              style={[styles.signBtn, customSign === 1 && styles.signBtnActive]}
              onPress={() => setCustomSign(1)}
              accessibilityRole="button"
              accessibilityLabel="Add minutes"
              accessibilityState={{ selected: customSign === 1 }}
            >
              <Text style={[styles.signText, customSign === 1 && styles.signTextActive]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.signBtn, customSign === -1 && styles.signBtnActive]}
              onPress={() => setCustomSign(-1)}
              accessibilityRole="button"
              accessibilityLabel="Remove minutes"
              accessibilityState={{ selected: customSign === -1 }}
            >
              <Text style={[styles.signText, customSign === -1 && styles.signTextActive]}>−</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={setCustomText}
            placeholder={`1-${MAX_DELTA}`}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { marginBottom: 14 },
    label: { marginLeft: 0 },
    row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    customRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    signToggle: {
      flexDirection: 'row',
      backgroundColor: colors.s2,
      borderRadius: 12,
      padding: 2,
    },
    signBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    signBtnActive: { backgroundColor: colors.blue },
    signText: { fontSize: font.md, fontWeight: '700', color: colors.t2 },
    signTextActive: { color: '#fff' },
    customInput: {
      flex: 1,
      backgroundColor: colors.s2,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: font.md,
      color: colors.text,
      fontWeight: '700',
    },
    customUnit: { fontSize: font.base, color: colors.t2, fontWeight: '600' },
    customBtn: {
      backgroundColor: colors.blue,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    customBtnText: { color: '#fff', fontWeight: '700', fontSize: font.sm },
  })
