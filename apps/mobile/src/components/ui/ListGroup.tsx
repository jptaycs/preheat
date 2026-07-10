import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { ViewStyle, StyleProp } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { Card } from './Card'

interface ListGroupProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function ListGroup({ children, style }: ListGroupProps) {
  const { colors } = useTheme()
  const items = React.Children.toArray(children).filter(Boolean)

  return (
    <Card padded={false} style={style}>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && (
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          )}
        </View>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
})
