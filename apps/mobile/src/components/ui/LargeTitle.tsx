import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { ThemeColors } from '../../theme'
import { useTheme } from '../../context/ThemeContext'

interface LargeTitleProps {
  title: string
  subtitle?: string
  trailing?: React.ReactNode
}

export function LargeTitle({ title, subtitle, trailing }: LargeTitleProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    textWrap: { flex: 1 },
    title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: 0.2 },
    subtitle: { fontSize: 15, color: colors.t2, marginTop: 4 },
  })
