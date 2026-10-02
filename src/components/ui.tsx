import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { formatAmount, NUTRIENT_INFO, type NutrientKey } from '@/lib/nutrients';

import { usePalette } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'small';

export function T({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const c = usePalette();
  const muted = variant === 'muted' || variant === 'small';
  return (
    <Text numberOfLines={numberOfLines} style={[textStyles[variant], { color: color ?? (muted ? c.muted : c.text) }, style]}>
      {children}
    </Text>
  );
}

export function Card({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {(title || right) && (
        <View style={styles.cardHeader}>
          {title ? <T variant="heading">{title}</T> : <View />}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  overColor,
  height = 8,
}: {
  value: number;
  max: number;
  color: string;
  /** Color once value passes max; defaults to `color`. */
  overColor?: string;
  height?: number;
}) {
  const c = usePalette();
  const ratio = max > 0 ? value / max : 0;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.min(1, ratio) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: ratio > 1 && overColor ? overColor : color,
        }}
      />
    </View>
  );
}

/** One nutrient with a progress bar against its daily target or limit. */
export function NutrientRow({
  nutrient,
  value,
  target,
  color,
}: {
  nutrient: NutrientKey;
  value: number;
  target: number;
  color: string;
}) {
  const c = usePalette();
  const info = NUTRIENT_INFO[nutrient];
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  const over = info.kind === 'limit' && value > target;
  return (
    <View style={styles.nutrientRow}>
      <View style={styles.rowBetween}>
        <T>{info.label}</T>
        <T variant="small" color={over ? c.danger : undefined}>
          {formatAmount(value, info.unit)} / {formatAmount(target, info.unit)}
          {info.kind === 'limit' ? ' max' : ''} · {pct}%
        </T>
      </View>
      <ProgressBar value={value} max={target} color={color} overColor={info.kind === 'limit' ? c.danger : undefined} height={6} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  compact?: boolean;
}) {
  const c = usePalette();
  const bg = variant === 'primary' ? c.primary : variant === 'danger' ? c.dangerSoft : c.primarySoft;
  const fg = variant === 'primary' ? c.primaryText : variant === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      {icon && <Ionicons name={icon} size={compact ? 16 : 18} color={fg} />}
      <Text style={[styles.buttonLabel, compact && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const c = usePalette();
  return (
    <View style={[styles.segmented, { backgroundColor: c.track }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.segmentLabel, { color: active ? c.text : c.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.card },
      ]}>
      <Text style={{ color: active ? c.primary : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <T variant="small" style={styles.fieldLabel}>
        {label}
      </T>
      {children}
      {hint && <T variant="small">{hint}</T>}
    </View>
  );
}

export function Input({ suffix, style, ...props }: TextInputProps & { suffix?: string }) {
  const c = usePalette();
  return (
    <View style={[styles.input, { borderColor: c.border, backgroundColor: c.card }, style as StyleProp<ViewStyle>]}>
      <TextInput placeholderTextColor={c.muted} style={[styles.inputText, { color: c.text }]} {...props} />
      {suffix && <T variant="muted">{suffix}</T>}
    </View>
  );
}

export function MacroPills({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
  const c = usePalette();
  return (
    <View style={styles.pills}>
      <T variant="small" style={styles.pillStrong}>
        {Math.round(calories).toLocaleString('en-US')} kcal
      </T>
      <T variant="small" color={c.protein}>
        P {Math.round(protein)}g
      </T>
      <T variant="small" color={c.carbs}>
        C {Math.round(carbs)}g
      </T>
      <T variant="small" color={c.fat}>
        F {Math.round(fat)}g
      </T>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nutrientRow: { gap: 6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  buttonCompact: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  segmentLabel: { fontSize: 15, fontWeight: '600' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  field: { gap: 6 },
  fieldLabel: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  inputText: { flex: 1, fontSize: 17, paddingVertical: 12, minWidth: 0 },
  pills: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  pillStrong: { fontWeight: '700' },
});

const textStyles = StyleSheet.create({
  display: { fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 16 },
  muted: { fontSize: 15 },
  small: { fontSize: 13 },
});
