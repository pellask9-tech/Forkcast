import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

import { STATUS_LABEL } from '@/components/BodyCheckResult';
import { T } from '@/components/ui';
import { GROUP_NAMES, type GroupId } from '@/lib/program';
import type { MuscleGroup, MuscleStatus } from '@/lib/store';
import { F, Palette, usePalette } from '@/theme';

/**
 * Front and back body figures with each rated muscle group coloured by its status.
 * Tap a muscle (or its name below the figures) to see the note from the body check.
 */

// react-native-svg can't handle taps on shapes in the web build, so there the name chips do the job.
const TAPPABLE_SHAPES = Platform.OS !== 'web';

type Shape =
  | { k: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'r'; x: number; y: number; w: number; h: number; r: number }
  | { k: 'p'; d: string }
  | { k: 'c'; cx: number; cy: number; r: number };
type Part = { group?: GroupId; shape: Shape };

/** A left and right pair, mirrored around the centre line (x = 60). */
const pair = (group: GroupId | undefined, dx: number, cy: number, rx: number, ry: number): Part[] => [
  { group, shape: { k: 'e', cx: 60 - dx, cy, rx, ry } },
  { group, shape: { k: 'e', cx: 60 + dx, cy, rx, ry } },
];

// Shared silhouette pieces that aren't rated: head, neck, hands, pelvis, knees, feet.
const BASE: Part[] = [
  { shape: { k: 'c', cx: 60, cy: 20, r: 13 } },
  { shape: { k: 'r', x: 54, y: 31, w: 12, h: 10, r: 3 } },
  ...pair(undefined, 38, 130, 5, 6),
  { shape: { k: 'p', d: 'M44 106 L76 106 L78 124 L60 130 L42 124 Z' } },
  ...pair(undefined, 9.5, 179, 6.5, 5),
  ...pair(undefined, 10, 236, 7, 4),
];

const FRONT: Part[] = [
  ...BASE,
  ...pair('shoulders', 23, 50, 10, 9),
  { group: 'chest', shape: { k: 'r', x: 42, y: 44, w: 17.5, h: 22, r: 7 } },
  { group: 'chest', shape: { k: 'r', x: 60.5, y: 44, w: 17.5, h: 22, r: 7 } },
  { group: 'core', shape: { k: 'r', x: 46, y: 68, w: 28, h: 37, r: 7 } },
  ...pair('arms', 32, 76, 7, 16),
  ...pair('arms', 36, 108, 5.5, 14),
  ...pair('quads', 9.5, 150, 10, 25),
  ...pair('calves', 10, 206, 6.5, 20),
];

const BACK: Part[] = [
  ...BASE,
  ...pair('shoulders', 23, 50, 10, 9),
  { group: 'back', shape: { k: 'p', d: 'M42 42 Q60 36 78 42 L75 70 Q70 92 62 100 L58 100 Q50 92 45 70 Z' } },
  ...pair('arms', 32, 76, 7, 16),
  ...pair('arms', 36, 108, 5.5, 14),
  ...pair('glutes', 9.5, 120, 11, 11),
  ...pair('hamstrings', 9.5, 154, 9, 21),
  ...pair('calves', 10, 204, 8, 21),
];

function fillFor(pal: Palette, s: MuscleStatus | undefined) {
  switch (s) {
    case 'needs_work': return { fill: pal.carb, stroke: pal.carb, dash: undefined };
    case 'strong': return { fill: pal.fat, stroke: pal.fat, dash: undefined };
    case 'on_track': return { fill: pal.surface, stroke: pal.ink, dash: undefined };
    default: return { fill: 'transparent', stroke: pal.muted, dash: '3 2' };
  }
}

function Figure({ parts, label, statusOf, selected, onSelect }: {
  parts: Part[];
  label: string;
  statusOf: (g: GroupId) => MuscleStatus | undefined;
  selected: GroupId | null;
  onSelect: (g: GroupId) => void;
}) {
  const pal = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Svg viewBox="0 0 120 250" width="100%" height={250}>
        {parts.map((p, i) => {
          const s = p.group ? statusOf(p.group) : undefined;
          const c = p.group ? fillFor(pal, s) : { fill: pal.soft, stroke: pal.line, dash: undefined };
          const isSel = !!p.group && p.group === selected;
          const props = {
            fill: c.fill,
            stroke: isSel ? pal.ink : c.stroke,
            strokeWidth: isSel ? 2.5 : 1.2,
            strokeDasharray: c.dash,
            onPress: TAPPABLE_SHAPES && p.group ? () => onSelect(p.group!) : undefined,
          };
          const sh = p.shape;
          if (sh.k === 'e') return <Ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} {...props} />;
          if (sh.k === 'c') return <Circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} {...props} />;
          if (sh.k === 'r') return <Rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.r} {...props} />;
          return <Path key={i} d={sh.d} {...props} />;
        })}
        <SvgText x={60} y={249} fontSize={10} fontFamily={F.bold} fill={pal.muted} textAnchor="middle">{label}</SvgText>
      </Svg>
    </View>
  );
}

export function BodyMap({ groups }: { groups: MuscleGroup[] }) {
  const pal = usePalette();
  const byId = new Map(groups.map(g => [g.id, g]));
  const statusOf = (g: GroupId) => byId.get(g)?.status;
  const first = groups.find(g => g.status === 'needs_work')?.id as GroupId | undefined;
  const [selected, setSelected] = useState<GroupId | null>(first ?? null);
  const sel = selected ? byId.get(selected) : undefined;
  const present = (['needs_work', 'strong', 'on_track', 'not_visible'] as MuscleStatus[]).filter(s => groups.some(g => g.status === s));
  const train = groups.filter(g => g.status === 'needs_work').map(g => g.name);

  return (
    <View
      style={{ backgroundColor: pal.surface, borderRadius: 20, borderWidth: 1, borderColor: pal.line, padding: 12 }}
      accessible
      accessibilityLabel={`Body map. ${train.length ? `Train more: ${train.join(', ')}.` : 'No areas marked to train more.'} Tap a muscle for details.`}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Figure parts={FRONT} label="FRONT" statusOf={statusOf} selected={selected} onSelect={setSelected} />
        <Figure parts={BACK} label="BACK" statusOf={statusOf} selected={selected} onSelect={setSelected} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' }}>
        {present.map(s => {
          const c = fillFor(pal, s);
          return (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.fill, borderWidth: 1.5, borderColor: c.stroke, borderStyle: c.dash ? 'dashed' : 'solid' }} />
              <T v="tiny">{STATUS_LABEL[s]}</T>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {groups.map(g => {
          const on = g.id === selected;
          const c = fillFor(pal, g.status);
          return (
            <Pressable key={g.id} onPress={() => setSelected(g.id as GroupId)} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${g.name}, ${STATUS_LABEL[g.status]}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: on ? pal.ink : pal.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.fill, borderWidth: 1, borderColor: c.stroke, borderStyle: c.dash ? 'dashed' : 'solid' }} />
              <T v="tiny">{g.name}</T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: 10, minHeight: 40, borderTopWidth: 1, borderTopColor: pal.line, paddingTop: 10 }}>
        {selected ? (
          <>
            <T v="label">{sel?.name ?? GROUP_NAMES[selected]} · {STATUS_LABEL[sel?.status ?? 'not_visible']}</T>
            <T v="small" color={pal.muted}>{sel?.note || 'Tap another muscle to see its note.'}</T>
          </>
        ) : (
          <T v="small" color={pal.muted}>Tap a muscle to see the coach’s note on it.</T>
        )}
      </View>
    </View>
  );
}
