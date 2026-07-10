import React from 'react'
import { Text, StyleSheet } from 'react-native'
import type { TextStyle, StyleProp } from 'react-native'
import { useTheme } from '../../context/ThemeContext'

interface SectionHeaderProps {
  title: string
  style?: StyleProp<TextStyle>
}

export function SectionHeader({ title, style }: SectionHeaderProps) {
  const { colors } = useTheme()
  return <Text style={[styles.text, { color: colors.t3 }, style]}>{title.toUpperCase()}</Text>
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
})
