import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import type { ThemeColors } from '../../theme'
import { useTheme } from '../../context/ThemeContext'
import { toneFg } from './tone'
import type { Tone } from './tone'

interface StatTileProps {
  icon?: LucideIcon
  label: string
  value: string
  tone?: Tone
}

export function StatTile({ icon: Icon, label, value, tone = 'neutral' }: StatTileProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.tile}>
      <View style={styles.labelRow}>
        {Icon && <Icon size={12} color={colors.t3} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: toneFg(colors, tone) }]}>{value}</Text>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: { minWidth: '40%', flexGrow: 1 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    value: { fontSize: 19, fontWeight: '700', color: colors.text },
  })
