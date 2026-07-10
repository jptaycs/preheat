import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { toneFg, toneBg } from './tone'
import type { Tone } from './tone'

interface IconGlyphProps {
  icon: LucideIcon
  tone?: Tone
  size?: number
}

export function IconGlyph({ icon: Icon, tone = 'blue', size = 30 }: IconGlyphProps) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: toneBg(colors, tone),
        },
      ]}
    >
      <Icon size={size * 0.55} color={toneFg(colors, tone)} strokeWidth={2} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
})
