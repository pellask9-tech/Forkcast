import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { NutritionLabel } from '@/components/NutritionLabel';
import { AppHeader, Screen } from '@/components/Screen';
import { Btn, MacroLine, NoteBox, SectionRule, T } from '@/components/ui';
import { qtyText } from '@/lib/foods';
import { computeTargets, fmt, fmtW } from '@/lib/nutrition';
import { buildPlan, ensurePicks, pickTemplate, planSlots } from '@/lib/plan';
import { addEntries, setPicks, todayStr, useAppState } from '@/lib/store';
import { goalColor, usePalette } from '@/theme';

export default function PlanScreen() {
  const pal = usePalette();
  const app = useAppState();
  const [logged, setLogged] = useState<string | null>(null);
  const profile = app.profile;

  // Pick a meal for every slot (and replace any that no longer fit the diet or calorie level).
  const picks = useMemo(() => {
    if (!profile) return null;
    return ensurePicks(app.picks, computeTargets(profile).kcal, profile.diet);
  }, [profile, app.picks]);

  useEffect(() => {
    if (picks && picks !== app.picks) setPicks(picks);
  }, [picks, app.picks]);

  if (!profile || !picks) {
    return (
      <Screen>
        <AppHeader />
        <T v="title">Your meal plan starts with your BMI</T>
        <T color={pal.muted} style={{ marginTop: 10, marginBottom: 18 }}>
          Enter your height, weight and goal. The plan sizes every meal to your calorie and protein targets for cutting or bulking.
        </T>
        <Btn title="Set up body stats" style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/body')} />
      </Screen>
    );
  }

  const plan = buildPlan(profile, picks);
  const { T: tg } = plan;
  const color = goalColor(pal, profile.goal);
  const title = tg.mode === 'cut' ? 'Your cutting day' : tg.mode === 'bulk' ? 'Your bulking day' : 'Your maintenance day';
  const weekly = Math.abs(tg.weekly) < 0.05 ? 'holding your weight steady' : `about ${fmtW(Math.abs(tg.weekly), profile.units)} ${tg.weekly < 0 ? 'lost' : 'gained'} per week`;

  const swap = (key: string) => {
    const sl = planSlots(tg.kcal).find(s => s.key === key)!;
    setPicks({ ...picks, [key]: pickTemplate(sl.kind, profile.diet, Object.values(picks)) });
  };
  const logMeal = (key: string) => {
    const m = plan.meals.find(x => x.slot.key === key);
    if (!m) return;
    addEntries(todayStr(), m.items.map(it => ({ fid: it.f.id, name: it.f.name, unit: it.f.unit, n: it.f.n.slice(), s: +it.s.toFixed(3), slot: m.slot.log, via: 'plan' as const })));
    setLogged(key);
    setTimeout(() => setLogged(null), 1800);
  };

  return (
    <Screen>
      <AppHeader />
      <T v="title">{title}</T>
      <T style={{ marginTop: 10 }}>{tg.summary}</T>
      <T style={{ marginTop: 8 }}>
        The plan targets <T v="label">{fmt(tg.kcal)} kcal</T> with <T v="label">{fmt(tg.protein)} g protein</T>, {fmt(tg.carbs)} g carbs and {fmt(tg.fat)} g fat, {weekly}.
      </T>
      {tg.notes.length ? (
        <View style={{ gap: 8, marginTop: 14 }}>
          {tg.notes.map((n, i) => <NoteBox key={i} text={n.text} warn={n.warn} color={color} />)}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <Btn title="Shuffle all meals" kind="ghost" small onPress={() => setPicks(ensurePicks(null, tg.kcal, profile.diet))} />
        <Btn title="Change goal or diet" kind="ghost" small onPress={() => router.navigate('/body')} />
      </View>

      {plan.meals.map(m => (
        <View key={m.slot.key}>
          <SectionRule />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T v="small" color={pal.muted}>{m.slot.label}</T>
              <T v="h3">{m.tpl.name}</T>
            </View>
            <T v="label">{fmt(m.tot[0])} kcal</T>
          </View>
          <View style={{ marginTop: 6 }}>
            {m.items.map(it => (
              <View key={it.f.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: pal.line }}>
                <View style={{ flex: 1 }}>
                  <T>{it.f.name}</T>
                  <T v="small" color={pal.muted}>{qtyText(it.f.unit, it.s)}</T>
                </View>
                <T v="small" color={pal.muted}>{fmt(it.f.n[0] * it.s)} kcal</T>
              </View>
            ))}
          </View>
          <MacroLine p={m.tot[1]} c={m.tot[2]} f={m.tot[3]} style={{ marginTop: 10, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn title={logged === m.slot.key ? 'Logged' : 'Log to today'} small disabled={logged === m.slot.key} onPress={() => logMeal(m.slot.key)} />
            <Btn title="Swap meal" kind="ghost" small onPress={() => swap(m.slot.key)} />
          </View>
        </View>
      ))}

      <View style={{ marginTop: 30 }}>
        <NutritionLabel
          tot={plan.day}
          T={tg}
          sub={`Plan total, ${plan.meals.length} meals`}
          goalColor={color}
          footnote="Portions snap to easy amounts (half cups, whole eggs), so totals land close to target rather than exactly on it."
        />
      </View>
    </Screen>
  );
}
