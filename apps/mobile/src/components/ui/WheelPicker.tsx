import React, { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import type { ThemeColors } from '../../theme'
import { useTheme } from '../../context/ThemeContext'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 5
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2)
const LOOPS = 5
const MIDDLE_SET = Math.floor(LOOPS / 2)

interface WheelPickerProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

function closestOption(options: string[], typed: number): string {
  let best = options[0]
  let bestDiff = Infinity
  for (const opt of options) {
    const diff = Math.abs(parseInt(opt, 10) - typed)
    if (diff < bestDiff) {
      bestDiff = diff
      best = opt
    }
  }
  return best
}

export function WheelPicker({ options, value, onChange }: WheelPickerProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const scrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const n = options.length

  const [editing, setEditing] = useState(false)
  const [inputText, setInputText] = useState('')

  const loopedOptions = useMemo(
    () => Array.from({ length: n * LOOPS }, (_, i) => options[i % n]),
    [options, n],
  )

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      scrollRef.current?.scrollTo({ y: (MIDDLE_SET * n + index) * ITEM_HEIGHT, animated })
    },
    [n],
  )

  const initialOffset = (MIDDLE_SET * n + Math.max(0, options.indexOf(value))) * ITEM_HEIGHT

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y
      const rawIndex = Math.round(y / ITEM_HEIGHT)
      const optionIndex = ((rawIndex % n) + n) % n
      const opt = options[optionIndex]
      if (opt !== value) onChange(opt)
      // Once we drift away from the middle copy, silently re-center so the
      // wheel can keep scrolling in the same direction indefinitely.
      const setIndex = Math.floor(rawIndex / n)
      if (setIndex !== MIDDLE_SET) {
        scrollRef.current?.scrollTo({
          y: (MIDDLE_SET * n + optionIndex) * ITEM_HEIGHT,
          animated: false,
        })
      }
    },
    [options, n, value, onChange],
  )

  function openEditor() {
    setInputText(value)
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitEdit() {
    setEditing(false)
    const typed = parseInt(inputText, 10)
    if (!isNaN(typed)) {
      const opt = closestOption(options, typed)
      onChange(opt)
      scrollToIndex(options.indexOf(opt), true)
    }
  }

  return (
    <View style={styles.wheel}>
      {/* Visual highlight only — sits behind the scroll content so item text still shows on top */}
      <View pointerEvents="none" style={styles.selectionBand} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEnabled={!editing}
        contentOffset={{ x: 0, y: initialOffset }}
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {loopedOptions.map((opt, i) => {
          const selected = opt === value
          return (
            <TouchableOpacity
              key={i}
              style={styles.item}
              activeOpacity={0.6}
              onPress={() => scrollToIndex(i % n, true)}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Transparent hit-area on top of the scroll content — tapping the centered
          value opens the keyboard instead of scrolling to itself. */}
      {!editing && (
        <TouchableOpacity style={styles.tapCapture} activeOpacity={1} onPress={openEditor} />
      )}

      {editing && (
        <TextInput
          ref={inputRef}
          style={styles.editInput}
          value={inputText}
          onChangeText={(t) => setInputText(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          onSubmitEditing={commitEdit}
          onBlur={commitEdit}
        />
      )}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wheel: {
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      overflow: 'hidden',
    },
    selectionBand: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: PADDING,
      height: ITEM_HEIGHT,
      borderRadius: 10,
      backgroundColor: colors.s2,
    },
    tapCapture: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: PADDING,
      height: ITEM_HEIGHT,
      backgroundColor: 'transparent',
    },
    editInput: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: PADDING,
      height: ITEM_HEIGHT,
      borderRadius: 10,
      backgroundColor: colors.s2,
      textAlign: 'center',
      fontSize: 19,
      fontWeight: '700',
      color: colors.text,
      padding: 0,
    },
    item: {
      height: ITEM_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemText: { fontSize: 16, fontWeight: '500', color: colors.t3 },
    itemTextSelected: { fontSize: 19, fontWeight: '700', color: colors.text },
  })
