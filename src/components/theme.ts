import { useColorScheme } from 'react-native';

const light = {
  background: '#F5F6F2',
  card: '#FFFFFF',
  text: '#171A16',
  muted: '#626A61',
  border: '#E1E5DD',
  track: '#ECEFE8',
  primary: '#1F8A55',
  primaryText: '#FFFFFF',
  primarySoft: '#E2F3E9',
  danger: '#C2410C',
  dangerSoft: '#FDEBDD',
  protein: '#D9480F',
  carbs: '#1971C2',
  fat: '#E5A100',
  fiber: '#2B8A3E',
  micro: '#7048E8',
  bmi: { underweight: '#1971C2', healthy: '#2B8A3E', overweight: '#E5A100', obese: '#C2410C' },
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#0E110E',
  card: '#181C18',
  text: '#EDF1EC',
  muted: '#9AA399',
  border: '#2A302A',
  track: '#262B26',
  primary: '#3DBE7C',
  primaryText: '#08130D',
  primarySoft: '#173323',
  danger: '#FB8A4C',
  dangerSoft: '#3A2216',
  protein: '#FF8A5B',
  carbs: '#5AA9FF',
  fat: '#FFC94D',
  fiber: '#5FD27A',
  micro: '#A991FF',
  bmi: { underweight: '#5AA9FF', healthy: '#5FD27A', overweight: '#FFC94D', obese: '#FB8A4C' },
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
