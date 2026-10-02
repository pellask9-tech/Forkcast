import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { usePalette } from '@/components/theme';
import { Button, Card, Chip, Input, MacroPills, NutrientRow, Screen, Segmented, styles, T } from '@/components/ui';
import { findFood, nutrientsFor } from '@/lib/foods';
import { MEAL_SLOTS, type MealSlot } from '@/lib/mealPlan';
import { MICRO_KEYS } from '@/lib/nutrients';
import { calculateTargets } from '@/lib/nutrition';
import { dateKey, formatDateKey, useDayLog, useProfile } from '@/state/store';

type Mode = 'servings' | 'grams';

function parse(text: string): number {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export default function FoodDetail() {
  const c = usePalette();
  const params = useLocalSearchParams<{ id: string; slot?: string; date?: string }>();
  const food = findFood(params.id);
  const profile = useProfile();
  const date = params.date ?? dateKey();
  const day = useDayLog(date);
  const daily = useMemo(() => calculateTargets(profile).daily, [profile]);
  const [slot, setSlot] = useState<MealSlot>(
    MEAL_SLOTS.find((s) => s.id === params.slot)?.id ?? 'snack',
  );
  const [mode, setMode] = useState<Mode>('servings');
  const [amount, setAmount] = useState('1');

  if (!food) {
    return (
      <Screen>
        <T variant="muted">That food isn’t in the database.</T>
      </Screen>
    );
  }

  const servingGrams = food.serving.grams;
  const grams = mode === 'servings' ? parse(amount) * servingGrams : parse(amount);
  const valid = grams > 0 && grams <= 5000;
  const n = nutrientsFor(food.id, valid ? grams : 0);
  const step = mode === 'servings' ? 0.5 : 10;

  function switchMode(next: Mode) {
    if (next === mode) return;
    setAmount(trim(next === 'grams' ? parse(amount) * servingGrams : parse(amount) / servingGrams));
    setMode(next);
  }

  function nudge(direction: 1 | -1) {
    setAmount(trim(Math.max(0, parse(amount) + direction * step)));
  }

  const slotLabel = MEAL_SLOTS.find((s) => s.id === slot)!.label;

  return (
    <Screen>
      <Stack.Screen options={{ title: food.name }} />
      <View style={{ gap: 4 }}>
        <T variant="title">{food.name}</T>
        <T variant="muted">
          1 serving = {food.serving.label} ({servingGrams} g)
        </T>
      </View>

      <Card title="Amount">
        <Segmented
          options={[
            { value: 'servings', label: 'Servings' },
            { value: 'grams', label: 'Grams' },
          ]}
          value={mode}
          onChange={switchMode}
        />
        <View style={styles.row}>
          <Pressable accessibilityLabel="Less" hitSlop={8} onPress={() => nudge(-1)}>
            <Ionicons name="remove-circle-outline" size={36} color={c.primary} />
          </Pressable>
          <Input
            style={{ flex: 1 }}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
            suffix={mode === 'servings' ? `× ${food.serving.label}` : 'g'}
          />
          <Pressable accessibilityLabel="More" hitSlop={8} onPress={() => nudge(1)}>
            <Ionicons name="add-circle-outline" size={36} color={c.primary} />
          </Pressable>
        </View>
        {!valid && (
          <T variant="small" color={c.danger}>
            Enter an amount above zero.
          </T>
        )}
      </Card>

      <Card title={`Meal · ${formatDateKey(date)}`}>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {MEAL_SLOTS.map((s) => (
            <Chip key={s.id} label={s.label} active={slot === s.id} onPress={() => setSlot(s.id)} />
          ))}
        </View>
      </Card>

      <Button
        label={`Add to ${slotLabel}`}
        icon="add-circle"
        disabled={!valid}
        onPress={() => {
          day.add([{ foodId: food.id, grams, slot }]);
          router.back();
        }}
      />

      <Card title="Nutrition" right={<T variant="small">{Math.round(grams)} g</T>}>
        <MacroPills {...n} />
        <NutrientRow nutrient="calories" value={n.calories} target={daily.calories} color={c.primary} />
        <NutrientRow nutrient="protein" value={n.protein} target={daily.protein} color={c.protein} />
        <NutrientRow nutrient="carbs" value={n.carbs} target={daily.carbs} color={c.carbs} />
        <NutrientRow nutrient="fat" value={n.fat} target={daily.fat} color={c.fat} />
        <NutrientRow nutrient="fiber" value={n.fiber} target={daily.fiber} color={c.fiber} />
        <NutrientRow nutrient="saturatedFat" value={n.saturatedFat} target={daily.saturatedFat} color={c.fat} />
        <T variant="small">Sugars: {Math.round(n.sugar * 10) / 10} g</T>
      </Card>

      <Card title="Vitamins & minerals" right={<T variant="small">% of daily target</T>}>
        {MICRO_KEYS.map((k) => (
          <NutrientRow key={k} nutrient={k} value={n[k]} target={daily[k]} color={c.micro} />
        ))}
        <T variant="small">Values are estimates based on USDA FoodData Central.</T>
      </Card>
    </Screen>
  );
}
