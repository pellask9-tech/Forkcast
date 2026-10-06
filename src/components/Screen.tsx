import { ReactNode } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
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
      {children}
    </ScrollView>
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
