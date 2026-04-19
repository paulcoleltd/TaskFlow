/**
 * Design tokens — must stay in sync with the web app's Tailwind palette.
 * Source of truth: C:\Users\Dell\Task Management Web App\CLAUDE.md
 */
export const Colors = {
  // Backgrounds
  bg:        '#0B1437',
  card:      '#111C44',
  cardHover: '#1B254B',
  input:     '#0C1526',

  // Borders
  border:    '#1F3461',
  borderSub: '#1C3054',

  // Accents
  blue:      '#3B82F6',
  blueBright:'#4B8CF7',
  emerald:   '#10B981',
  violet:    '#8B5CF6',
  amber:     '#F59E0B',
  red:       '#EF4444',

  // Text
  textPrimary: '#E2E8F0',
  textMuted:   '#94A3B8',
  textFaint:   '#64748B',
  white:       '#FFFFFF',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
} as const;

export const Radii = {
  sm:   6,
  md:  10,
  lg:  14,
  xl:  18,
  full: 9999,
} as const;

export const FontSizes = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
} as const;

export const FontWeights = {
  normal:    '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};
