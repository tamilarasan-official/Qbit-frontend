/**
 * qbitio Color Theme Configuration
 *
 * Mirrors the `brand` scale in `tailwind.config.ts` for consumers that need raw
 * hex values (charts, canvas, inline SVG, email) rather than utility classes.
 *
 * Theme Philosophy:
 * - Black, white and one signature lime — nothing else carries the brand
 * - Lime is a surface colour, not a text colour: pair 400 with black type,
 *   and reach for 700+ when lime-flavoured text sits on a light background
 * - Accessible and readable in light, dark and reading modes
 */

export const theme = {
  // Primary brand colors - qbitio signature lime (400 is the logo colour)
  primary: {
    50: '#FAFFE5',
    100: '#F2FFBD',
    200: '#E9FF85',
    300: '#DFFF47',
    400: '#D5FF00',  // Signature lime — the logo colour
    500: '#BEE600',  // Main primary color
    600: '#99BA00',
    700: '#6B8200',
    800: '#4C5C00',
    900: '#363F00',
  },

  // Secondary colors - the ink black the lime is always paired with
  secondary: {
    50: '#F7F7F6',
    100: '#EDEDEC',
    200: '#D8D8D6',
    300: '#B4B4B1',
    400: '#8A8A87',
    500: '#5F5F5C',  // Main secondary color
    600: '#414140',
    700: '#2B2B2A',
    800: '#171717',
    900: '#0A0A0A',
  },

  // Success - Green for positive actions
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning - Amber for caution
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Main warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error - Red for errors and alerts
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Main error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral - Gray scale for UI elements
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors for specific use cases
  background: {
    light: '#ffffff',
    subtle: '#FBFBF9',
    muted: '#F4F4F1',
    dark: '#0A0A0A',
  },

  text: {
    primary: '#101010',
    secondary: '#6B6B67',
    tertiary: '#9A9A95',
    inverse: '#FAFAFA',
  },

  border: {
    light: '#E7E7E3',
    default: '#D4D4CF',
    dark: '#9A9A95',
  },

  // Quiz-specific colors
  quiz: {
    correct: '#22c55e',
    incorrect: '#ef4444',
    pending: '#f59e0b',
    timeout: '#94a3b8',
  },

  // Leaderboard colors
  leaderboard: {
    gold: '#fbbf24',
    silver: '#cbd5e1',
    bronze: '#f59e0b',
  },
} as const

/**
 * Gradient presets for backgrounds and accents
 */
export const gradients = {
  // Signature lime wash — always pair with black type
  primary: 'bg-gradient-to-r from-brand-400 to-brand-500',
  success: 'bg-gradient-to-r from-success-600 to-success-700',
  warning: 'bg-gradient-to-r from-warning-500 to-warning-600',
  error: 'bg-gradient-to-r from-error-500 to-error-600',

  // Subtle backgrounds
  subtlePrimary: 'bg-gradient-to-br from-brand-50 to-brand-100',
  subtleSuccess: 'bg-gradient-to-br from-success-50 to-success-100',

  // Dashboard gradient — neutral paper lifted by a lime edge
  dashboard: 'bg-gradient-to-br from-white via-neutral-50 to-brand-50',
  dashboardDark: 'dark:from-neutral-950 dark:via-neutral-900 dark:to-brand-950',
} as const

/**
 * Spacing scale for consistent layouts
 */
export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const

/**
 * Border radius scale for consistent rounded corners
 */
export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',  // Fully rounded
} as const

/**
 * Typography scale
 */
export const typography = {
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const
