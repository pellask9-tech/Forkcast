import { useColorScheme } from 'react-native';

const light = {
  paper: '#EDF1EC',
  surface: '#FFFFFF',
  ink: '#14261C',
  muted: '#55675C',
  line: '#C8D3CB',
  soft: '#DFE7E1',
  protein: '#CF3F2B',
  carb: '#C98A0B',
  fat: '#3C8651',
  cut: '#1F5FCC',
  bulk: '#A82A6E',
  onGoal: '#FFFFFF',
  danger: '#B42318',
  bandUnder: '#B9CBE3',
  bandOk: '#B8DCC2',
  bandOver: '#F0D79A',
  bandObese: '#EDB3A8',
};
export type Palette = typeof light;

const dark: Palette = {
  paper: '#0E1612',
  surface: '#16211B',
  ink: '#E4ECE6',
  muted: '#97A89D',
  line: '#2E3C34',
  soft: '#223029',
  protein: '#F07A64',
  carb: '#F0BD45',
  fat: '#79C08A',
  cut: '#7AA8F5',
  bulk: '#E57CB6',
  onGoal: '#0E1612',
  danger: '#F2877A',
  bandUnder: '#3A5577',
  bandOk: '#2F6243',
  bandOver: '#6E5A22',
  bandObese: '#7A3A30',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
export function useIsDark() {
  return useColorScheme() === 'dark';
}

/** Archivo, loaded in src/app/_layout.tsx */
export const F = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  xbold: 'Archivo_800ExtraBold',
  black: 'Archivo_900Black',
} as const;

export const goalColor = (pal: Palette, goal: 'cut' | 'bulk' | undefined) => (goal === 'bulk' ? pal.bulk : pal.cut);
