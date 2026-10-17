import { useColorScheme } from 'react-native';

/**
 * Florin's colours. Navy and gold are the brand; everything else is a neutral that has been checked for
 * WCAG contrast in both modes (text pairs clear 4.5:1, `faint` is for placeholders and large text only).
 * `data` is the validated chart palette (fixed order, colour-blind safe on these surfaces): charts take
 * slot 1 for a single series and the next slots in order, never cycled.
 */
const light = {
  paper: '#F5F3EE',
  surface: '#FFFFFF',
  sunken: '#ECE9E2',
  ink: '#121826',
  muted: '#5E6573',
  faint: '#8B919C',
  line: '#E3DFD6',
  brand: '#13213C',
  brandInk: '#FFFFFF',
  brandMuted: '#B9C0CE',
  gold: '#C59A3E',
  accent: '#13213C',
  onAccent: '#FFFFFF',
  positive: '#0B7A3E',
  danger: '#C4372F',
  dangerSoft: '#FBE9E7',
  data: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  context: '#898781',
  grid: '#ECE9E2',
  warning: '#fab219',
  critical: '#d03b3b',
};
export type Palette = typeof light;

const dark: Palette = {
  paper: '#0B0F17',
  surface: '#141A24',
  sunken: '#1E2633',
  ink: '#EEF1F6',
  muted: '#9AA3B2',
  faint: '#6B7484',
  line: '#253042',
  brand: '#16264A',
  brandInk: '#FFFFFF',
  brandMuted: '#B9C0CE',
  gold: '#D9B061',
  accent: '#D9B061',
  onAccent: '#121826',
  positive: '#3FBF6A',
  danger: '#F07B70',
  dangerSoft: '#3A1D1D',
  data: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  context: '#898781',
  grid: '#222B3A',
  warning: '#fab219',
  critical: '#d03b3b',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
export function useIsDark() {
  return useColorScheme() === 'dark';
}

/** Spacing steps: rows sit closer than groups, groups closer than sections. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 10, md: 14, lg: 22, pill: 999 } as const;

/** Goals pick a colour from these chart slots (yellow and red are left out: low contrast, reads as an error). */
export const GOAL_SLOTS = [0, 1, 2, 4, 5, 6] as const;
