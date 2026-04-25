import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Audio, type AVPlaybackSource } from 'expo-av'
import { Clock, Pencil } from 'lucide-react-native'
import { colors, font, radius } from '../theme'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const alarmSound = require('../../assets/alarm.mp3') as AVPlaybackSource

interface CountdownTimerProps {
  startedAt: string
  durationMinutes: number
  editable?: boolean
  onEdit?: () => void
  onExpired?: () => void
}

export function CountdownTimer({
  startedAt,
  durationMinutes,
  editable = false,
  onEdit,
  onExpired,
}: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState(0)
  const [expired, setExpired] = useState(false)
  const expiredRef = useRef(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const soundRef = useRef<Audio.Sound | null>(null)

  const calcRemaining = useCallback(() => {
    const start = new Date(startedAt).getTime()
    const end = start + durationMinutes * 60_000
    return Math.max(0, end - Date.now())
  }, [startedAt, durationMinutes])

  useEffect(() => {
    const remaining = calcRemaining()
    if (remaining > 0) {
      expiredRef.current = false
      setExpired(false)
    }
    setRemainingMs(remaining)

    const interval = setInterval(() => {
      const ms = calcRemaining()
      setRemainingMs(ms)
      if (ms <= 0 && !expiredRef.current) {
        expiredRef.current = true
        setExpired(true)
        onExpired?.()
        void playAlarm()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [calcRemaining, onExpired])

  useEffect(() => {
    if (!expired) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [expired, pulseAnim])

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync()
      }
    }
  }, [])

  async function playAlarm() {
    try {
      const { sound } = await Audio.Sound.createAsync(alarmSound, {
        shouldPlay: true,
      })
      soundRef.current = sound
    } catch (e) {
      console.warn('Could not play alarm sound:', e)
    }
  }

  const totalSec = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const timerColor = expired
    ? colors.red
    : totalSec <= 120
      ? colors.red
      : totalSec <= 300
        ? colors.orange
        : colors.blue

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: expired ? pulseAnim : 1 }] }]}>
      <View style={[styles.ring, { borderColor: timerColor + '44' }]}>
        <View style={[styles.inner, { borderColor: timerColor + '66' }]}>
          <Clock size={16} color={timerColor} />
          <Text style={[styles.time, { color: timerColor }]}>
            {expired ? "TIME'S UP" : display}
          </Text>
          <Text style={styles.label}>
            {expired ? 'Timer expired' : `${durationMinutes} min session`}
          </Text>
        </View>
      </View>
      {editable && (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Pencil size={14} color={colors.blue} />
          <Text style={styles.editText}>Edit Timer</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 14 },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
    gap: 4,
  },
  time: { fontSize: 28, fontWeight: '900' },
  label: { fontSize: 11, color: colors.t2, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.s2,
  },
  editText: { fontSize: font.sm, color: colors.blue, fontWeight: '600' },
})
