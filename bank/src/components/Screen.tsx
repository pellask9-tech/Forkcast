import { ReactNode } from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { S, usePalette } from '@/theme';

/**
 * The scrolling body of a screen. On iOS the scroll view insets itself for the header, tab bar and home
 * indicator (contentInsetAdjustmentBehavior). Elsewhere the tab bar handles its own space, so only screens
 * outside the tabs add the bottom inset. Content is centred and capped in width for tablets and the web.
 */
export function Screen({ children, tab, gap = S.xl, style }: { children: ReactNode; tab?: boolean; gap?: number; style?: StyleProp<ViewStyle> }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const bottom = process.env.EXPO_OS === 'ios' || tab ? 0 : insets.bottom;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pal.paper }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[{ padding: S.lg, paddingBottom: S.xxl + bottom, gap, width: '100%', maxWidth: 680, alignSelf: 'center' }, style]}>
      {children}
    </ScrollView>
  );
}
