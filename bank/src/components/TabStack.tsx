import { Stack } from 'expo-router';

import { usePalette } from '@/theme';

/**
 * Each tab gets its own native stack so its title is a real navigation bar: a large title that shrinks as
 * you scroll on iOS, a top app bar on Android.
 */
export function TabStack({ title }: { title: string }) {
  const pal = usePalette();
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false, headerLargeTitleShadowVisible: false, headerTintColor: pal.ink, contentStyle: { backgroundColor: pal.paper } }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
