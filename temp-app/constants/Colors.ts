/**
 * DukaanSaathi Color Palette
 * Paytm-inspired high-trust Indian fintech aesthetics.
 */

export const Palette = {
  primaryBlue: '#00B9F1',
  primaryBlueDark: '#0097C7',
  primaryBlueLight: '#E6F8FE',
  darkNavy: '#102A43',
  navyLight: '#243B53',
  background: '#F5F8FC',
  card: '#FFFFFF',
  textPrimary: '#172B4D',
  textSecondary: '#66758A',
  textMuted: '#9FB3C8',
  border: '#E2E8F0',
  borderLight: '#EDF2F7',
  successGreen: '#00B074',
  successGreenLight: '#E6F7F0',
  dangerRed: '#E53E3E',
  dangerRedLight: '#FDE8E8',
  warningAmber: '#D97706',
  warningAmberLight: '#FEF3C7',
  badgeBg: '#EBF8FF',
  white: '#FFFFFF',
  black: '#000000',
};

export default {
  light: {
    text: Palette.textPrimary,
    background: Palette.background,
    tint: Palette.primaryBlue,
    tabIconDefault: Palette.textSecondary,
    tabIconSelected: Palette.primaryBlue,
    card: Palette.card,
    border: Palette.border,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B1521',
    tint: Palette.primaryBlue,
    tabIconDefault: '#829AB1',
    tabIconSelected: Palette.primaryBlue,
    card: '#102A43',
    border: '#243B53',
  },
};
