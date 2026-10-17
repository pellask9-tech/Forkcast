import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BANK_NAME } from '@/config';
import { usePalette } from '@/theme';

/** The Florin coin: a gold disc with the florin sign, ƒ. */
export function Logo({ size = 40, ink }: { size?: number; ink?: string }) {
  const pal = usePalette();
  const navy = ink ?? '#13213C';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${BANK_NAME} logo`}>
      <Circle cx={50} cy={50} r={50} fill={pal.gold} />
      <Circle cx={50} cy={50} r={41} stroke={navy} strokeOpacity={0.28} strokeWidth={2.5} fill="none" />
      <Path d="M64 26 C59 20 50 21 47.5 31 L39.5 71 C37.5 80.5 30 83.5 24 78.5" stroke={navy} strokeWidth={7.5} strokeLinecap="round" fill="none" />
      <Path d="M34 47 L61 47" stroke={navy} strokeWidth={6.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Wordmark({ size = 22, color }: { size?: number; color?: string }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }}>
      <Logo size={size * 1.3} />
      <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5, color: color ?? pal.ink }}>{BANK_NAME}</Text>
    </View>
  );
}

/*
 * Guilloché: the fine interfering wave lines printed on banknotes. Decorative only: drawn once at module
 * load, ignored by screen readers and touches.
 */
const GW = 360;
const GH = 220;
const WAVES = Array.from({ length: 14 }, (_, k) => {
  let d = '';
  for (let x = -12; x <= GW + 12; x += 6) {
    const y = GH * 0.66 + 30 * Math.sin(x / 48 + k * 0.42) + 12 * Math.sin(x / 17 - k * 0.85);
    d += `${d ? ' L' : 'M'}${x} ${y.toFixed(1)}`;
  }
  return d;
});
const ROSETTE = Array.from({ length: 9 }, (_, k) => {
  let d = '';
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    const r = 62 + 7 * Math.sin(9 * a + k * 0.7) + k * 3.2;
    d += `${d ? ' L' : 'M'}${(GW - 34 + r * Math.cos(a)).toFixed(1)} ${(34 + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + ' Z';
});

/** Fills its parent, or with `height` only a band across the top (so full screens keep their controls clear). */
export function Guilloche({ color, opacity = 0.22, height }: { color: string; opacity?: number; height?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, ...(height ? { height } : { bottom: 0 }) }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="xMidYMid slice">
        {WAVES.map((d, i) => <Path key={`w${i}`} d={d} stroke={color} strokeOpacity={opacity} strokeWidth={0.9} fill="none" />)}
        {ROSETTE.map((d, i) => <Path key={`r${i}`} d={d} stroke={color} strokeOpacity={opacity * 0.8} strokeWidth={0.8} fill="none" />)}
      </Svg>
    </View>
  );
}
