import { StyleProp, Text, TextStyle } from 'react-native';

import { CURRENCY } from '@/config';
import { MASK, money, moneyParts, type Cents } from '@/lib/money';
import { usePalette } from '@/theme';
import { T } from './ui';

/**
 * An amount in a list or on a receipt. Money in gets a + and the positive colour; money out keeps the ink
 * colour with a minus, so the sign carries the meaning and colour only reinforces it.
 */
export function Amount({ value, hidden, v = 'h3', signed = true, struck, style }: {
  value: Cents; hidden?: boolean; v?: 'h3' | 'body' | 'sub' | 'label' | 'h2'; signed?: boolean; struck?: boolean; style?: StyleProp<TextStyle>;
}) {
  const pal = usePalette();
  const positive = signed && value > 0 && !struck;
  return (
    <T v={v} tabular color={struck ? pal.muted : positive ? pal.positive : pal.ink}
      style={[struck && { textDecorationLine: 'line-through' }, style]}
      accessibilityLabel={hidden ? 'Hidden' : money(value, { sign: signed ? 'always' : 'auto' })}>
      {hidden ? MASK : money(value, { sign: signed ? 'always' : 'auto' })}
    </T>
  );
}

/**
 * A big standalone balance: the currency sign and centavos are set smaller than the pesos. Uses the font's
 * normal (proportional) figures, which read better than tabular ones at this size.
 */
export function BigAmount({ value, hidden, color, size = 40 }: { value: Cents; hidden?: boolean; color?: string; size?: number }) {
  const pal = usePalette();
  const p = moneyParts(value);
  const small = { fontSize: Math.round(size * 0.58) };
  return (
    <Text
      accessibilityLabel={hidden ? 'Balance hidden' : money(value)}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ color: color ?? pal.ink, fontSize: size, lineHeight: Math.round(size * 1.15), fontWeight: '700', letterSpacing: -size / 32 }}>
      {hidden ? (
        <Text style={small}>{CURRENCY.symbol} {MASK}</Text>
      ) : (
        <>
          <Text style={small}>{p.sign}{CURRENCY.symbol}</Text>
          {p.whole}
          <Text style={small}>.{p.frac}</Text>
        </>
      )}
    </Text>
  );
}
