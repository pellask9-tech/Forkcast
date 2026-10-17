import { Text, View } from 'react-native';

import { usePalette } from '@/theme';

/** First letters of the first two words ("dela Cruz" counts; "(work)" doesn't). Works for accented names like Niño. */
export const initials = (name: string) =>
  name.split(/\s+/).filter(w => w && w[0].toUpperCase() !== w[0].toLowerCase()).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/** Initials on a soft tint picked from the name, so the same person always gets the same colour. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const pal = usePalette();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tint = pal.data[[0, 1, 2, 4, 5, 6][h % 6]];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint + '2E', alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ fontSize: Math.round(size * 0.38), fontWeight: '700', color: pal.ink }}>{initials(name)}</Text>
    </View>
  );
}
