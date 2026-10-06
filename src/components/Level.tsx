import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { titleFor, type LevelInfo } from '@/lib/xp';
import { F, usePalette } from '@/theme';

/** Diamond level badge: the level number on the goal colour. `size` is the full width it takes up. */
export function LevelBadge({ level, color, size = 46 }: { level: number; color: string; size?: number }) {
  const pal = usePalette();
  // A rotated square is wider than the square itself, so draw it smaller to fit inside `size`.
  const side = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: side, height: side, borderRadius: side * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
        <Text style={{ transform: [{ rotate: '-45deg' }], fontFamily: F.black, fontSize: size * 0.4, color: pal.onGoal, fontVariant: ['tabular-nums'] }}>{level}</Text>
      </View>
    </View>
  );
}

export function XpBar({ info, color, height = 8 }: { info: LevelInfo; color: string; height?: number }) {
  const pal = usePalette();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: pal.soft, overflow: 'hidden' }}
      accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: info.needed, now: info.into }}>
      <View style={{ height, width: `${(info.into / info.needed) * 100}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/** The level strip on the Today screen. */
export function LevelCard({ info, today, color, onPress }: { info: LevelInfo; today: number; color: string; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`Level ${info.level}, ${info.title}. ${info.needed - info.into} XP to level ${info.level + 1}. ${today} XP earned today.`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pal.surface, borderRadius: 20, borderWidth: 1, borderColor: pal.line, padding: 14, marginBottom: 12, opacity: pressed ? 0.85 : 1 })}>
      <LevelBadge level={info.level} color={color} size={52} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <T v="label">Level {info.level} · {info.title}</T>
          <T v="tiny" color={pal.muted}>{info.needed - info.into} XP to go</T>
        </View>
        <XpBar info={info} color={color} />
      </View>
      <View style={{ alignItems: 'center', minWidth: 52 }}>
        <Text style={{ fontFamily: F.black, fontSize: 18, color: today > 0 ? color : pal.muted }}>+{today}</Text>
        <T v="tiny" color={pal.muted}>XP today</T>
      </View>
    </Pressable>
  );
}

/** Shown once when the user reaches a new level. */
export function LevelUp({ info, color, onDone }: { info: LevelInfo; color: string; onDone: () => void }) {
  const pal = usePalette();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [pop]);
  const newTitle = info.level > 1 && info.title !== titleFor(info.level - 1);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], opacity: pop,
        backgroundColor: color, borderRadius: 24, padding: 20, marginBottom: 12, alignItems: 'center', gap: 6 }}>
      <Text style={{ fontFamily: F.black, fontSize: 13, letterSpacing: 2, color: pal.onGoal, opacity: 0.85 }}>LEVEL UP</Text>
      <Text style={{ fontFamily: F.black, fontSize: 56, lineHeight: 60, letterSpacing: -2, color: pal.onGoal }}>Level {info.level}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 16, color: pal.onGoal, textAlign: 'center' }}>
        {newTitle ? `New title: ${info.title}! ` : ''}Keep logging to reach level {info.level + 1}.
      </Text>
      <Pressable onPress={onDone} accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: 8, backgroundColor: pal.onGoal, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, color }}>Let’s go</Text>
      </Pressable>
    </Animated.View>
  );
}
