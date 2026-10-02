import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { usePalette } from '@/components/theme';
import { Button, Card, NutrientRow, ProgressBar, Screen, styles, T } from '@/components/ui';
import { describeAmount, findFood } from '@/lib/foods';
import { MEAL_SLOTS } from '@/lib/mealPlan';
import { MICRO_KEYS, formatAmount } from '@/lib/nutrients';
import { calculateTargets, STRATEGY_LABELS } from '@/lib/nutrition';
import { dateKey, entryNutrients, formatDateKey, shiftDateKey, useDayLog, useProfile } from '@/state/store';

export default function Today() {
  const c = usePalette();
  const profile = useProfile();
  const [date, setDate] = useState(dateKey);
  const targets = useMemo(() => calculateTargets(profile), [profile]);
  const day = useDayLog(date);
  const { daily } = targets;
  const remaining = daily.calories - day.totals.calories;

  const macros = [
    { key: 'protein', label: 'Protein', color: c.protein },
    { key: 'carbs', label: 'Carbs', color: c.carbs },
    { key: 'fat', label: 'Fat', color: c.fat },
  ] as const;

  return (
    <Screen>
      <View style={styles.rowBetween}>
        <Pressable accessibilityLabel="Previous day" hitSlop={12} onPress={() => setDate(shiftDateKey(date, -1))}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <T variant="heading">{formatDateKey(date)}</T>
          <T variant="small">
            {STRATEGY_LABELS[targets.strategy]} · {daily.calories.toLocaleString('en-US')} kcal goal
          </T>
        </View>
        <Pressable accessibilityLabel="Next day" hitSlop={12} onPress={() => setDate(shiftDateKey(date, 1))}>
          <Ionicons name="chevron-forward" size={24} color={c.text} />
        </Pressable>
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <View>
            <T variant="display" color={remaining < 0 ? c.danger : undefined}>
              {Math.abs(Math.round(remaining)).toLocaleString('en-US')}
            </T>
            <T variant="muted">{remaining < 0 ? 'kcal over goal' : 'kcal left'}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T variant="heading">{Math.round(day.totals.calories).toLocaleString('en-US')}</T>
            <T variant="small">eaten of {daily.calories.toLocaleString('en-US')}</T>
          </View>
        </View>
        <ProgressBar value={day.totals.calories} max={daily.calories} color={c.primary} overColor={c.danger} height={12} />
        <View style={[styles.row, { gap: 12, marginTop: 4 }]}>
          {macros.map((m) => (
            <View key={m.key} style={{ flex: 1, gap: 6 }}>
              <T variant="small" style={{ fontWeight: '600' }}>
                {m.label}
              </T>
              <ProgressBar value={day.totals[m.key]} max={daily[m.key]} color={m.color} />
              <T variant="small">
                {Math.round(day.totals[m.key])} / {daily[m.key]} g
              </T>
            </View>
          ))}
        </View>
      </Card>

      <Card title="Meals">
        {MEAL_SLOTS.map((slot) => {
          const entries = day.entries.filter((e) => e.slot === slot.id);
          return (
            <View key={slot.id} style={{ gap: 8 }}>
              <View style={styles.rowBetween}>
                <T variant="heading">{slot.label}</T>
                <View style={styles.row}>
                  <T variant="small">{Math.round(day.bySlot[slot.id].calories)} kcal</T>
                  <Button
                    compact
                    variant="secondary"
                    icon="add"
                    label="Add"
                    onPress={() => router.push({ pathname: '/log', params: { slot: slot.id, date } })}
                  />
                </View>
              </View>
              {entries.length === 0 ? (
                <T variant="small">Nothing logged yet.</T>
              ) : (
                entries.map((e) => (
                  <View key={e.id} style={[styles.rowBetween, { paddingLeft: 4 }]}>
                    <View style={{ flex: 1 }}>
                      <T numberOfLines={1}>{findFood(e.foodId)?.name ?? 'Unknown food'}</T>
                      <T variant="small">
                        {findFood(e.foodId) ? describeAmount(e.foodId, e.grams) : `${e.grams} g`} ·{' '}
                        {Math.round(entryNutrients(e).calories)} kcal
                      </T>
                    </View>
                    <Pressable accessibilityLabel="Remove" hitSlop={10} onPress={() => day.remove(e.id)}>
                      <Ionicons name="trash-outline" size={20} color={c.muted} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          );
        })}
        <Button label="See recommended meals" variant="secondary" icon="restaurant-outline" onPress={() => router.push('/plan')} />
      </Card>

      <Card title="Fiber & limits">
        <NutrientRow nutrient="fiber" value={day.totals.fiber} target={daily.fiber} color={c.fiber} />
        <NutrientRow nutrient="saturatedFat" value={day.totals.saturatedFat} target={daily.saturatedFat} color={c.fat} />
        <NutrientRow nutrient="sodium" value={day.totals.sodium} target={daily.sodium} color={c.carbs} />
        <T variant="small">Sugars: {formatAmount(day.totals.sugar, 'g')} (includes natural sugars from fruit and dairy)</T>
      </Card>

      <Card title="Vitamins & minerals">
        {MICRO_KEYS.filter((k) => k !== 'sodium').map((k) => (
          <NutrientRow key={k} nutrient={k} value={day.totals[k]} target={daily[k]} color={c.micro} />
        ))}
      </Card>
    </Screen>
  );
}
