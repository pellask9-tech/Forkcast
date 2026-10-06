import { ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { computeTargets } from '@/lib/nutrition';
import { useAppState } from '@/lib/store';
import { F, goalColor, usePalette } from '@/theme';

const TAB_BAR = Platform.select({ ios: 50, android: 80 }) ?? 0;

export function Screen({ children, modal }: { children: ReactNode; modal?: boolean }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pal.paper }}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: modal ? 20 : insets.top + 10,
        paddingBottom: insets.bottom + (modal ? 40 : TAB_BAR + 32),
        paddingHorizontal: 18,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
      }}>
      <Backdrop modal={modal} />
      {children}
    </ScrollView>
  );
}

/**
 * Contour lines across the top of every screen, like a terrain map of your progress, with a soft
 * glow in the goal colour. Decorative only: it fades out before the content and ignores touches.
 */
const W = 400;
const H = 420;
const CONTOURS = Array.from({ length: 8 }, (_, k) => {
  const y0 = 24 + k * 34;
  const amp = 14 + (k % 3) * 6;
  let d = '';
  for (let x = -20; x <= W + 20; x += 20) {
    const y = y0 + amp * Math.sin(x / 70 + k * 0.8) + 6 * Math.sin(x / 23 + k);
    d += `${d ? ' L' : 'M'}${x} ${y.toFixed(1)}`;
  }
  return d;
});

function Backdrop({ modal }: { modal?: boolean }) {
  const pal = usePalette();
  const { profile } = useAppState();
  const color = goalColor(pal, profile?.goal);
  const strength = modal ? 0.6 : 1;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: -18, right: -18, height: H }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice">
        <Defs>
          <LinearGradient id="fc-fade" x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.28 * strength} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id="fc-glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={color} stopOpacity={0.16 * strength} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={W - 40} cy={30} r={170} fill="url(#fc-glow)" />
        {CONTOURS.map((d, i) => (
          <Path key={i} d={d} stroke="url(#fc-fade)" strokeWidth={i % 3 === 0 ? 1.6 : 1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

export function AppHeader() {
  const pal = usePalette();
  const { profile } = useAppState();
  const T = profile ? computeTargets(profile) : null;
  const color = goalColor(pal, profile?.goal);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <Text style={{ fontFamily: F.black, fontSize: 22, letterSpacing: -0.5, color: pal.ink }}>Forkcast</Text>
      {T ? (
        <View style={{ borderWidth: 2, borderColor: color, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3 }}>
          <Text style={{ fontFamily: F.xbold, fontSize: 14, color }}>
            {T.mode === 'maintain' ? 'Maintaining' : T.mode === 'cut' ? 'Cutting' : 'Bulking'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
