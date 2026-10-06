import { Text, View } from 'react-native';

import { IDX } from '@/lib/foods';
import { MICROS, Targets, fmt, fmtG } from '@/lib/nutrition';
import { F, usePalette } from '@/theme';

type RowOpts = { sub?: boolean; limit?: boolean; bar?: string; showTarget?: boolean };

function Row({ name, bold, val, unit, target, o = {} }: { name: string; bold?: boolean; val: number; unit: string; target?: number | null; o?: RowOpts }) {
  const pal = usePalette();
  const pct = target ? Math.round((val / target) * 100) : null;
  const warn = o.limit && pct != null && pct > 100;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: pal.ink, paddingVertical: 4, paddingLeft: o.sub ? 16 : 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: pal.ink, fontVariant: ['tabular-nums'] }}>
          <Text style={{ fontFamily: bold ? F.xbold : F.regular }}>{name}</Text> {fmtG(val)} {unit}
          {target && o.showTarget ? <Text style={{ color: pal.muted, fontSize: 13 }}>{`  / ${fmt(target)} ${unit}${o.limit ? ' max' : ''}`}</Text> : null}
        </Text>
        <Text style={{ fontFamily: F.xbold, fontSize: 15, color: warn ? pal.danger : pal.ink, fontVariant: ['tabular-nums'] }}>{pct != null ? `${pct}%` : ''}</Text>
      </View>
      {o.bar && target ? (
        <View style={{ height: 4, backgroundColor: pal.soft, marginTop: 4 }}>
          <View style={{ height: 4, width: `${Math.min(100, pct ?? 0)}%`, backgroundColor: o.bar }} />
        </View>
      ) : null}
    </View>
  );
}

export function NutritionLabel({ tot, T, sub, goalColor, footnote }: { tot: number[]; T: Targets | null; sub: string; goalColor: string; footnote?: string }) {
  const pal = usePalette();
  const left = T ? T.kcal - tot[0] : 0;
  return (
    <View style={{ backgroundColor: pal.surface, borderWidth: 1.5, borderColor: pal.ink, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
      <Text style={{ fontFamily: F.black, fontSize: 38, lineHeight: 40, letterSpacing: -1, color: pal.ink }}>Nutrition Facts</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 14, color: pal.ink, marginTop: 2 }}>{sub}</Text>
      <View style={{ height: 10, backgroundColor: pal.ink, marginVertical: 5 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: F.black, fontSize: 28, color: pal.ink }}>Calories</Text>
        <Text style={{ fontFamily: F.black, fontSize: 48, lineHeight: 50, letterSpacing: -1.5, color: pal.ink, fontVariant: ['tabular-nums'] }}>{fmt(tot[0])}</Text>
      </View>
      {T ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 5 }}>
            <Text style={{ fontFamily: F.regular, fontSize: 14, color: pal.ink }}>
              <Text style={{ fontFamily: F.xbold }}>{fmt(Math.abs(left))}</Text> {left >= 0 ? 'left' : 'over'}
            </Text>
            <Text style={{ fontFamily: F.regular, fontSize: 14, color: pal.ink }}>target {fmt(T.kcal)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: pal.soft }}>
            <View style={{ height: 8, width: `${Math.min(100, (tot[0] / T.kcal) * 100)}%`, backgroundColor: left < 0 ? pal.danger : goalColor }} />
          </View>
        </>
      ) : null}
      <View style={{ height: 5, backgroundColor: pal.ink, marginTop: 8, marginBottom: 2 }} />
      <Text style={{ fontFamily: F.xbold, fontSize: 12, color: pal.ink, textAlign: 'right', marginBottom: 2 }}>{T ? '% of your target' : ' '}</Text>
      <Row name="Total fat" bold val={tot[IDX.f]} unit="g" target={T?.fat} o={{ bar: pal.fat, showTarget: true }} />
      <Row name="Saturated fat" val={tot[IDX.sat]} unit="g" target={T?.satLimit} o={{ sub: true, limit: true, showTarget: true }} />
      <Row name="Sodium" bold val={tot[IDX.na]} unit="mg" target={T ? 2300 : null} o={{ limit: true, showTarget: true }} />
      <Row name="Total carbohydrate" bold val={tot[IDX.c]} unit="g" target={T?.carbs} o={{ bar: pal.carb, showTarget: true }} />
      <Row name="Dietary fiber" val={tot[IDX.fib]} unit="g" target={T?.fiber} o={{ sub: true, showTarget: true }} />
      <Row name="Total sugars" val={tot[IDX.sug]} unit="g" o={{ sub: true }} />
      <Row name="Protein" bold val={tot[IDX.p]} unit="g" target={T?.protein} o={{ bar: pal.protein, showTarget: true }} />
      <View style={{ height: 10, backgroundColor: pal.ink, marginVertical: 3 }} />
      {MICROS.map(([k, name, unit]) => (
        <Row key={k} name={name} val={tot[IDX[k]]} unit={unit} target={T ? T.micro[k] : null} />
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: pal.ink, marginTop: 4, paddingTop: 6 }}>
        <Text style={{ fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: pal.ink }}>
          {footnote ?? (T ? 'Percentages compare against your targets and the daily needs for your age and sex. Food values are approximate.' : 'Set up your body stats to see targets. Food values are approximate.')}
        </Text>
      </View>
    </View>
  );
}
