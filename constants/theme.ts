export const colors = {
  // Dark theme base
  background: '#0a0a0a',
  surface: '#151515',
  surfaceElevated: '#1f1f1f',
  surfaceHover: '#252525',
  
  // Brand - VCE Academic Purple
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark: '#7c3aed',
  
  // Success & Progress
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // ATAR Score Colors
  atarHigh: '#10b981',  // 90+
  atarMid: '#3b82f6',   // 70-89
  atarLow: '#f59e0b',   // <70
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a3a3a3',
  textTertiary: '#737373',
  
  // Study Timer
  timerActive: '#8b5cf6',
  timerPaused: '#f59e0b',
  
  // UI Elements
  border: '#262626',
  borderLight: '#1a1a1a',
  divider: '#2a2a2a',
  
  // Premium Badge
  premium: '#fbbf24',
  premiumGlow: '#fcd34d',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  // Sizes
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  
  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
} as const;
