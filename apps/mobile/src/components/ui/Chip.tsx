import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { radius } from '../../theme'
import { useTheme } from '../../context/ThemeContext'

interface ChipProps {
  label: string
  active?: boolean
  onPress?: () => void
}

export function Chip({ label, active, onPress }: ChipProps) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: active ? colors.blueD : colors.s2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: active ? colors.blue : colors.t2 }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  text: { fontSize: 13.5, fontWeight: '600' },
})
