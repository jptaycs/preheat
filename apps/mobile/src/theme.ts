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
  bg: '#262624',
  s1: '#2D2C2A',
  s2: '#34332F',
  s3: '#3B3A36',
  border: '#45443F',
  blue: '#5B9DF0',
  blueD: '#1E3A5F',
  blueG: 'rgba(91,157,240,0.15)',
  orange: '#D9A441',
  orangeD: '#4A3A1A',
  green: '#7FAE72',
  greenD: '#253D22',
  red: '#C96A5C',
  redD: '#4A2521',
  yellow: '#E0C15A',
  yellowD: '#453A1C',
  text: '#F0EEE6',
  t2: '#ABA89F',
  t3: '#6E6C66',
}

export const lightColors: ThemeColors = {
  bg: '#F4F3EE',
  s1: '#FFFFFF',
  s2: '#EEECE3',
  s3: '#E5E2D9',
  border: '#DDD9CE',
  blue: '#2F6FE0',
  blueD: '#E4ECFB',
  blueG: 'rgba(47,111,224,0.10)',
  orange: '#B8792E',
  orangeD: '#F5EAD9',
  green: '#5C8A54',
  greenD: '#E3EDE0',
  red: '#B33B3B',
  redD: '#F5E1DE',
  yellow: '#B8923A',
  yellowD: '#F5EFD9',
  text: '#262624',
  t2: '#6B6A67',
  t3: '#9C9A94',
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
