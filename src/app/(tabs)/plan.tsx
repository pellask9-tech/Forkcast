import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { usePalette } from '@/components/theme';
import { Button, Card, MacroPills, Screen, styles, T } from '@/components/ui';
import { describeAmount, getFood } from '@/lib/foods';
import {
  MEAL_SLOTS,
  defaultChoice,
  recommendMeals,
  remainingMealTargets,
  type MealSlot,
  type PlannedMeal,
} from '@/lib/mealPlan';
import { calculateTargets, STRATEGY_LABELS } from '@/lib/nutrition';
import { dateKey, daySeed, useDayLog, useProfile } from '@/state/store';

export default function Plan() {
  const c = usePalette();
  const profile = useProfile();
  const date = dateKey();
  const targets = useMemo(() => calculateTargets(profile), [profile]);
  const day = useDayLog(date);
  const [choice, setChoice] = useState<Partial<Record<MealSlot, number>>>({});

  const slotTargets = useMemo(
    () => remainingMealTargets(targets.daily, profile.goal, day.bySlot),
    [targets, profile.goal, day.bySlot],
  );
  const recommendations = useMemo(
    () =>
      Object.fromEntries(
        MEAL_SLOTS.map(({ id }) => {
          const t = slotTargets[id];
          return [id, t ? recommendMeals(id, t, profile) : null];
        }),
      ) as Record<MealSlot, PlannedMeal[] | null>,
    [slotTargets, profile],
  );

  const seed = daySeed(date);
  const selected = Object.fromEntries(
    MEAL_SLOTS.map(({ id }, i) => {
      const recs = recommendations[id];
      if (!recs || recs.length === 0) return [id, null];
      return [id, recs[(choice[id] ?? defaultChoice(recs, seed + i)) % recs.length]];
    }),
  ) as Record<MealSlot, PlannedMeal | null>;

  const projected = MEAL_SLOTS.reduce(
    (acc, { id }) => {
      const source = slotTargets[id] === null ? day.bySlot[id] : selected[id]?.totals;
      if (source) for (const k of ['calories', 'protein', 'carbs', 'fat'] as const) acc[k] += source[k];
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Screen>
      <Card>
        <View style={styles.row}>
          <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
            <T variant="small" color={c.primary} style={{ fontWeight: '700' }}>
              {STRATEGY_LABELS[targets.strategy].toUpperCase()}
            </T>
          </View>
          <T variant="small">BMI {targets.bmi.toFixed(1)}</T>
        </View>
        <T variant="title">{targets.daily.calories.toLocaleString('en-US')} kcal a day</T>
        <MacroPills {...targets.daily} />
        {targets.notes.map((n) => (
          <T key={n} variant="muted">
            {n}
          </T>
        ))}
        <T variant="small">Meals you haven’t logged adjust to whatever is left of today’s targets.</T>
      </Card>

      {MEAL_SLOTS.map((slot, i) => {
        const recs = recommendations[slot.id];
        const meal = selected[slot.id];

        if (recs === null) {
          return (
            <Card
              key={slot.id}
              title={slot.label}
              right={
                <View style={styles.row}>
                  <Ionicons name="checkmark-circle" size={18} color={c.primary} />
                  <T variant="small" color={c.primary} style={{ fontWeight: '700' }}>
                    Logged
                  </T>
                </View>
              }>
              <MacroPills {...day.bySlot[slot.id]} />
            </Card>
          );
        }

        if (!meal) {
          return (
            <Card key={slot.id} title={slot.label}>
              <T variant="muted">
                You’ve already reached today’s targets, so there’s nothing planned here. If you’re hungry, go for
                vegetables or a piece of fruit.
              </T>
            </Card>
          );
        }

        const index = recs.indexOf(meal);
        const target = slotTargets[slot.id]!;
        return (
          <Card key={slot.id} title={slot.label} right={<T variant="small">Option {index + 1} of {recs.length}</T>}>
            <T variant="heading" style={{ fontSize: 19 }}>
              {meal.name}
            </T>
            <MacroPills {...meal.totals} />
            <T variant="small">
              Aiming for ≈ {Math.round(target.calories)} kcal and {Math.round(target.protein)} g protein
            </T>
            <View style={{ gap: 6 }}>
              {meal.items.map((item) => (
                <View key={item.foodId} style={styles.rowBetween}>
                  <T style={{ flex: 1 }}>{getFood(item.foodId).name}</T>
                  <T variant="muted">{describeAmount(item.foodId, item.grams)}</T>
                </View>
              ))}
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Swap"
                  variant="secondary"
                  icon="shuffle"
                  disabled={recs.length < 2}
                  onPress={() => setChoice({ ...choice, [slot.id]: index + 1 })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Log meal"
                  icon="checkmark"
                  onPress={() => day.add(meal.items.map((it) => ({ ...it, slot: slot.id })))}
                />
              </View>
            </View>
          </Card>
        );
      })}

      <Card title="Today with this plan">
        <MacroPills {...projected} />
        <T variant="small">
          Goal: {targets.daily.calories.toLocaleString('en-US')} kcal · P {targets.daily.protein} g · C{' '}
          {targets.daily.carbs} g · F {targets.daily.fat} g
        </T>
      </Card>
    </Screen>
  );
}
