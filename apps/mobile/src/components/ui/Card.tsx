import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle, StyleProp } from 'react-native'
import { radius } from '../../theme'
import { useTheme } from '../../context/ThemeContext'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  padded?: boolean
}

export function Card({ children, style, padded = true }: CardProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.base, { backgroundColor: colors.s1 }, padded && styles.padded, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  padded: { padding: 16 },
})
