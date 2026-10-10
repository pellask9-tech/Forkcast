import { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { F, usePalette } from '@/theme';

const tap = () => { Haptics.selectionAsync().catch(() => {}); };

type Variant = 'body' | 'small' | 'tiny' | 'label' | 'h3' | 'h2' | 'title' | 'display' | 'brand';
const TV = StyleSheet.create({
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
  tiny: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: F.bold, fontSize: 15, lineHeight: 20 },
  h3: { fontFamily: F.xbold, fontSize: 18, lineHeight: 23 },
  h2: { fontFamily: F.xbold, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  title: { fontFamily: F.black, fontSize: 34, lineHeight: 37, letterSpacing: -0.8 },
  display: { fontFamily: F.black, fontSize: 64, lineHeight: 66, letterSpacing: -2 },
  brand: { fontFamily: F.black, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
});

export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  const pal = usePalette();
  return <Text {...rest} style={[TV[v], { color: color ?? pal.ink, fontVariant: ['tabular-nums'] }, style]} />;
}

export function Btn({
  title, onPress, kind = 'primary', small, disabled, loading, style, color, icon,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'ghost' | 'goal';
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
  icon?: ReactNode;
}) {
  const pal = usePalette();
  const bg = kind === 'ghost' ? 'transparent' : kind === 'goal' ? color ?? pal.cut : pal.ink;
  const fg = kind === 'ghost' ? pal.ink : kind === 'goal' ? pal.onGoal : pal.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: kind === 'ghost' ? pal.line : bg,
          borderWidth: 1.5,
          borderRadius: 999,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? 14 : 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ fontFamily: F.bold, fontSize: small ? 14 : 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { tap(); onPress(); }}
      style={{
        borderWidth: 1.5,
        borderColor: selected ? pal.ink : pal.line,
        backgroundColor: selected ? pal.ink : pal.surface,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: selected ? pal.paper : pal.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string | number>({
  options, value, onChange,
}: { options: { value: V; label: string }[]; value: V | undefined; onChange: (v: V) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {options.map(o => (
        <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function Field({ label, suffix, style, ...props }: TextInputProps & { label: string; suffix?: string }) {
  const pal = usePalette();
  return (
    <View style={[{ flex: 1, minWidth: 90 }, style as StyleProp<ViewStyle>]}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: pal.ink, marginBottom: 5 }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={pal.muted}
          {...props}
          style={{
            fontFamily: F.medium,
            fontSize: 17,
            color: pal.ink,
            backgroundColor: pal.surface,
            borderWidth: 1.5,
            borderColor: pal.line,
            borderRadius: 12,
            paddingVertical: 11,
            paddingLeft: 12,
            paddingRight: suffix ? 40 : 12,
          }}
        />
        {suffix ? (
          <Text style={{ position: 'absolute', right: 12, fontFamily: F.regular, fontSize: 15, color: pal.muted }} pointerEvents="none">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function Stepper({ label, onMinus, onPlus, minusDisabled }: { label: string; onMinus: () => void; onPlus: () => void; minusDisabled?: boolean }) {
  const pal = usePalette();
  const b: ViewStyle = { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' };
  const bt: TextStyle = { fontFamily: F.bold, fontSize: 24, color: pal.ink, lineHeight: 28 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: pal.line, borderRadius: 999, backgroundColor: pal.paper, alignSelf: 'flex-start' }}>
      <Pressable accessibilityLabel="Less" disabled={minusDisabled} onPress={() => { tap(); onMinus(); }} style={[b, { opacity: minusDisabled ? 0.3 : 1 }]}>
        <Text style={bt}>−</Text>
      </Pressable>
      <Text style={{ fontFamily: F.xbold, fontSize: 16, color: pal.ink, minWidth: 120, textAlign: 'center' }} accessibilityLiveRegion="polite">{label}</Text>
      <Pressable accessibilityLabel="More" onPress={() => { tap(); onPlus(); }} style={b}>
        <Text style={bt}>+</Text>
      </Pressable>
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color, marginRight: 5 }} />;
}

export function MacroLine({ p, c, f, style }: { p: number; c: number; f: number; style?: StyleProp<ViewStyle> }) {
  const pal = usePalette();
  const item = (color: string, text: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Dot color={color} />
      <T v="small">{text}</T>
    </View>
  );
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }, style]}>
      {item(pal.protein, `${Math.round(p)} g protein`)}
      {item(pal.carb, `${Math.round(c)} g carbs`)}
      {item(pal.fat, `${Math.round(f)} g fat`)}
    </View>
  );
}

export function NoteBox({ text, warn, color }: { text: string; warn?: boolean; color?: string }) {
  const pal = usePalette();
  return (
    <View style={{ borderLeftWidth: 4, borderLeftColor: warn ? pal.danger : color ?? pal.cut, backgroundColor: pal.surface, paddingVertical: 11, paddingHorizontal: 13, borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
      <T v="small">{text}</T>
    </View>
  );
}

export function SectionRule() {
  const pal = usePalette();
  return <View style={{ height: 2, backgroundColor: pal.ink, marginTop: 26, marginBottom: 8 }} />;
}
