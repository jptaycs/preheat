export interface ThemeColors {
  bg: string
  s1: string
  s2: string
  s3: string
  border: string
  blue: string
  blueD: string
  blueG: string
  orange: string
  orangeD: string
  green: string
  greenD: string
  red: string
  redD: string
  yellow: string
  yellowD: string
  text: string
  t2: string
  t3: string
}

export const darkColors: ThemeColors = {
  bg: '#0C0E14',
  s1: '#141720',
  s2: '#1C2030',
  s3: '#242840',
  border: '#2A2F45',
  blue: '#3B8EF0',
  blueD: '#1E4A8A',
  blueG: 'rgba(59,142,240,0.15)',
  orange: '#F5891E',
  orangeD: '#7A4410',
  green: '#2ED47A',
  greenD: '#154D33',
  red: '#F05252',
  redD: '#6B1E1E',
  yellow: '#F5C842',
  yellowD: '#3A3420',
  text: '#EEF0F6',
  t2: '#8B93A8',
  t3: '#555E78',
}

export const lightColors: ThemeColors = {
  bg: '#F4F5F9',
  s1: '#FFFFFF',
  s2: '#EEF0F5',
  s3: '#E4E7EF',
  border: '#DEE1EA',
  blue: '#2F6FE0',
  blueD: '#DCEAFD',
  blueG: 'rgba(47,111,224,0.10)',
  orange: '#D97F1A',
  orangeD: '#FBEAD4',
  green: '#1E9E5A',
  greenD: '#DFF5E8',
  red: '#D93B3B',
  redD: '#FBE0E0',
  yellow: '#B8860B',
  yellowD: '#FBF1D6',
  text: '#12141C',
  t2: '#5B6479',
  t3: '#9AA1B4',
}

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const

export const font = {
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const
