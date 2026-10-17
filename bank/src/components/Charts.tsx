/**
 * Small SVG charts. They follow one set of rules: 2px lines, hairline gridlines, bars no thicker than 24px
 * with a 4px rounded end, a legend whenever there are two series, labels in text colours (never the series
 * colour), and a readout that follows your finger and defaults to the latest point, so every value can be
 * read without hovering. The colours are the validated chart palette in src/theme.ts.
 */
import { ReactNode, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { compact, money, type Cents } from '@/lib/money';
import { S, usePalette } from '@/theme';
import { T } from './ui';

/** Progress around a circle, for savings goals. The track is a light step of the same colour. */
export function ProgressRing({ progress, size = 56, stroke = 6, color, children }: { progress: number; size?: number; stroke?: number; color: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const mid = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={mid} cy={mid} r={r} stroke={color} strokeOpacity={0.2} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle cx={mid} cy={mid} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${mid} ${mid})`} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/** How a budget is going: blue while under 80%, then warning, then critical once it's over. */
export function budgetState(spent: Cents, budget: Cents) {
  const ratio = budget > 0 ? spent / budget : 0;
  return ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok';
}

/** A single ratio against a limit. The fill carries the state; the track is the same hue, lighter. */
export function Meter({ value, max, height = 8 }: { value: Cents; max: Cents; height?: number }) {
  const pal = usePalette();
  const state = budgetState(value, max);
  const color = state === 'over' ? pal.critical : state === 'near' ? pal.warning : pal.data[0];
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: color + '33', overflow: 'hidden' }}>
      <View style={{ height, borderRadius: height / 2, width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, backgroundColor: color }} />
    </View>
  );
}

/**
 * A category's share of the month's spending: one hue for every row (the label says what it is), and no
 * track, so it doesn't read as a budget meter filling up.
 */
export function ShareBar({ share }: { share: number }) {
  const pal = usePalette();
  return <View style={{ height: 6, borderRadius: 3, width: `${Math.max(2, Math.min(100, share * 100))}%`, backgroundColor: pal.data[0] }} />;
}

/** SVG text doesn't inherit the app font, so name the system sans (the browser default is a serif). */
const CHART_FONT = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', android: 'sans-serif', default: undefined });

const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
/** Rounds an axis maximum up to a clean number (with a little headroom) so gridlines land on round values. */
export function niceMax(v: number) {
  if (v <= 0) return 1;
  const target = v * 1.05;
  const p = 10 ** Math.floor(Math.log10(target));
  return (NICE.find(n => n * p >= target) ?? 10) * p;
}

function useWidth(initial = 320) {
  const [width, setWidth] = useState(initial);
  const onLayout = (e: LayoutChangeEvent) => { const w = Math.round(e.nativeEvent.layout.width); if (w > 0 && w !== width) setWidth(w); };
  return [width, onLayout] as const;
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.lg }}>
      {items.map(i => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={i.line ? { width: 14, height: 2, borderRadius: 1, backgroundColor: i.color } : { width: 10, height: 10, borderRadius: 3, backgroundColor: i.color }} />
          <T v="small" color={pal.muted}>{i.label}</T>
        </View>
      ))}
    </View>
  );
}

const AXIS_W = 44;
const X_AXIS_H = 22;

/**
 * Cumulative spending through a month, this month against last month (the comparison is in grey).
 * Touch or drag across the chart to read any day.
 */
export function SpendLine({ current, previous, days, label, previousLabel, dayName }: {
  current: Cents[]; previous: Cents[]; days: number; label: string; previousLabel: string; dayName: (day: number) => string;
}) {
  const pal = usePalette();
  const [width, onLayout] = useWidth();
  const [picked, setPicked] = useState<number | null>(null);
  const H = 150;
  const plotW = Math.max(10, width - AXIS_W - 8);
  const max = niceMax(Math.max(1, ...current, ...previous));
  const x = (day: number) => AXIS_W + ((day - 1) / Math.max(1, days - 1)) * plotW;
  const y = (v: number) => 6 + (1 - v / max) * (H - 12);
  const path = (series: number[]) => series.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const day = picked ?? current.length;
  const pick = (e: GestureResponderEvent) => {
    const d = Math.round(((e.nativeEvent.locationX - AXIS_W) / plotW) * (days - 1)) + 1;
    setPicked(Math.max(1, Math.min(current.length, d)));
  };
  const ticks = [1, 8, 15, 22, days].filter((d, i, a) => a.indexOf(d) === i && d <= days);
  const cur = current[day - 1] ?? 0;
  const prev = previous[Math.min(day, previous.length) - 1] ?? 0;

  return (
    <View style={{ gap: S.md }}>
      <Legend items={[{ label, color: pal.data[0], line: true }, { label: previousLabel, color: pal.context, line: true }]} />
      <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md }}>
        <T v="small" color={pal.muted}>{dayName(day)}</T>
        <T v="small" tabular>{money(cur, { whole: true })} spent</T>
        <T v="small" color={pal.muted} tabular>{previousLabel}: {money(prev, { whole: true })}</T>
      </View>
      <View onLayout={onLayout} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={pick} onResponderMove={pick}
        accessible accessibilityLabel={`${label}: ${money(current[current.length - 1] ?? 0, { whole: true })} spent by ${dayName(current.length)}. ${previousLabel}: ${money(previous[Math.min(current.length, previous.length) - 1] ?? 0, { whole: true })} by the same day.`}>
        <Svg width={width} height={H + X_AXIS_H}>
          {[0, max / 2, max].map(v => (
            <Line key={v} x1={AXIS_W} x2={width - 4} y1={y(v)} y2={y(v)} stroke={pal.grid} strokeWidth={1} />
          ))}
          {[0, max / 2, max].map(v => (
            <SvgText key={`t${v}`} x={AXIS_W - 8} y={y(v) + 4} fontSize={11} fontFamily={CHART_FONT} fill={pal.muted} textAnchor="end">{compact(v)}</SvgText>
          ))}
          {ticks.map(d => (
            <SvgText key={`d${d}`} x={x(d)} y={H + 16} fontSize={11} fontFamily={CHART_FONT} fill={pal.muted} textAnchor={d === 1 ? 'start' : d === days ? 'end' : 'middle'}>{d}</SvgText>
          ))}
          <Path d={path(previous.slice(0, days))} stroke={pal.context} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {current.length ? <Path d={path(current)} stroke={pal.data[0]} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          <Line x1={x(day)} x2={x(day)} y1={4} y2={H} stroke={pal.muted} strokeOpacity={0.5} strokeWidth={1} />
          {day <= previous.length ? <Circle cx={x(day)} cy={y(prev)} r={4} fill={pal.context} stroke={pal.surface} strokeWidth={2} /> : null}
          {current.length ? <Circle cx={x(day)} cy={y(cur)} r={5} fill={pal.data[0]} stroke={pal.surface} strokeWidth={2} /> : null}
        </Svg>
      </View>
    </View>
  );
}

/** Rounded at the data end, square at the baseline. */
const barPath = (x: number, top: number, w: number, base: number) => {
  const h = base - top;
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x} ${base} L${x} ${top + r} Q${x} ${top} ${x + r} ${top} L${x + w - r} ${top} Q${x + w} ${top} ${x + w} ${top + r} L${x + w} ${base} Z`;
};

/** Money in and money out for each month, side by side. Tap a month to read it. */
export function InOutBars({ months, selected, onSelect }: {
  months: { key: string; label: string; in: Cents; out: Cents }[]; selected: string; onSelect: (key: string) => void;
}) {
  const pal = usePalette();
  const [width, onLayout] = useWidth();
  const H = 140;
  const plotW = Math.max(10, width - AXIS_W - 4);
  const max = niceMax(Math.max(1, ...months.flatMap(m => [m.in, m.out])));
  const slot = plotW / Math.max(1, months.length);
  const bar = Math.min(18, (slot - 14) / 2);
  const y = (v: number) => 4 + (1 - v / max) * (H - 4);
  const sel = months.find(m => m.key === selected) ?? months[months.length - 1];
  const pick = (e: GestureResponderEvent) => {
    const i = Math.floor((e.nativeEvent.locationX - AXIS_W) / slot);
    const m = months[Math.max(0, Math.min(months.length - 1, i))];
    if (m) onSelect(m.key);
  };

  return (
    <View style={{ gap: S.md }}>
      <Legend items={[{ label: 'Money in', color: pal.data[0] }, { label: 'Money out', color: pal.data[1] }]} />
      {sel ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md }}>
          <T v="small" color={pal.muted}>{sel.label}</T>
          <T v="small" tabular>In {money(sel.in, { whole: true })}</T>
          <T v="small" tabular>Out {money(sel.out, { whole: true })}</T>
        </View>
      ) : null}
      <View onLayout={onLayout} onStartShouldSetResponder={() => true} onResponderGrant={pick}
        accessible accessibilityLabel={months.map(m => `${m.label}: in ${money(m.in, { whole: true })}, out ${money(m.out, { whole: true })}`).join('. ')}>
        <Svg width={width} height={H + X_AXIS_H}>
          {[0, max / 2, max].map(v => <Line key={v} x1={AXIS_W} x2={width} y1={y(v)} y2={y(v)} stroke={pal.grid} strokeWidth={1} />)}
          {[0, max / 2, max].map(v => (
            <SvgText key={`t${v}`} x={AXIS_W - 8} y={y(v) + 4} fontSize={11} fontFamily={CHART_FONT} fill={pal.muted} textAnchor="end">{compact(v)}</SvgText>
          ))}
          {months.map((m, i) => {
            const cx = AXIS_W + slot * i + slot / 2;
            const on = m.key === sel?.key;
            return (
              <G key={m.key}>
                {on ? <Rect x={AXIS_W + slot * i + 2} y={0} width={slot - 4} height={H + X_AXIS_H} rx={8} fill={pal.sunken} /> : null}
                <Path d={barPath(cx - bar - 1, y(m.in), bar, y(0))} fill={pal.data[0]} />
                <Path d={barPath(cx + 1, y(m.out), bar, y(0))} fill={pal.data[1]} />
                <SvgText x={cx} y={H + 16} fontSize={11} fontFamily={CHART_FONT} fontWeight={on ? '700' : '400'} fill={on ? pal.ink : pal.muted} textAnchor="middle">{m.label}</SvgText>
              </G>
            );
          })}
          <Line x1={AXIS_W} x2={width} y1={y(0)} y2={y(0)} stroke={pal.line} strokeWidth={1} />
        </Svg>
      </View>
    </View>
  );
}
