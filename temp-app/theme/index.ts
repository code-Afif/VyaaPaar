/**
 * Bharat Merchant Core - Design Tokens
 * Replicated exactly from Google Stitch ("VyaaPaar Kirana Khata App")
 */

export const Theme = {
  colors: {
    // Primary Monolithic Navy
    primary: '#00163A',
    primaryContainer: '#0B2A5B',
    onPrimary: '#FFFFFF',

    // Canvas & Surfaces
    surface: '#FAF8F3', // Warm Bahi-Khata ledger canvas
    surfaceCard: '#FFFFFF',
    surfaceContainerLow: '#F6F3F2',
    surfaceContainer: '#F0EDED',
    surfaceContainerHigh: '#EAE7E7',
    surfaceVariant: '#E5E2DC',
    hairline: '#E5E2DC', // 1px architectural divider

    // Typography & Ink
    onSurface: '#1A1A1A',
    onSurfaceVariant: '#666666',
    outline: '#747780',

    // Financial Semantics (Indian Ledger Psychology)
    moneyRed: '#C62828', // Udhaar Diya / Owed
    moneyRedBg: '#FFF8F7',
    moneyRedBorder: '#FFDAD6',
    moneyGreen: '#1E8E3E', // Jama Mila / Received
    moneyGreenBg: '#EAF7EE',
    moneyGreenBorder: '#C8E6C9',

    // Secondary Accent
    secondary: '#00A3E0',
    secondaryContainer: '#41BEFD',
    secondaryFixed: '#C6E7FF',
    onSecondaryFixed: '#001E2D',

    // Utility
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    overlay: 'rgba(0, 22, 58, 0.45)',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    gutter: 16,
  },

  radii: {
    none: 0,
    sm: 4,
    md: 8,
    full: 9999,
  },

  typography: {
    headlineHero: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    headlineLg: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    currencyStat: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700' as const,
    },
    titleMd: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
    bodyLg: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
    bodyMd: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    bodySm: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    labelMd: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
    },
  },

  layout: {
    minTouchTarget: 48,
    topBarHeight: 56,
    tabBarHeight: 60,
  },
} as const;

export default Theme;

