import { Pressable, Text, View } from 'react-native';

import { S, usePalette } from '@/theme';
import { Icon } from './Icon';
import { T, tap } from './ui';

/**
 * A navigation bar button in each platform's own idiom: words on iOS ("Cancel", "Back", "Done"),
 * icons on Android and the web.
 */
export function HeaderAction({ kind, onPress, label }: { kind: 'cancel' | 'back' | 'done' | 'edit'; onPress: () => void; label?: string }) {
  const pal = usePalette();
  const words = { cancel: 'Cancel', back: 'Back', done: 'Done', edit: 'Edit' }[kind];
  const icon = ({ cancel: 'close', back: 'back', done: 'check', edit: 'edit' } as const)[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? words} hitSlop={10} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 4 })}>
      {process.env.EXPO_OS === 'ios'
        ? <Text style={{ fontSize: 17, color: pal.ink, fontWeight: kind === 'done' ? '600' : '400' }}>{label ?? words}</Text>
        : <Icon name={icon} size={24} color={pal.ink} />}
    </Pressable>
  );
}

/** The title row inside a sheet, which has no navigation bar of its own. */
export function SheetTitle({ title, onDone }: { title: string; onDone: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, paddingTop: S.sm }}>
      <T v="h2" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
      <HeaderAction kind="done" onPress={onDone} />
    </View>
  );
}
