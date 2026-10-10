import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

type Name = ComponentProps<typeof SymbolView>['name'];

/** Cross-platform icons: SF Symbols on iOS, Material Symbols on Android. */
export const ICONS = {
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  search: { ios: 'magnifyingglass', android: 'search' },
  body: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center' },
  water: { ios: 'drop.fill', android: 'water_drop' },
  flame: { ios: 'flame.fill', android: 'local_fire_department' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  left: { ios: 'chevron.left', android: 'chevron_left' },
  right: { ios: 'chevron.right', android: 'chevron_right' },
  plan: { ios: 'list.bullet.clipboard', android: 'event_note' },
} satisfies Record<string, Name>;

export function Icon({ name, size = 22, color }: { name: keyof typeof ICONS; size?: number; color: string }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
