import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { font } from '../theme'
import type { ThemeColors } from '../theme'
import { useTheme } from '../context/ThemeContext'
import { Chip, SectionHeader } from './ui'

const PRESETS = [10, 15, 20, 25, 30]

interface DurationPickerProps {
  value: number
  onChange: (minutes: number) => void
  label?: string
}

export function DurationPicker({ value, onChange, label }: DurationPickerProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
      {label && <SectionHeader title={label} style={styles.label} />}
      <View style={styles.row}>
        {PRESETS.map((m) => (
          <Chip
            key={m}
            label={`${m}m`}
            active={value === m}
            onPress={() => {
              setCustomMode(false)
              onChange(m)
            }}
          />
        ))}
        <Chip
          label={!isPreset && !customMode ? `${value}m` : 'Custom'}
          active={(!isPreset && !customMode) || customMode}
          onPress={() => setCustomMode(true)}
        />
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
