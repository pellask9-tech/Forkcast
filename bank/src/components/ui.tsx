import * as Haptics from 'expo-haptics';
import { Children, Fragment, isValidElement, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, View, ViewStyle,
} from 'react-native';

import { R, S, usePalette } from '@/theme';
import { Icon, type IconName } from './Icon';

export const tap = () => { if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'label' | 'sub' | 'small' | 'caption';
const TV = StyleSheet.create({
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 23 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  sub: { fontSize: 15, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});

/** Text in one of the app's sizes. `tabular` lines digits up in columns (amount lists, not big standalone numbers). */
export function T({ v = 'body', color, tabular, style, ...rest }: TextProps & { v?: Variant; color?: string; tabular?: boolean }) {
  const pal = usePalette();
  return <Text {...rest} style={[TV[v], { color: color ?? pal.ink }, tabular && { fontVariant: ['tabular-nums'] }, style]} />;
}

export function Btn({
  title, onPress, kind = 'primary', size = 'md', disabled, loading, icon, style, accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const pal = usePalette();
  const bg = { primary: pal.accent, secondary: pal.sunken, ghost: 'transparent', danger: pal.dangerSoft, gold: pal.gold }[kind];
  const fg = { primary: pal.onAccent, secondary: pal.ink, ghost: pal.ink, danger: pal.danger, gold: '#121826' }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          minHeight: size === 'sm' ? 36 : 52,
          paddingHorizontal: size === 'sm' ? S.md + 2 : S.xl,
          borderRadius: size === 'sm' ? R.sm : R.md,
          borderCurve: 'continuous',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: S.sm,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={fg} /> : null}
      <Text style={{ fontSize: size === 'sm' ? 15 : 17, fontWeight: '600', color: fg }}>{title}</Text>
    </Pressable>
  );
}

/** A round icon-only button, e.g. in a header. */
export function IconBtn({ icon, label, onPress, size = 40, tone = 'sunken', color }: {
  icon: IconName; label: string; onPress: () => void; size?: number; tone?: 'sunken' | 'clear' | 'onBrand'; color?: string;
}) {
  const pal = usePalette();
  const bg = tone === 'sunken' ? pal.sunken : tone === 'onBrand' ? 'rgba(255,255,255,0.14)' : 'transparent';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={size * 0.5} color={color ?? (tone === 'onBrand' ? pal.brandInk : pal.ink)} />
    </Pressable>
  );
}

/** A circle holding an icon, used at the start of list rows. */
export function IconWell({ icon, size = 40, color, bg }: { icon: IconName; size?: number; color?: string; bg?: string }) {
  const pal = usePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? pal.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size * 0.48} color={color ?? pal.ink} />
    </View>
  );
}

/**
 * Rows grouped on one surface with hairlines between them (inset-grouped list), instead of a card per row.
 * `inset` is where the hairline starts, so it lines up with the row text rather than the icon.
 */
export function Group({ children, inset = S.lg, style }: { children: ReactNode; inset?: number; style?: StyleProp<ViewStyle> }) {
  const pal = usePalette();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', overflow: 'hidden' }, style]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: pal.line, marginLeft: inset }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
/** Where a Group's hairline starts when its rows lead with a 40px icon. */
export const ICON_INSET = S.lg + 40 + S.md;

export function Row({
  title, sub, leading, trailing, value, onPress, onLongPress, chevron, destructive, accessibilityLabel, accessibilityHint, numberOfLines = 1,
}: {
  title: string;
  sub?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  numberOfLines?: number;
}) {
  const pal = usePalette();
  const body = (pressed: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: 56, backgroundColor: pressed ? pal.sunken : 'transparent' }}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body" color={destructive ? pal.danger : pal.ink} numberOfLines={numberOfLines}>{title}</T>
        {sub ? <T v="small" color={pal.muted} numberOfLines={2}>{sub}</T> : null}
      </View>
      {value ? <T v="sub" color={pal.muted} tabular numberOfLines={1} style={{ maxWidth: '50%' }}>{value}</T> : null}
      {trailing}
      {chevron ? <Icon name="right" size={14} color={pal.faint} /> : null}
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={accessibilityLabel}>{body(false)}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (sub ? `${title}, ${sub}` : title)} accessibilityHint={accessibilityHint}
      onPress={() => { tap(); onPress(); }} onLongPress={onLongPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

/** A section title with an optional action on the right, like "See all". */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm, paddingHorizontal: S.xs }}>
      <T v="h3" accessibilityRole="header">{title}</T>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); onAction(); }} hitSlop={10}>
          <T v="label" color={pal.muted}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? pal.ink : pal.surface, borderRadius: R.pill,
        paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Icon name={icon} size={15} color={selected ? pal.paper : pal.ink} /> : null}
      <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? pal.paper : pal.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string | number>({
  options, value, onChange, wrap = true,
}: { options: { value: V; label: string; icon?: IconName }[]; value: V | undefined; onChange: (v: V) => void; wrap?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: S.sm }} accessibilityRole="radiogroup">
      {options.map(o => <Chip key={String(o.value)} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />)}
    </View>
  );
}

export function Field({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const pal = usePalette();
  return (
    <View style={[{ gap: 6 }, style as StyleProp<ViewStyle>]}>
      <T v="label">{label}</T>
      <TextInput
        placeholderTextColor={pal.faint}
        accessibilityLabel={label}
        {...props}
        style={{
          fontSize: 17, color: pal.ink, backgroundColor: pal.surface,
          borderRadius: R.md, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: S.lg,
          borderWidth: 1.5, borderColor: error ? pal.danger : 'transparent',
        }}
      />
      {error ? <T v="small" color={pal.danger} accessibilityLiveRegion="polite">{error}</T> : hint ? <T v="small" color={pal.muted}>{hint}</T> : null}
    </View>
  );
}

/** A small status label with an icon, so state never relies on colour alone. */
export function Badge({ label, icon, tone = 'muted' }: { label: string; icon?: IconName; tone?: 'muted' | 'danger' | 'positive' | 'brand' }) {
  const pal = usePalette();
  const fg = { muted: pal.muted, danger: pal.danger, positive: pal.positive, brand: pal.ink }[tone];
  const bg = tone === 'danger' ? pal.dangerSoft : pal.sunken;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  );
}

/** A short explanation or warning in a tinted box. */
export function Notice({ text, icon, tone = 'info', style }: { text: string; icon?: IconName; tone?: 'info' | 'danger'; style?: StyleProp<ViewStyle> }) {
  const pal = usePalette();
  return (
    <View style={[{ flexDirection: 'row', gap: S.md, backgroundColor: tone === 'danger' ? pal.dangerSoft : pal.sunken, borderRadius: R.md, borderCurve: 'continuous', padding: S.md + 2 }, style]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon ?? (tone === 'danger' ? 'warning' : 'info')} size={18} color={tone === 'danger' ? pal.danger : pal.muted} />
      <T v="small" color={tone === 'danger' ? pal.danger : pal.muted} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

/** Space-between label/value lines, as on a receipt. */
export function DetailLine({ label, value, strong, selectable }: { label: string; value: string; strong?: boolean; selectable?: boolean }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.lg, paddingVertical: 6 }}>
      <T v="sub" color={pal.muted}>{label}</T>
      <T v={strong ? 'h3' : 'sub'} tabular selectable={selectable} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}


/** A search box with a clear button. */
export function SearchField({ value, onChangeText, placeholder, autoFocus }: { value: string; onChangeText: (t: string) => void; placeholder: string; autoFocus?: boolean }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', paddingHorizontal: S.md }}>
      <Icon name="search" size={18} color={pal.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={pal.faint} autoFocus={autoFocus}
        accessibilityLabel={placeholder} returnKeyType="search" autoCorrect={false} clearButtonMode="never"
        style={{ flex: 1, fontSize: 17, color: pal.ink, paddingVertical: 12 }} />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChangeText('')}>
          <Icon name="xCircle" size={18} color={pal.faint} />
        </Pressable>
      ) : null}
    </View>
  );
}
