import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { ViewStyle, StyleProp } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { IconGlyph } from './IconGlyph'
import type { Tone } from './tone'

interface ListRowProps {
  icon?: LucideIcon
  tone?: Tone
  title: string
  subtitle?: string
  value?: string
  trailing?: React.ReactNode
  showChevron?: boolean
  onPress?: () => void
  destructive?: boolean
  style?: StyleProp<ViewStyle>
}

export function ListRow({
  icon,
  tone = 'blue',
  title,
  subtitle,
  value,
  trailing,
  showChevron,
  onPress,
  destructive,
  style,
}: ListRowProps) {
  const { colors } = useTheme()
  const Wrapper = onPress ? TouchableOpacity : View

  return (
    <Wrapper
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : undefined}
    >
      {icon && <IconGlyph icon={icon} tone={destructive ? 'red' : tone} />}
      <View style={styles.body}>
        <Text style={[styles.title, { color: destructive ? colors.red : colors.text }]}>
          {title}
        </Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.t2 }]}>{subtitle}</Text>}
      </View>
      {value && <Text style={[styles.value, { color: colors.t2 }]}>{value}</Text>}
      {trailing}
      {showChevron && <ChevronRight size={18} color={colors.t3} />}
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12.5, marginTop: 2 },
  value: { fontSize: 14.5 },
})
