import { router } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Btn, T } from '@/components/ui';
import { usePalette } from '@/theme';

/** Shown if someone reaches a feature that's switched off in src/config.ts. */
export function ComingSoon({ title }: { title: string }) {
  const pal = usePalette();
  return (
    <Screen modal>
      <T v="h2">{title}</T>
      <T color={pal.muted} style={{ marginTop: 8, marginBottom: 18 }}>This feature is coming after the beta.</T>
      <Btn title="Back" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
    </Screen>
  );
}
