import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { usePalette } from '@/components/theme';
import { Card, Chip, Input, Screen, styles, T } from '@/components/ui';
import { nutrientsFor, searchFoods } from '@/lib/foods';
import { MEAL_SLOTS, type MealSlot } from '@/lib/mealPlan';
import { dateKey, formatDateKey } from '@/state/store';

function slotForNow(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

function isSlot(v: unknown): v is MealSlot {
  return MEAL_SLOTS.some((s) => s.id === v);
}

export default function LogFood() {
  const c = usePalette();
  const params = useLocalSearchParams<{ slot?: string; date?: string }>();
  const [slot, setSlot] = useState<MealSlot>(isSlot(params.slot) ? params.slot : slotForNow);
  const [query, setQuery] = useState('');
  const date = params.date ?? dateKey();

  // The tab stays mounted, so follow the slot param when another screen links here.
  const [linkedSlot, setLinkedSlot] = useState(params.slot);
  if (params.slot !== linkedSlot) {
    setLinkedSlot(params.slot);
    if (isSlot(params.slot)) setSlot(params.slot);
  }

  const foods = searchFoods(query);

  return (
    <Screen>
      <View style={{ gap: 10 }}>
        <T variant="muted">Logging for {formatDateKey(date)}</T>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {MEAL_SLOTS.map((s) => (
            <Chip key={s.id} label={s.label} active={slot === s.id} onPress={() => setSlot(s.id)} />
          ))}
        </View>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods (e.g. chicken, oats)"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <Card>
        {foods.length === 0 && <T variant="muted">No foods match “{query}”.</T>}
        {foods.map((f, i) => {
          const n = nutrientsFor(f.id, f.serving.grams);
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/food/[id]', params: { id: f.id, slot, date } })}
              style={({ pressed }) => [
                styles.rowBetween,
                {
                  paddingVertical: 6,
                  opacity: pressed ? 0.6 : 1,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: c.border,
                  paddingTop: i === 0 ? 0 : 12,
                },
              ]}>
              <View style={{ flex: 1, gap: 2 }}>
                <T>{f.name}</T>
                <T variant="small">
                  {f.serving.label} ({f.serving.grams} g) · {Math.round(n.calories)} kcal · P {Math.round(n.protein)} · C{' '}
                  {Math.round(n.carbs)} · F {Math.round(n.fat)}
                </T>
              </View>
              <Ionicons name="add-circle" size={26} color={c.primary} />
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
