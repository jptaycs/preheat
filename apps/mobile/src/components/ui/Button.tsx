import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'
import type { ViewStyle, StyleProp } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { radius } from '../../theme'
import { useTheme } from '../../context/ThemeContext'
import { toneFg } from './tone'
import type { Tone } from './tone'

type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'destructive'

interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  tone?: Tone
  disabled?: boolean
  loading?: boolean
  icon?: LucideIcon
  style?: StyleProp<ViewStyle>
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  tone = 'blue',
  disabled,
  loading,
  icon: Icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme()
  const isCapsule = variant === 'primary' || variant === 'secondary'
  const primaryFill = toneFg(colors, tone)

  const textColor =
    variant === 'primary'
      ? '#fff'
      : variant === 'secondary'
        ? colors.text
        : variant === 'destructive'
          ? colors.red
          : colors.blue

  return (
    <TouchableOpacity
      style={[
        isCapsule ? styles.capsule : styles.plain,
        variant === 'primary' && { backgroundColor: primaryFill },
        variant === 'secondary' && { backgroundColor: colors.s2 },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon && <Icon size={17} color={textColor} />}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.full,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  text: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
})
