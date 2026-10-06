import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, Chip, Field, MacroLine, Stepper, T } from '@/components/ui';
import { FOODS, Food, emptyNutrients, qtyShort, qtyText } from '@/lib/foods';
import { fmt } from '@/lib/nutrition';
import { SLOTS, SlotKey, addCustomFood, addEntries, defaultSlot, todayStr, uid, useAppState } from '@/lib/store';
import { F, usePalette } from '@/theme';

export default function AddFoodScreen() {
  const pal = usePalette();
  const app = useAppState();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = params.date || todayStr();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Food | null>(null);
  const [s, setS] = useState(1);
  const [slot, setSlot] = useState<SlotKey>(SLOTS.some(x => x[0] === params.slot) ? (params.slot as SlotKey) : defaultSlot());
  const [custom, setCustom] = useState(false);
  const [cf, setCf] = useState({ name: '', label: '', kcal: '', p: '', c: '', f: '', fib: '', sug: '', na: '' });

  const all = useMemo(() => FOODS.concat(app.customFoods), [app.customFoods]);
  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return app.customFoods.slice(-5).reverse().concat(FOODS.filter(f => ['rice', 'egg', 'chicken', 'banana', 'adobo', 'oats'].includes(f.id)));
    const toks = query.split(/\s+/);
    return all
      .filter(f => { const hay = `${f.name} ${f.alias}`.toLowerCase(); return toks.every(t => hay.includes(t)); })
      .sort((a, b) => Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query)))
      .slice(0, 20);
  }, [q, all, app.customFoods]);

  const add = () => {
    if (!sel) return;
    addEntries(date, [{ fid: sel.id, name: sel.name, unit: sel.unit, n: sel.n.slice(), s, slot, via: 'search' }]);
    router.back();
  };

  const saveCustom = () => {
    const num = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
    if (!cf.name.trim() || !cf.kcal) return;
    const n = emptyNutrients();
    n[0] = num(cf.kcal); n[1] = num(cf.p); n[2] = num(cf.c); n[3] = num(cf.f); n[4] = num(cf.fib); n[5] = num(cf.sug); n[7] = num(cf.na);
    const f: Food = { id: 'c_' + uid(), name: cf.name.trim().slice(0, 60), alias: 'custom', type: 'plant', unit: { kind: 'custom', label: cf.label.trim() || '1 serving' }, n, step: 0.25, max: 20, custom: true };
    addCustomFood(f);
    setCustom(false);
    setCf({ name: '', label: '', kcal: '', p: '', c: '', f: '', fib: '', sug: '', na: '' });
    setSel(f);
    setS(1);
  };

  if (sel) {
    const n = sel.n.map(v => v * s);
    return (
      <Screen modal>
        <Pressable onPress={() => setSel(null)} accessibilityRole="button" style={{ marginBottom: 14 }}>
          <T v="label" color={pal.muted}>‹ Back to search</T>
        </Pressable>
        <T v="h2">{sel.name}</T>
        <T v="small" color={pal.muted} style={{ marginTop: 3, marginBottom: 16 }}>
          {sel.unit.kind === 'custom' ? `One serving is ${sel.unit.label}` : sel.unit.kind === 'std' && sel.unit.u[0] !== 'g' ? `1 ${sel.unit.u[0]} is about ${Math.round(sel.unit.g / sel.unit.n)} g` : 'Weighed cooked, unless it says dry'}
        </T>
        <Stepper label={qtyShort(sel.unit, s)} minusDisabled={s <= sel.step + 1e-9}
          onMinus={() => setS(v => Math.max(sel.step, +(v - sel.step).toFixed(3)))}
          onPlus={() => setS(v => Math.min(20, +(v + sel.step).toFixed(3)))} />
        <T v="h3" style={{ marginTop: 18 }}>{fmt(n[0])} kcal</T>
        <MacroLine p={n[1]} c={n[2]} f={n[3]} style={{ marginTop: 6 }} />
        <T v="label" style={{ marginTop: 22, marginBottom: 8 }}>Meal</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SLOTS.map(([k, l]) => <Chip key={k} label={l} selected={k === slot} onPress={() => setSlot(k)} />)}
        </View>
        <Btn title="Add to log" style={{ marginTop: 26 }} onPress={add} />
      </Screen>
    );
  }

  return (
    <Screen modal>
      <T v="h2" style={{ marginBottom: 12 }}>Log food</T>
      <TextInput
        autoFocus
        value={q}
        onChangeText={setQ}
        placeholder="Search: rice, bangus, eggs, oats…"
        placeholderTextColor={pal.muted}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{ fontFamily: F.medium, fontSize: 17, color: pal.ink, backgroundColor: pal.surface, borderWidth: 1.5, borderColor: pal.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14 }}
      />
      {!q.trim() ? <T v="tiny" color={pal.muted} style={{ marginTop: 12 }}>Common picks</T> : null}
      <View style={{ marginTop: 6 }}>
        {hits.length ? hits.map(f => (
          <Pressable key={f.id} onPress={() => { setSel(f); setS(1); }} accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: pal.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flex: 1 }}>
              <T>{f.name}</T>
              <T v="small" color={pal.muted}>{qtyText(f.unit, 1)}</T>
            </View>
            <T v="label">{fmt(f.n[0])} kcal</T>
          </Pressable>
        )) : <T color={pal.muted} style={{ marginTop: 12 }}>No match. Add it as your own food below.</T>}
      </View>

      <View style={{ marginTop: 24 }}>
        {!custom ? (
          <Btn title="Add a food that isn't listed" kind="ghost" onPress={() => setCustom(true)} />
        ) : (
          <View style={{ gap: 10 }}>
            <T v="h3">Your own food</T>
            <T v="small" color={pal.muted}>Copy the numbers from the package label. Saved foods show up in search.</T>
            <Field label="Food name" value={cf.name} onChangeText={t => setCf({ ...cf, name: t })} placeholder="e.g. Beef caldereta" />
            <Field label="One serving is" value={cf.label} onChangeText={t => setCf({ ...cf, label: t })} placeholder="e.g. 1 cup, 1 plate" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Calories" keyboardType="number-pad" value={cf.kcal} onChangeText={t => setCf({ ...cf, kcal: t })} />
              <Field label="Protein" suffix="g" keyboardType="decimal-pad" value={cf.p} onChangeText={t => setCf({ ...cf, p: t })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Carbs" suffix="g" keyboardType="decimal-pad" value={cf.c} onChangeText={t => setCf({ ...cf, c: t })} />
              <Field label="Fat" suffix="g" keyboardType="decimal-pad" value={cf.f} onChangeText={t => setCf({ ...cf, f: t })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Fiber" suffix="g" keyboardType="decimal-pad" value={cf.fib} onChangeText={t => setCf({ ...cf, fib: t })} />
              <Field label="Sugars" suffix="g" keyboardType="decimal-pad" value={cf.sug} onChangeText={t => setCf({ ...cf, sug: t })} />
              <Field label="Sodium" suffix="mg" keyboardType="number-pad" value={cf.na} onChangeText={t => setCf({ ...cf, na: t })} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Btn title="Save food" onPress={saveCustom} disabled={!cf.name.trim() || !cf.kcal} />
              <Btn title="Cancel" kind="ghost" onPress={() => setCustom(false)} />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
