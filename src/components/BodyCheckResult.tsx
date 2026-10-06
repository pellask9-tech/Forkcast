import { Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { T } from '@/components/ui';
import type { BodyCheck, MuscleStatus } from '@/lib/store';
import { F, Palette, usePalette } from '@/theme';

export const STATUS_LABEL: Record<MuscleStatus, string> = {
  strong: 'Strong point',
  on_track: 'On track',
  needs_work: 'Train more',
  not_visible: 'Not visible',
};

export function statusColors(pal: Palette, s: MuscleStatus) {
  switch (s) {
    case 'strong': return { bg: pal.fat, fg: pal.onGoal, border: pal.fat };
    case 'needs_work': return { bg: pal.carb, fg: '#1B1405', border: pal.carb };
    case 'on_track': return { bg: 'transparent', fg: pal.ink, border: pal.ink };
    default: return { bg: 'transparent', fg: pal.muted, border: pal.line };
  }
}

export function StatusPill({ status }: { status: MuscleStatus }) {
  const pal = usePalette();
  const c = statusColors(pal, status);
  return (
    <View style={{ backgroundColor: c.bg, borderColor: c.border, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderStyle: status === 'not_visible' ? 'dashed' : 'solid' }}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: c.fg }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const SECTIONS: [string, string[]][] = [
  ['Upper body', ['shoulders', 'chest', 'arms', 'back']],
  ['Core', ['core']],
  ['Lower body', ['glutes', 'quads', 'hamstrings', 'calves']],
];

export function BodyCheckResult({ check }: { check: Pick<BodyCheck, 'summary' | 'groups' | 'focus' | 'balance'> }) {
  const pal = usePalette();
  const byId = new Map(check.groups.map(g => [g.id, g]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const counts = {
    needs: check.groups.filter(g => g.status === 'needs_work').length,
    strong: check.groups.filter(g => g.status === 'strong').length,
  };

  return (
    <View>
      <T>{check.summary}</T>

      <View style={{ marginTop: 16 }}>
        <BodyMap groups={check.groups} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Tally pal={pal} n={counts.strong} label="strong points" color={pal.fat} />
        <Tally pal={pal} n={counts.needs} label="to train more" color={pal.carb} />
      </View>

      {SECTIONS.map(([title, ids]) => (
        <View key={title} style={{ marginTop: 22 }}>
          <T v="label" color={pal.muted} style={{ marginBottom: 4 }}>{title}</T>
          {ids.map(id => {
            const g = byId.get(id);
            if (!g) return null;
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: pal.line }}>
                <View style={{ flex: 1 }}>
                  <T v="label">{g.name}</T>
                  {g.note ? <T v="small" color={pal.muted}>{g.note}</T> : null}
                </View>
                <StatusPill status={g.status} />
              </View>
            );
          })}
        </View>
      ))}

      {check.focus.length ? (
        <View style={{ marginTop: 26 }}>
          <T v="h2">Your focus plan</T>
          <T v="small" color={pal.muted} style={{ marginTop: 2, marginBottom: 12 }}>Add these to your training 2 to 3 times a week.</T>
          <View style={{ gap: 12 }}>
            {check.focus.map((f, i) => (
              <View key={i} style={{ backgroundColor: pal.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: pal.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: pal.carb, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.black, fontSize: 15, color: '#1B1405' }}>{i + 1}</Text>
                  </View>
                  <T v="h3" style={{ flex: 1 }}>{nameOf(f.group)}</T>
                </View>
                {f.why ? <T v="small" color={pal.muted} style={{ marginTop: 8 }}>{f.why}</T> : null}
                <View style={{ marginTop: 10 }}>
                  {f.exercises.map((e, j) => (
                    <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: j ? 1 : 0, borderTopColor: pal.line }}>
                      <T style={{ flex: 1 }}>{e.name}</T>
                      <T v="label">{e.sets}</T>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {check.balance ? <T v="small" color={pal.muted} style={{ marginTop: 16 }}>{check.balance}</T> : null}
    </View>
  );
}

function Tally({ pal, n, label, color }: { pal: Palette; n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: pal.surface, borderRadius: 16, padding: 14, borderLeftWidth: 5, borderLeftColor: color }}>
      <Text style={{ fontFamily: F.black, fontSize: 30, lineHeight: 32, color: pal.ink }}>{n}</Text>
      <T v="small" color={pal.muted}>{label}</T>
    </View>
  );
}
