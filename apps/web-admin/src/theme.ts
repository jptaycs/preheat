export const theme = {
  colors: {
    bg: '#0C0E14',
    s1: '#141720',
    s2: '#1C2030',
    border: '#2A2F45',
    blue: '#3B8EF0',
    orange: '#F5891E',
    green: '#2ED47A',
    red: '#F05252',
    yellow: '#F5C842',
    text: '#EEF0F6',
    t2: '#8B93A8',
    t3: '#4A5168',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  fontSizes: {
    xs: '11px',
    sm: '13px',
    md: '15px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
  },
} as const

export type Theme = typeof theme
