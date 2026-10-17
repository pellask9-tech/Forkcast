import { ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { CURRENCY, PIN_LENGTH } from '@/config';
import { formatTyped } from '@/lib/money';
import { S, usePalette } from '@/theme';
import { Icon, type IconName } from './Icon';
import { T, tap } from './ui';

type Left = 'dot' | { label: string; icon: IconName; onPress: () => void } | null;

/**
 * A phone-style number pad. The bottom-left key is a decimal point for amounts, or an action such as
 * biometric unlock for PINs. On the web the physical keyboard works too.
 */
export function Keypad({ onKey, left = null, onBrand, disabled }: { onKey: (key: string) => void; left?: Left; onBrand?: boolean; disabled?: boolean }) {
  const pal = usePalette();
  const fg = onBrand ? pal.brandInk : pal.ink;
  const press = onBrand ? 'rgba(255,255,255,0.14)' : pal.sunken;

  const dot = left === 'dot';
  const onHardwareKey = useEffectEvent((e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    if (/^\d$/.test(e.key)) onKey(e.key);
    else if (e.key === 'Backspace') onKey('del');
    else if ((e.key === '.' || e.key === ',') && dot) onKey('.');
  });
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web' || disabled) return;
    const handle = (e: KeyboardEvent) => onHardwareKey(e);
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [disabled]);

  const key = (k: string, content: ReactNode, label: string, onPress = () => onKey(k)) => (
    <Pressable key={k} accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={{ flex: 1, height: 62, alignItems: 'center', justifyContent: 'center' }}>
      {({ pressed }) => (
        <View style={{ width: 76, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? press : 'transparent' }}>
          {content}
        </View>
      )}
    </Pressable>
  );
  const digit = (d: string) => key(d, <Text style={{ fontSize: 28, fontWeight: '500', color: fg, fontVariant: ['tabular-nums'] }}>{d}</Text>, d);

  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map(r => (
        <View key={r[0]} style={{ flexDirection: 'row' }}>{r.map(digit)}</View>
      ))}
      <View style={{ flexDirection: 'row' }}>
        {left === 'dot'
          ? key('.', <Text style={{ fontSize: 28, fontWeight: '500', color: fg }}>.</Text>, 'Decimal point')
          : left
            ? key('left', <Icon name={left.icon} size={26} color={fg} />, left.label, left.onPress)
            : <View style={{ flex: 1 }} />}
        {digit('0')}
        {key('del', <Icon name="backspace" size={24} color={fg} />, 'Delete')}
      </View>
    </View>
  );
}

/** Shakes sideways, the way a wrong PIN does. */
function useShake() {
  // In state rather than useAnimatedValue, which react-native-web doesn't have.
  const [x] = useState(() => new Animated.Value(0));
  const shake = () => {
    x.setValue(0);
    Animated.sequence([10, -10, 8, -8, 4, 0].map(v => Animated.timing(x, { toValue: v, duration: 50, useNativeDriver: process.env.EXPO_OS !== 'web' }))).start();
  };
  return [x, shake] as const;
}

/**
 * PIN entry: a row of dots and the keypad. When the last digit goes in it calls `onComplete`, which
 * resolves to an error to show (the dots shake and clear) or null when the PIN was accepted.
 */
export function PinPad({ title, sub, onComplete, left = null, onBrand, locked, footer }: {
  title: string;
  sub?: string;
  onComplete: (pin: string) => Promise<string | null> | string | null;
  left?: Left;
  onBrand?: boolean;
  locked?: boolean;
  footer?: ReactNode;
}) {
  const pal = usePalette();
  const [pin, setPinState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [x, shake] = useShake();
  const fg = onBrand ? pal.brandInk : pal.ink;
  const dim = onBrand ? pal.brandMuted : pal.muted;
  // Keys can arrive faster than renders (a hardware keyboard on the web), so the digits live in a ref too.
  const pinRef = useRef('');
  const setPin = (p: string) => { pinRef.current = p; setPinState(p); };

  const onKey = async (k: string) => {
    const current = pinRef.current;
    if (checking || locked || current.length >= PIN_LENGTH) return;
    if (k === 'del') { setPin(current.slice(0, -1)); return; }
    if (!/^\d$/.test(k)) return;
    const next = current + k;
    setPin(next);
    setError(null);
    if (next.length < PIN_LENGTH) return;
    setChecking(true);
    const problem = await onComplete(next);
    setChecking(false);
    if (problem) {
      setError(problem);
      setPin('');
      shake();
    }
  };

  return (
    <View style={{ gap: S.xl, width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      <View style={{ alignItems: 'center', gap: S.sm }}>
        <T v="h2" color={fg} style={{ textAlign: 'center' }} accessibilityRole="header">{title}</T>
        {sub ? <T v="sub" color={dim} style={{ textAlign: 'center' }}>{sub}</T> : null}
      </View>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, transform: [{ translateX: x }] }}
        accessible accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: error ? pal.danger : fg, backgroundColor: i < pin.length ? fg : 'transparent' }} />
        ))}
      </Animated.View>
      <View style={{ minHeight: 20 }}>
        {error ? <T v="small" color={onBrand ? '#FFB4AB' : pal.danger} style={{ textAlign: 'center' }} accessibilityLiveRegion="assertive">{error}</T> : null}
      </View>
      <Keypad onKey={onKey} left={left} onBrand={onBrand} disabled={checking || locked} />
      {footer}
    </View>
  );
}

/** The amount being typed, large, with a line underneath for the balance or what's wrong. */
export function AmountDisplay({ raw, caption, error }: { raw: string; caption?: string; error?: string | null }) {
  const pal = usePalette();
  const text = formatTyped(raw);
  const size = text.length > 10 ? 40 : text.length > 7 ? 48 : 58;
  return (
    <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.md }}>
      <Text accessibilityLiveRegion="polite" accessibilityLabel={`Amount ${CURRENCY.symbol}${text}`} numberOfLines={1} adjustsFontSizeToFit
        style={{ fontSize: size, lineHeight: size * 1.15, fontWeight: '700', letterSpacing: -1.5, color: raw ? pal.ink : pal.faint }}>
        <Text style={{ fontSize: size * 0.6 }}>{CURRENCY.symbol}</Text>{text}
      </Text>
      <T v="sub" color={error ? pal.danger : pal.muted} style={{ textAlign: 'center', minHeight: 20 }} accessibilityLiveRegion="polite">
        {error ?? caption ?? ' '}
      </T>
    </View>
  );
}
