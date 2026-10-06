import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LevelCard, LevelUp } from '@/components/Level';
import { AI_FEATURES, PAYWALL } from '@/config';
import { NutritionLabel } from '@/components/NutritionLabel';
import { Screen } from '@/components/Screen';
import { T } from '@/components/ui';
import { emptyNutrients, qtyText } from '@/lib/foods';
import { Targets, computeTargets, fmt, fmt1 } from '@/lib/nutrition';
import { Entry, GLASS_ML, SLOTS, addWater, logStreak, parseD, removeEntry, setSeenLevel, shiftD, todayStr, useAppState, waterGoal } from '@/lib/store';
import { dayChecklist, earned, levelFor, totalXp } from '@/lib/xp';
import { FREE_SCANS_PER_DAY, bodyCheckWaitDays, scansLeftToday } from '@/lib/subscription';
import { F, Palette, goalColor, useIsDark, usePalette } from '@/theme';

function totals(entries: Entry[]) {
  const t = emptyNutrients();
  entries.forEach(e => e.n.forEach((v, i) => { t[i] += (v || 0) * e.s; }));
  return t;
}

export default function TodayScreen() {
  const pal = usePalette();
  const app = useAppState();
  const [date, setDate] = useState(todayStr());
  const [showLabel, setShowLabel] = useState(false);
  const entries = app.logs[date] ?? [];
  const targets = app.profile ? computeTargets(app.profile) : null;
  const tot = totals(entries);
  const isToday = date === todayStr();
  const d = parseD(date);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const color = goalColor(pal, app.profile?.goal);
  const streak = logStreak(app.logs);
  const scansLeft = scansLeftToday();
  const bodyWait = bodyCheckWaitDays();
  const level = levelFor(useMemo(() => totalXp(app), [app]).total);
  const xpToday = earned(dayChecklist(app, todayStr()));
  // First run after this update: start from the current level instead of celebrating old ones.
  useEffect(() => { if (app.seenLevel === 0) setSeenLevel(level.level); }, [app.seenLevel, level.level]);
  const levelledUp = app.seenLevel > 0 && level.level > app.seenLevel;

  const confirmRemove = (e: Entry) =>
    Alert.alert('Remove this food?', `${e.name}, ${qtyText(e.unit, e.s)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeEntry(date, e.id) },
    ]);

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontFamily: F.black, fontSize: 24, letterSpacing: -0.6, color: pal.ink, flex: 1 }}>Forkcast</Text>
        {streak > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pal.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }} accessibilityLabel={`${streak} day logging streak`}>
            <Icon name="flame" size={16} color={pal.protein} />
            <Text style={{ fontFamily: F.xbold, fontSize: 14, color: pal.ink }}>{streak} day{streak === 1 ? '' : 's'}</Text>
          </View>
        ) : null}
      </View>

      {/* Date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <T v="title">{isToday ? 'Today' : weekday}</T>
          <T v="small" color={pal.muted}>{isToday ? `${weekday}, ${monthDay}` : monthDay}</T>
        </View>
        <RoundBtn pal={pal} icon="left" label="Previous day" onPress={() => setDate(shiftD(date, -1))} />
        <RoundBtn pal={pal} icon="right" label="Next day" disabled={isToday} onPress={() => setDate(shiftD(date, 1))} />
      </View>

      {/* Level */}
      {levelledUp ? (
        <LevelUp info={level} color={color} onDone={() => setSeenLevel(level.level)} />
      ) : (
        <LevelCard info={level} today={xpToday} color={color} onPress={() => router.push('/levels')} />
      )}

      {/* Dashboard */}
      {targets ? <Dashboard pal={pal} tot={tot} tg={targets} color={color} /> : <SetupCard pal={pal} />}

      {/* Quick actions */}
      {AI_FEATURES ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Tile pal={pal} big color={color} icon="camera" title="Scan meal" sub={!PAYWALL || app.pro ? 'Snap your plate' : `${scansLeft} of ${FREE_SCANS_PER_DAY} free left`}
            onPress={() => router.push({ pathname: '/scan', params: { date } })} />
          <View style={{ flex: 1, gap: 10 }}>
            <Tile pal={pal} icon="search" title="Search food" onPress={() => router.push({ pathname: '/add', params: { date } })} />
            <Tile pal={pal} icon="body" title="Body check" sub={bodyWait === 0 ? 'What to train' : `Free in ${bodyWait}d`} onPress={() => router.push('/body-check')} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Tile pal={pal} big color={color} icon="search" title="Log food" sub="Search or add your own"
            onPress={() => router.push({ pathname: '/add', params: { date } })} />
          <View style={{ flex: 1, gap: 10 }}>
            <Tile pal={pal} icon="plan" title="Meal plan" onPress={() => router.navigate('/plan')} />
            <Tile pal={pal} icon="body" title="Body & BMI" onPress={() => router.navigate('/body')} />
          </View>
        </View>
      )}

      {/* Water */}
      <WaterCard pal={pal} date={date} ml={app.water[date] ?? 0} goal={waterGoal(app.profile?.weightKg)} />

      {/* Meals */}
      {SLOTS.map(([key, label]) => (
        <MealCard key={key} pal={pal} label={label} entries={entries.filter(e => e.slot === key)}
          onAdd={() => router.push({ pathname: '/add', params: { date, slot: key } })} onRemove={confirmRemove} />
      ))}

      {/* Full label */}
      <Pressable onPress={() => setShowLabel(v => !v)} accessibilityRole="button" style={{ marginTop: 22, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="h3">Full nutrition label</T>
        <T v="label" color={pal.muted}>{showLabel ? 'Hide' : 'Show'}</T>
      </Pressable>
      {showLabel ? <NutritionLabel tot={tot} T={targets} sub={`${isToday ? 'Today, ' : ''}${weekday}, ${monthDay}`} goalColor={color} /> : null}
    </Screen>
  );
}

function Dashboard({ pal, tot, tg, color }: { pal: Palette; tot: number[]; tg: Targets; color: string }) {
  const dark = useIsDark();
  const bg = dark ? pal.surface : pal.ink;
  const fg = dark ? pal.ink : pal.paper;
  const dim = dark ? pal.muted : 'rgba(237,241,236,0.62)';
  const track = dark ? pal.soft : 'rgba(237,241,236,0.16)';
  const left = tg.kcal - tot[0];
  const pct = Math.min(1, tot[0] / tg.kcal);
  const macro = (name: string, v: number, t: number, c: string) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: dim }}>{name}</Text>
      <Text style={{ fontFamily: F.xbold, fontSize: 16, color: fg, marginTop: 1 }}>
        {fmt(v)}<Text style={{ fontFamily: F.regular, fontSize: 13, color: dim }}> / {fmt(t)} g</Text>
      </Text>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: track, marginTop: 6, overflow: 'hidden' }}>
        <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, (v / t) * 100)}%`, backgroundColor: c }} />
      </View>
    </View>
  );
  return (
    <View style={{ backgroundColor: bg, borderRadius: 26, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: F.semibold, fontSize: 14, color: dim }}>{left >= 0 ? 'Calories left' : 'Calories over'}</Text>
        <View style={{ backgroundColor: color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontFamily: F.xbold, fontSize: 12, color: pal.onGoal }}>{tg.mode === 'maintain' ? 'Maintaining' : tg.mode === 'cut' ? 'Cutting' : 'Bulking'}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.black, fontSize: 64, lineHeight: 68, letterSpacing: -2.5, color: left < 0 ? pal.danger : fg, marginTop: 4 }} accessibilityLabel={`${fmt(Math.abs(left))} calories ${left >= 0 ? 'left' : 'over'}`}>
        {fmt(Math.abs(left))}
      </Text>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: track, overflow: 'hidden', marginTop: 6 }}>
        <View style={{ height: 10, borderRadius: 5, width: `${pct * 100}%`, backgroundColor: left < 0 ? pal.danger : color }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: dim }}>{fmt(tot[0])} eaten</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 13, color: dim }}>target {fmt(tg.kcal)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
        {macro('Protein', tot[1], tg.protein, pal.protein)}
        {macro('Carbs', tot[2], tg.carbs, pal.carb)}
        {macro('Fat', tot[3], tg.fat, pal.fat)}
      </View>
    </View>
  );
}

function SetupCard({ pal }: { pal: Palette }) {
  return (
    <View style={{ backgroundColor: pal.ink, borderRadius: 26, padding: 20, gap: 8 }}>
      <Text style={{ fontFamily: F.black, fontSize: 26, lineHeight: 30, color: pal.paper }}>Let’s set your targets</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 15, color: pal.paper, opacity: 0.75 }}>Your BMI, body stats and goal decide your calories, macros and meal plan. Takes a minute.</Text>
      <Pressable onPress={() => router.navigate('/body')} accessibilityRole="button"
        style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: pal.paper, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: pal.ink }}>Set up body stats</Text>
      </Pressable>
    </View>
  );
}

function Tile({ pal, icon, title, sub, onPress, big, color }: { pal: Palette; icon: 'camera' | 'search' | 'body' | 'plan'; title: string; sub?: string; onPress: () => void; big?: boolean; color?: string }) {
  const bg = big ? color ?? pal.cut : pal.surface;
  const fg = big ? pal.onGoal : pal.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title}
      style={({ pressed }) => ({ flex: 1, backgroundColor: bg, borderRadius: 22, padding: 16, minHeight: big ? undefined : 70, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: big ? 'column' : 'row', alignItems: big ? 'flex-start' : 'center', gap: big ? 0 : 10, flex: big ? 1 : undefined, justifyContent: 'space-between' }}>
        <View style={{ width: big ? 46 : 36, height: big ? 46 : 36, borderRadius: 999, backgroundColor: big ? 'rgba(255,255,255,0.18)' : pal.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={big ? 24 : 19} color={fg} />
        </View>
        <View style={{ flex: big ? undefined : 1, marginTop: big ? 18 : 0 }}>
          <Text style={{ fontFamily: F.xbold, fontSize: big ? 21 : 15, color: fg }}>{title}</Text>
          {sub ? <Text style={{ fontFamily: F.medium, fontSize: 12, color: fg, opacity: 0.75, marginTop: 1 }}>{sub}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

function WaterCard({ pal, date, ml, goal }: { pal: Palette; date: string; ml: number; goal: number }) {
  const glasses = Math.round(goal / GLASS_ML);
  const had = Math.floor(ml / GLASS_ML);
  const water = '#3B8FD9';
  return (
    <View style={{ backgroundColor: pal.surface, borderRadius: 22, padding: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="water" size={20} color={water} />
        <T v="h3" style={{ flex: 1 }}>Water</T>
        <T v="label">{fmt1(ml / 1000)}<Text style={{ fontFamily: F.regular, color: pal.muted }}> / {fmt1(goal / 1000)} L</Text></T>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }} accessibilityLabel={`${had} of ${glasses} glasses`}>
        {Array.from({ length: glasses }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 22, borderRadius: 6, backgroundColor: i < had ? water : pal.soft }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <Pressable onPress={() => addWater(date, -GLASS_ML)} disabled={ml <= 0} accessibilityRole="button" accessibilityLabel="Remove a glass"
          style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: pal.line, alignItems: 'center', justifyContent: 'center', opacity: ml <= 0 ? 0.35 : 1 }}>
          <Icon name="minus" size={18} color={pal.ink} />
        </Pressable>
        <Pressable onPress={() => addWater(date, GLASS_ML)} accessibilityRole="button" accessibilityLabel="Add a glass of water"
          style={({ pressed }) => ({ flex: 1, height: 42, borderRadius: 21, backgroundColor: water, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
          <Icon name="plus" size={18} color="#fff" />
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>Glass (250 ml)</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MealCard({ pal, label, entries, onAdd, onRemove }: { pal: Palette; label: string; entries: Entry[]; onAdd: () => void; onRemove: (e: Entry) => void }) {
  const kc = entries.reduce((a, e) => a + e.n[0] * e.s, 0);
  return (
    <View style={{ backgroundColor: pal.surface, borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: entries.length ? 6 : 14, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <T v="h3">{label}</T>
          <T v="small" color={pal.muted}>{entries.length ? `${fmt(kc)} kcal` : 'Nothing logged yet'}</T>
        </View>
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={`Add food to ${label}`} hitSlop={6}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: pal.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={18} color={pal.paper} />
        </Pressable>
      </View>
      {entries.length ? (
        <View style={{ marginTop: 8 }}>
          {entries.map(e => (
            <Pressable key={e.id} onLongPress={() => onRemove(e)} accessibilityHint="Long press to remove"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: pal.line }}>
              <View style={{ flex: 1 }}>
                <T>{e.name}</T>
                <T v="small" color={pal.muted}>{qtyText(e.unit, e.s)}{e.via === 'photo' ? ', scanned' : ''}</T>
              </View>
              <T v="label">{fmt(e.n[0] * e.s)}</T>
              <Pressable accessibilityLabel={`Remove ${e.name}`} onPress={() => onRemove(e)} hitSlop={8} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, color: pal.muted }}>×</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RoundBtn({ pal, icon, label, onPress, disabled }: { pal: Palette; icon: 'left' | 'right'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: pal.surface, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
      <Icon name={icon} size={18} color={pal.ink} />
    </Pressable>
  );
}
