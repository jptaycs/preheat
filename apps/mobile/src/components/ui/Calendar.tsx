import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { ThemeColors } from '../../theme'
import { useTheme } from '../../context/ThemeContext'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

interface CalendarProps {
  value: Date | null
  onChange: (date: Date) => void
  minDate?: Date
}

export function Calendar({ value, onChange, minDate }: CalendarProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const today = useMemo(() => startOfDay(new Date()), [])
  const floor = minDate ? startOfDay(minDate) : today

  const [viewYear, setViewYear] = useState(() => (value ?? floor).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (value ?? floor).getMonth())

  const canGoPrev =
    viewYear > floor.getFullYear() ||
    (viewYear === floor.getFullYear() && viewMonth > floor.getMonth())

  function goPrev() {
    if (!canGoPrev) return
    const d = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function goNext() {
    const d = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...(Array(firstWeekday).fill(null) as null[]),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} disabled={!canGoPrev} style={styles.navBtn} hitSlop={8}>
          <ChevronLeft size={18} color={canGoPrev ? colors.text : colors.t3} />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn} hitSlop={8}>
          <ChevronRight size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayText}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />
          const cellDate = new Date(viewYear, viewMonth, day)
          const disabled = cellDate < floor
          const selected = value ? sameDay(cellDate, value) : false
          const isToday = sameDay(cellDate, today)
          return (
            <View key={i} style={styles.cell}>
              <TouchableOpacity
                disabled={disabled}
                onPress={() => onChange(cellDate)}
                activeOpacity={0.7}
                style={[styles.dayBtn, selected && { backgroundColor: colors.blue }]}
                accessibilityRole="button"
                accessibilityLabel={cellDate.toDateString()}
                accessibilityState={{ disabled, selected }}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && { color: colors.t3 },
                    !selected && isToday && { color: colors.blue, fontWeight: '700' },
                    selected && { color: '#fff', fontWeight: '700' },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    navBtn: { padding: 6 },
    headerText: { fontSize: 15, fontWeight: '700', color: colors.text },
    weekdayRow: { flexDirection: 'row', marginBottom: 2 },
    weekdayText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: colors.t3,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: { fontSize: 14, fontWeight: '600', color: colors.text },
  })
