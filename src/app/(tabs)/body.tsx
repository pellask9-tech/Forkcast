import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BodyCheckResult, StatusPill } from '@/components/BodyCheckResult';
import { AppHeader, Screen } from '@/components/Screen';
import { AI_FEATURES, PAYWALL } from '@/config';
import { Btn, Field, NoteBox, SectionRule, Segmented, T } from '@/components/ui';
import {
  ACTIVITY, Cutoffs, DIETS, Diet, Goal, LB, Pace, Profile, Sex, Units,
  clamp, computeTargets, fmt, fmt1, fmtW, fmtWr, modeWord, validateProfile,
} from '@/lib/nutrition';
import { logWeight, parseD, saveProfile, useAppState } from '@/lib/store';
import { IS_TEST_STORE, resetTestPurchase } from '@/lib/subscription';
import { F, Palette, usePalette } from '@/theme';

interface Draft {
  goal: Goal; pace: Pace; sex?: Sex; units: Units; activity: number; diet: Diet; cutoffs: Cutoffs;
  age: string; cm: string; kg: string; ft: string; inch: string; lb: string;
}

function draftFrom(p: Profile | null): Draft {
  if (!p) return { goal: 'cut', pace: 'standard', units: 'metric', activity: 1.55, diet: 'any', cutoffs: 'who', age: '', cm: '', kg: '', ft: '', inch: '', lb: '' };
  const inches = p.heightCm / 2.54;
  let ft = Math.floor(inches / 12);
  let inch = Math.round(inches - ft * 12);
  if (inch === 12) { ft++; inch = 0; }
  return {
    goal: p.goal, pace: p.pace, sex: p.sex, units: p.units, activity: p.activity, diet: p.diet, cutoffs: p.cutoffs,
    age: String(p.age), cm: String(Math.round(p.heightCm)), kg: String(Math.round(p.weightKg * 10) / 10),
    ft: String(ft), inch: String(inch), lb: String(Math.round((p.weightKg / LB) * 10) / 10),
  };
}

function profileFrom(d: Draft): Partial<Profile> {
  const num = (s: string) => parseFloat(s.replace(',', '.'));
  const heightCm = d.units === 'imperial' ? ((num(d.ft) || 0) * 12 + (num(d.inch) || 0)) * 2.54 : num(d.cm);
  const weightKg = d.units === 'imperial' ? num(d.lb) * LB : num(d.kg);
  return { sex: d.sex, age: parseInt(d.age, 10), heightCm, weightKg, activity: d.activity, goal: d.goal, pace: d.pace, diet: d.diet, cutoffs: d.cutoffs, units: d.units };
}

export default function BodyScreen() {
  const pal = usePalette();
  const app = useAppState();
  const [d, setD] = useState<Draft>(() => draftFrom(app.profile));
  const [weightIn, setWeightIn] = useState('');
  const [showCheck, setShowCheck] = useState(false);
  const latest = app.bodyChecks[app.bodyChecks.length - 1];
  const candidate = useMemo(() => profileFrom(d), [d]);
  const error = validateProfile(candidate);

  // Save automatically once the form is valid
  useEffect(() => {
    if (error) return;
    const t = setTimeout(() => saveProfile(candidate as Profile), 350);
    return () => clearTimeout(t);
  }, [candidate, error]);

  const up = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));
  const setUnits = (u: Units) => {
    if (u === d.units) return;
    const p = profileFrom(d);
    const patch: Partial<Draft> = { units: u };
    if (p.heightCm && Number.isFinite(p.heightCm)) {
      const inches = p.heightCm / 2.54;
      let ft = Math.floor(inches / 12);
      let inch = Math.round(inches - ft * 12);
      if (inch === 12) { ft++; inch = 0; }
      Object.assign(patch, { cm: String(Math.round(p.heightCm)), ft: String(ft), inch: String(inch) });
    }
    if (p.weightKg && Number.isFinite(p.weightKg)) {
      Object.assign(patch, { kg: String(Math.round(p.weightKg * 10) / 10), lb: String(Math.round((p.weightKg / LB) * 10) / 10) });
    }
    up(patch);
  };

  const bulk = d.goal === 'bulk';
  const paceHints = bulk
    ? { gentle: 'About 8% above maintenance. Slowest gain, least fat.', standard: 'About 12% above maintenance.', fast: 'About 15% above maintenance, capped at +500 kcal.' }
    : { gentle: 'About 12% below maintenance. The easiest to stick with.', standard: 'About 20% below maintenance.', fast: 'About 25% below maintenance, capped at −1,000 kcal. Only used at BMI 25 and up.' };

  const saved = !error ? (candidate as Profile) : null;
  const T_ = saved ? computeTargets(saved) : null;

  const logW = () => {
    const v = parseFloat(weightIn.replace(',', '.'));
    if (!v || !app.profile) return;
    const kg = app.profile.units === 'imperial' ? v * LB : v;
    if (kg < 30 || kg > 300) return;
    logWeight(kg);
    setD(prev => ({ ...prev, kg: String(Math.round(kg * 10) / 10), lb: String(Math.round((kg / LB) * 10) / 10) }));
    setWeightIn('');
  };

  return (
    <Screen>
      <AppHeader />
      {!app.profile ? (
        <View style={{ marginBottom: 20 }}>
          <T v="title">Your body, your numbers</T>
          <T color={pal.muted} style={{ marginTop: 8 }}>Your BMI, body stats and goal set your calorie target, macros and meal plan. Everything saves as you go.</T>
        </View>
      ) : null}

      <T v="label" style={{ marginBottom: 8 }}>Goal</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <GoalCard pal={pal} label="Cut" hint="Lose fat, keep muscle" color={pal.cut} selected={d.goal === 'cut'} onPress={() => up({ goal: 'cut' })} />
        <GoalCard pal={pal} label="Bulk" hint="Gain muscle and size" color={pal.bulk} selected={d.goal === 'bulk'} onPress={() => up({ goal: 'bulk' })} />
      </View>

      <Group label="Pace">
        <Segmented<Pace> value={d.pace} onChange={v => up({ pace: v })} options={[{ value: 'gentle', label: bulk ? 'Lean' : 'Gentle' }, { value: 'standard', label: 'Standard' }, { value: 'fast', label: 'Fast' }]} />
        <T v="small" color={pal.muted} style={{ marginTop: 6 }}>{paceHints[d.pace]}</T>
      </Group>

      <Group label="Sex (used by the calorie formula)">
        <Segmented<Sex> value={d.sex} onChange={v => up({ sex: v })} options={[{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }]} />
      </Group>

      <Group label="Units">
        <Segmented<Units> value={d.units} onChange={setUnits} options={[{ value: 'metric', label: 'kg, cm' }, { value: 'imperial', label: 'lb, ft' }]} />
      </Group>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <Field label="Age" suffix="yrs" keyboardType="number-pad" value={d.age} onChangeText={t => up({ age: t })} placeholder="25" maxLength={3} />
        {d.units === 'metric' ? (
          <>
            <Field label="Height" suffix="cm" keyboardType="decimal-pad" value={d.cm} onChangeText={t => up({ cm: t })} placeholder="170" maxLength={5} />
            <Field label="Weight" suffix="kg" keyboardType="decimal-pad" value={d.kg} onChangeText={t => up({ kg: t })} placeholder="70" maxLength={5} />
          </>
        ) : (
          <>
            <Field label="Height" suffix="ft" keyboardType="number-pad" value={d.ft} onChangeText={t => up({ ft: t })} placeholder="5" maxLength={1} />
            <Field label=" " suffix="in" keyboardType="number-pad" value={d.inch} onChangeText={t => up({ inch: t })} placeholder="7" maxLength={2} accessibilityLabel="Height, inches" />
          </>
        )}
      </View>
      {d.units === 'imperial' ? (
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Field label="Weight" suffix="lb" keyboardType="decimal-pad" value={d.lb} onChangeText={t => up({ lb: t })} placeholder="154" maxLength={5} style={{ maxWidth: 160 }} />
        </View>
      ) : null}
      <T v="tiny" color={pal.muted} style={{ marginTop: 6 }}>Built for adults 18 and over. Teens use BMI-for-age charts instead.</T>

      <Group label="Activity">
        <View style={{ gap: 8 }}>
          {ACTIVITY.map(a => {
            const sel = a.value === d.activity;
            return (
              <Pressable key={a.value} onPress={() => up({ activity: a.value })} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                style={{ borderWidth: 1.5, borderColor: sel ? pal.ink : pal.line, backgroundColor: sel ? pal.ink : pal.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: sel ? pal.paper : pal.ink }}>{a.label}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 13, color: sel ? pal.paper : pal.muted }}>{a.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      </Group>

      <Group label="What you eat">
        <Segmented<Diet> value={d.diet} onChange={v => up({ diet: v })} options={DIETS} />
      </Group>

      <Group label="BMI categories">
        <Segmented<Cutoffs> value={d.cutoffs} onChange={v => up({ cutoffs: v })} options={[{ value: 'who', label: 'Standard (WHO)' }, { value: 'asia', label: 'Asia-Pacific' }]} />
        <T v="small" color={pal.muted} style={{ marginTop: 6 }}>Asia-Pacific cutoffs start overweight at 23 and obese at 25, since health risk rises at a lower BMI in many Asian populations.</T>
      </Group>

      <SectionRule />
      {!T_ ? (
        <View style={{ paddingVertical: 12 }}>
          <T v="h2">Your BMI shows up here</T>
          <T color={pal.muted} style={{ marginTop: 6 }}>{error}</T>
        </View>
      ) : (
        <Results pal={pal} p={saved!} tg={T_} />
      )}

      {app.profile ? (
        <>
          {AI_FEATURES ? (
            <>
          <SectionRule />
          <T v="h2">Body check</T>
          {latest ? (
            <View style={{ marginTop: 8 }}>
              <T v="small" color={pal.muted}>Last check: {parseD(latest.d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {latest.groups.filter(g => g.status === 'needs_work' || g.status === 'strong').map(g => (
                  <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T v="small">{g.name}</T>
                    <StatusPill status={g.status} />
                  </View>
                ))}
              </View>
              <Pressable onPress={() => setShowCheck(v => !v)} accessibilityRole="button" style={{ paddingVertical: 10 }}>
                <T v="label" color={pal.muted}>{showCheck ? 'Hide full result' : 'Show full result and exercises'}</T>
              </Pressable>
              {showCheck ? <BodyCheckResult check={latest} /> : null}
            </View>
          ) : (
            <T color={pal.muted} style={{ marginTop: 6 }}>Take a photo of yourself to see which muscle groups to train more, with exercises for your goal.</T>
          )}
          <Btn title={latest ? 'New body check' : 'Start a body check'} style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/body-check')} />

            </>
          ) : null}

          <SectionRule />
          <T v="h2">Weight log</T>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 10 }}>
            <Field label="Today's weight" suffix={app.profile.units === 'imperial' ? 'lb' : 'kg'} keyboardType="decimal-pad" value={weightIn} onChangeText={setWeightIn}
              placeholder={fmt1(app.profile.units === 'imperial' ? app.profile.weightKg / LB : app.profile.weightKg)} style={{ maxWidth: 170 }} onSubmitEditing={logW} />
            <Btn title="Log weight" onPress={logW} />
          </View>
          <T v="small" color={pal.muted} style={{ marginTop: 8 }}>Logging updates your BMI, targets and meal plan. Weigh at the same time each morning for the cleanest trend.</T>
          <Sparkline pal={pal} values={app.weights.slice(-30).map(w => w.kg)} />
          {app.weights.slice(-5).reverse().map(w => (
            <View key={w.d} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: pal.line }}>
              <T v="small">{parseD(w.d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</T>
              <T v="small">{fmtW(w.kg, app.profile!.units)}</T>
            </View>
          ))}

          {PAYWALL ? (
            <>
          <SectionRule />
          <T v="h2">Forkcast Pro</T>
          <T color={pal.muted} style={{ marginTop: 6, marginBottom: 12 }}>
            {app.pro ? `You're on Pro (${app.proPlan === 'pro_yearly' ? 'yearly' : 'monthly'}). Unlimited meal scans and body checks.` : 'Unlimited meal scans and body checks.'}
          </T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {!app.pro ? <Btn title="See Pro plans" onPress={() => router.push('/paywall')} /> : null}
            {app.pro && IS_TEST_STORE ? <Btn title="Reset test purchase" kind="ghost" small onPress={resetTestPurchase} /> : null}
          </View>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <T v="label" style={{ marginBottom: 8 }}>{label}</T>
      {children}
    </View>
  );
}

function GoalCard({ pal, label, hint, color, selected, onPress }: { pal: Palette; label: string; hint: string; color: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      style={{ flex: 1, borderWidth: 2, borderColor: selected ? color : pal.line, backgroundColor: selected ? color : pal.surface, borderRadius: 18, padding: 14 }}>
      <Text style={{ fontFamily: F.black, fontSize: 34, letterSpacing: -1, color: selected ? pal.onGoal : pal.ink }}>{label}</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 13, marginTop: 2, color: selected ? pal.onGoal : pal.muted }}>{hint}</Text>
    </Pressable>
  );
}

function Results({ pal, p, tg }: { pal: Palette; p: Profile; tg: ReturnType<typeof computeTargets> }) {
  const lo = 15, hi = 40, span = hi - lo;
  const b = tg.info.bands;
  const pos = (x: number) => clamp(((x - lo) / span) * 100, 0, 100);
  const bands: [number, number, string, string][] = [
    [lo, b[0], pal.bandUnder, 'Under'], [b[0], b[1], pal.bandOk, 'Healthy'], [b[1], b[2], pal.bandOver, 'Over'], [b[2], hi, pal.bandObese, 'Obese'],
  ];
  const weekly = Math.abs(tg.weekly) < 0.05 ? 'Steady' : `${tg.weekly < 0 ? '−' : '+'}${fmtW(Math.abs(tg.weekly), p.units)}`;
  const stats: [string, string][] = [
    ['Maintenance', `${fmt(tg.tdee)} kcal`], [`Daily target (${modeWord(tg.mode)})`, `${fmt(tg.kcal)} kcal`],
    ['Protein', `${fmt(tg.protein)} g`], ['Carbs', `${fmt(tg.carbs)} g`],
    ['Fat', `${fmt(tg.fat)} g`], ['Fiber', `${fmt(tg.fiber)} g`],
    ['Expected change', Math.abs(tg.weekly) < 0.05 ? weekly : `${weekly} / week`], ['Resting burn (BMR)', `${fmt(tg.bmr)} kcal`],
  ];
  return (
    <View>
      <Text style={{ fontFamily: F.black, fontSize: 72, lineHeight: 74, letterSpacing: -2.5, color: pal.ink }}>{tg.bmi.toFixed(1)}</Text>
      <T v="h3">BMI: {tg.info.label}</T>
      <T v="small" color={pal.muted} style={{ marginTop: 2 }}>
        {p.cutoffs === 'asia' ? 'Asia-Pacific' : 'WHO'} categories. Healthy weight for your height: {fmtWr(tg.healthyLo, tg.healthyHi, p.units)}.
      </T>
      <View style={{ marginTop: 20, height: 14, flexDirection: 'row' }} accessibilityLabel={`BMI ${tg.bmi.toFixed(1)} on a scale from ${lo} to ${hi}`}>
        {bands.map(([a, z, c]) => <View key={a} style={{ width: `${((z - a) / span) * 100}%`, backgroundColor: c }} />)}
        <View style={{ position: 'absolute', left: `${pos(tg.bmi)}%`, top: -9, width: 4, height: 32, marginLeft: -2, borderRadius: 2, backgroundColor: pal.ink }} />
      </View>
      <View style={{ height: 40, marginTop: 4 }}>
        {b.map(x => <Text key={x} style={{ position: 'absolute', left: `${pos(x)}%`, marginLeft: -12, fontFamily: F.regular, fontSize: 11, color: pal.muted }}>{x}</Text>)}
        {bands.map(([a, z, , n]) => (
          <Text key={n} style={{ position: 'absolute', top: 17, left: `${(pos(a) + pos(z)) / 2}%`, marginLeft: -20, width: 40, textAlign: 'center', fontFamily: F.semibold, fontSize: 11, color: pal.ink }}>{n}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 2, borderTopColor: pal.ink, marginTop: 8 }}>
        {stats.map(([k, v]) => (
          <View key={k} style={{ width: '50%', paddingVertical: 9, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: pal.line }}>
            <T v="tiny" color={pal.muted}>{k}</T>
            <T v="h3">{v}</T>
          </View>
        ))}
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        <NoteBox text={tg.summary} color={p.goal === 'bulk' ? pal.bulk : pal.cut} />
        {tg.notes.map((n, i) => <NoteBox key={i} text={n.text} warn={n.warn} color={p.goal === 'bulk' ? pal.bulk : pal.cut} />)}
      </View>
      <T v="small" color={pal.muted} style={{ marginTop: 12 }}>
        BMI doesn’t separate muscle from fat, so very muscular people can read as overweight. Use it with your waist size and how your clothes fit.
      </T>
    </View>
  );
}

function Sparkline({ pal, values }: { pal: Palette; values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 3, marginTop: 14, marginBottom: 6 }} accessibilityLabel="Weight trend">
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, height: 8 + ((v - min) / range) * 52, backgroundColor: i === values.length - 1 ? pal.ink : pal.line, borderRadius: 2 }} />
      ))}
    </View>
  );
}
