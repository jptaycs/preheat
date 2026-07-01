import { useEffect, useMemo, useRef } from 'react'
import { Text, StyleSheet, Animated } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme'

interface Props {
  visible: boolean
}

export function OfflineBanner({ visible }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const translateY = useRef(new Animated.Value(-60)).current

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -60,
      useNativeDriver: true,
      bounciness: 0,
    }).start()
  }, [visible, translateY])

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Check your connection."
      pointerEvents="none"
    >
      <WifiOff size={14} color="#fff" />
      <Text style={styles.text}>No connection — data may be outdated</Text>
    </Animated.View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.red,
    },
    text: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
  })
