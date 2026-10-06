import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { LevelBadge, XpBar } from '@/components/Level';
import { Screen } from '@/components/Screen';
import { Btn, SectionRule, T } from '@/components/ui';
import { todayStr, useAppState } from '@/lib/store';
import { STREAK_BONUS_DAYS, TITLES, XP, dayChecklist, earned, levelFor, totalXp } from '@/lib/xp';
import { F, goalColor, usePalette } from '@/theme';

export default function LevelsScreen() {
  const pal = usePalette();
  const app = useAppState();
  const color = goalColor(pal, app.profile?.goal);
  const sum = useMemo(() => totalXp(app), [app]);
  const info = levelFor(sum.total);
  const today = dayChecklist(app, todayStr());
  const todayXp = earned(today);
  const todayMax = today.reduce((a, i) => a + i.xp, 0);

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Your progress</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 }}>
        <LevelBadge level={info.level} color={color} size={88} />
        <View style={{ flex: 1 }}>
          <T v="title">{info.title}</T>
          <T color={pal.muted}>Level {info.level} · {sum.total.toLocaleString('en-US')} XP</T>
        </View>
      </View>
      <View style={{ marginTop: 16, gap: 6 }}>
        <XpBar info={info} color={color} height={12} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="small" color={pal.muted}>{info.into} / {info.needed} XP</T>
          <T v="small" color={pal.muted}>{info.needed - info.into} XP to level {info.level + 1}</T>
        </View>
        {info.nextTitle ? (
          <T v="small">Reach level {info.nextTitleAt} to become <T v="label">{info.nextTitle}</T>.</T>
        ) : null}
      </View>

      <SectionRule />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="h2">Earn XP today</T>
        <T v="label" color={color}>+{todayXp} of {todayMax}</T>
      </View>
      <View style={{ marginTop: 8 }}>
        {today.map(item => (
          <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: pal.line }}
            accessibilityLabel={`${item.label}, ${item.xp} XP, ${item.done ? 'done' : 'not done yet'}`}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: item.done ? color : pal.line, backgroundColor: item.done ? color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {item.done ? <Text style={{ color: pal.onGoal, fontFamily: F.black, fontSize: 13 }}>✓</Text> : null}
            </View>
            <T style={{ flex: 1 }} color={item.done ? pal.muted : pal.ink}>{item.label}</T>
            <T v="label" color={item.done ? color : pal.muted}>+{item.xp}</T>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
          <View style={{ width: 24 }} />
          <T style={{ flex: 1 }}>Finish a workout from your program</T>
          <T v="label" color={pal.muted}>+{XP.workout}</T>
        </View>
      </View>
      <Btn title="Open my program" kind="ghost" small style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => { router.back(); router.push('/program'); }} />

      <SectionRule />
      <T v="h2">Where your XP came from</T>
      {[
        ['Daily habits (food, targets, water, weigh-ins)', sum.days],
        ['Workouts', sum.workouts],
        ['Body checks', sum.bodyChecks],
      ].map(([label, xp]) => (
        <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: pal.line }}>
          <T v="small" style={{ flex: 1 }}>{label}</T>
          <T v="label">{(xp as number).toLocaleString('en-US')} XP</T>
        </View>
      ))}
      <T v="tiny" color={pal.muted} style={{ marginTop: 8 }}>
        Body checks earn {XP.bodyCheck} XP each. Logging food {STREAK_BONUS_DAYS} or more days in a row adds a {XP.streak} XP bonus every day the streak continues.
      </T>

      <SectionRule />
      <T v="h2">Titles</T>
      <View style={{ marginTop: 8, gap: 2 }}>
        {TITLES.map(([lvl, title]) => {
          const reached = info.level >= lvl;
          return (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: reached ? 1 : 0.5 }}>
              <T v="label" style={{ width: 64 }} color={pal.muted}>Lvl {lvl}</T>
              <T v={reached ? 'label' : 'body'} style={{ flex: 1 }}>{title}</T>
              <T v="small" color={reached ? color : pal.muted}>{reached ? (info.title === title ? 'Current' : 'Reached') : 'Locked'}</T>
            </View>
          );
        })}
      </View>
      <Btn title="Done" style={{ marginTop: 20 }} onPress={() => router.back()} />
    </Screen>
  );
}
