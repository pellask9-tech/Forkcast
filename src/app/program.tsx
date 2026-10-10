import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { Screen } from '@/components/Screen';
import { Btn, NoteBox, Segmented, T } from '@/components/ui';
import { AI_FEATURES } from '@/config';
import { GROUP_NAMES, buildProgram, type DaysPerWeek, type Equipment } from '@/lib/program';
import { doneThisWeek, parseD, setTrainingPrefs, toggleWorkout, useAppState } from '@/lib/store';
import { F, goalColor, usePalette } from '@/theme';

export default function ProgramScreen() {
  const pal = usePalette();
  const app = useAppState();
  const latest = app.bodyChecks[app.bodyChecks.length - 1] ?? null;
  const goal = app.profile?.goal ?? 'cut';
  const { days, equipment } = app.training;
  const program = useMemo(() => buildProgram({ check: latest, goal, days, equipment }), [latest, goal, days, equipment]);
  const done = doneThisWeek(app.training);
  const color = goalColor(pal, goal);

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Your coach</T>
      <T v="title">Your weekly program</T>
      <T color={pal.muted} style={{ marginTop: 8 }}>
        {program.personalised
          ? `Built from your body check on ${parseD(latest!.d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} for your ${goal === 'bulk' ? 'bulk' : 'cut'}.`
          : `A balanced program for your ${goal === 'bulk' ? 'bulk' : 'cut'}.`}
      </T>

      {latest ? <View style={{ marginTop: 16 }}><BodyMap groups={latest.groups} /></View> : null}

      <View style={{ gap: 8, marginTop: 16 }}>
        {program.coachNotes.map((n, i) => <NoteBox key={i} text={n} color={color} />)}
      </View>
      {!latest && AI_FEATURES ? (
        <Btn title="Do a body check" kind="ghost" small style={{ alignSelf: 'flex-start', marginTop: 12 }} onPress={() => { router.back(); router.push('/body-check'); }} />
      ) : null}

      <View style={{ marginTop: 20, gap: 12 }}>
        <View>
          <T v="label" style={{ marginBottom: 8 }}>Days per week</T>
          <Segmented<DaysPerWeek>
            options={[{ value: 3, label: '3 days' }, { value: 4, label: '4 days' }, { value: 5, label: '5 days' }]}
            value={days}
            onChange={d => setTrainingPrefs({ days: d })}
          />
        </View>
        <View>
          <T v="label" style={{ marginBottom: 8 }}>Where you train</T>
          <Segmented<Equipment>
            options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home, no machines' }]}
            value={equipment}
            onChange={e => setTrainingPrefs({ equipment: e })}
          />
        </View>
      </View>

      <View style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="h2">This week</T>
          <T v="label">{done.length} of {program.days.length} done</T>
        </View>
        <View style={{ height: 8, backgroundColor: pal.soft, borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
          <View style={{ height: 8, width: `${(done.length / program.days.length) * 100}%`, backgroundColor: color }} />
        </View>
      </View>

      <View style={{ gap: 12, marginTop: 16 }}>
        {program.days.map(day => {
          const isDone = done.includes(day.id);
          return (
            <View key={day.id} style={{ backgroundColor: pal.surface, borderRadius: 18, borderWidth: isDone ? 2 : 1, borderColor: isDone ? color : pal.line, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <T v="small" color={pal.muted}>{day.weekday}</T>
                  <T v="h3">{day.title}</T>
                </View>
                {day.focus.length ? (
                  <T v="tiny" color={pal.muted}>Focus: {day.focus.map(g => GROUP_NAMES[g]).join(', ')}</T>
                ) : null}
              </View>
              <View style={{ marginTop: 8 }}>
                {day.exercises.map((e, j) => (
                  <View key={e.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: j ? 1 : 0, borderTopColor: pal.line }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.priority ? pal.carb : 'transparent', borderWidth: e.priority ? 0 : 1, borderColor: pal.line }} />
                    <View style={{ flex: 1 }}>
                      <T>{e.name}</T>
                      <T v="tiny" color={pal.muted}>{GROUP_NAMES[e.group]}{e.priority ? ' · train more' : ''}</T>
                    </View>
                    <T v="label">{e.sets}</T>
                  </View>
                ))}
                {day.finisher ? (
                  <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: pal.line }}>
                    <T v="small" color={pal.muted} style={{ flex: 1 }}>Finisher: {day.finisher}</T>
                  </View>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                onPress={() => toggleWorkout(day.id)}
                style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isDone ? color : pal.ink, backgroundColor: isDone ? color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {isDone ? <Text style={{ color: pal.onGoal, fontFamily: F.black, fontSize: 14, lineHeight: 16 }}>✓</Text> : null}
                </View>
                <T v="label">{isDone ? 'Done this week' : 'Mark as done'}</T>
              </Pressable>
            </View>
          );
        })}
      </View>

      <T v="tiny" color={pal.muted} style={{ marginTop: 16 }}>
        Warm up for 5 to 10 minutes before each session. Stop any exercise that causes sharp pain. This is training guidance, not medical advice.
      </T>
      <Btn title="Done" style={{ marginTop: 18 }} onPress={() => router.back()} />
    </Screen>
  );
}
