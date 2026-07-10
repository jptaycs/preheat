import type { ThemeColors } from '../../theme'

export type Tone = 'blue' | 'orange' | 'green' | 'red' | 'yellow' | 'neutral'

export function toneFg(colors: ThemeColors, tone: Tone): string {
  if (tone === 'neutral') return colors.t2
  return colors[tone]
}

export function toneBg(colors: ThemeColors, tone: Tone): string {
  if (tone === 'neutral') return colors.s2
  const key = `${tone}D` as keyof ThemeColors
  return colors[key]
}
