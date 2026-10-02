import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { usePalette } from '@/components/theme';
import { Button, Card, Screen, Segmented, styles, T } from '@/components/ui';
import { formatAmount, MICRO_KEYS, NUTRIENT_INFO } from '@/lib/nutrients';
import {
  ACTIVITY_LEVELS,
  BMI_CATEGORIES,
  calculateTargets,
  formatHeight,
  formatWeight,
  healthyWeightRange,
  STRATEGY_LABELS,
  type Goal,
} from '@/lib/nutrition';
import { useProfile, useStore } from '@/state/store';

const SCALE_MIN = 15;
const SCALE_MAX = 40;

function BmiScale({ bmi }: { bmi: number }) {
  const c = usePalette();
  const position = (Math.min(SCALE_MAX, Math.max(SCALE_MIN, bmi)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 14, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
          {BMI_CATEGORIES.map((cat) => {
            const width = Math.min(cat.max, SCALE_MAX) - Math.max(cat.min, SCALE_MIN);
            return <View key={cat.id} style={{ flex: width, backgroundColor: c.bmi[cat.id], opacity: 0.85 }} />;
          })}
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${position * 100}%`,
            marginLeft: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: c.card,
            borderWidth: 3,
            borderColor: c.text,
          }}
        />
      </View>
      <View style={styles.rowBetween}>
        {[SCALE_MIN, 18.5, 25, 30, SCALE_MAX].map((v) => (
          <T key={v} variant="small">
            {v}
          </T>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const c = usePalette();
  const { dispatch } = useStore();
  const profile = useProfile();
  const targets = useMemo(() => calculateTargets(profile), [profile]);
  const [confirmReset, setConfirmReset] = useState(false);
  const category = BMI_CATEGORIES.find((x) => x.id === targets.category)!;
  const range = healthyWeightRange(profile.heightCm);
  const { daily } = targets;
  const pctOfCalories = (grams: number, kcalPerGram: number) => Math.round(((grams * kcalPerGram) / daily.calories) * 100);

  return (
    <Screen>
      <Card title={profile.name ? `${profile.name}’s BMI` : 'Your BMI'}>
        <View style={[styles.row, { alignItems: 'baseline', gap: 12 }]}>
          <T variant="display" color={c.bmi[category.id]}>
            {targets.bmi.toFixed(1)}
          </T>
          <T variant="heading" color={c.bmi[category.id]}>
            {category.label}
          </T>
        </View>
        <BmiScale bmi={targets.bmi} />
        <T variant="muted">
          A healthy weight for your height is {formatWeight(range.min, profile.units)}–
          {formatWeight(range.max, profile.units)}.
        </T>
        <T variant="small">
          {profile.sex === 'male' ? 'Male' : 'Female'} · {profile.age} years · {formatHeight(profile.heightCm, profile.units)}{' '}
          · {formatWeight(profile.weightKg, profile.units)} ·{' '}
          {ACTIVITY_LEVELS.find((a) => a.id === profile.activity)!.label.toLowerCase()} ·{' '}
          {profile.diet === 'vegetarian' ? 'vegetarian' : 'eats everything'}
        </T>
        <Button label="Edit profile" variant="secondary" icon="create-outline" onPress={() => router.push('/edit-profile')} />
      </Card>

      <Card title="Goal">
        <Segmented<Goal>
          options={[
            { value: 'cut', label: 'Cutting' },
            { value: 'bulk', label: 'Bulking' },
          ]}
          value={profile.goal}
          onChange={(goal) => dispatch({ type: 'setProfile', profile: { ...profile, goal } })}
        />
        {targets.strategy !== profile.goal && (
          <T variant="heading" color={c.primary}>
            Plan: {STRATEGY_LABELS[targets.strategy]}
          </T>
        )}
        {targets.notes.map((n) => (
          <T key={n} variant="muted">
            {n}
          </T>
        ))}
      </Card>

      <Card title="Daily energy">
        <View style={styles.rowBetween}>
          <T variant="muted">Resting burn (BMR)</T>
          <T>{Math.round(targets.bmr).toLocaleString('en-US')} kcal</T>
        </View>
        <View style={styles.rowBetween}>
          <T variant="muted">Maintenance (with activity)</T>
          <T>{Math.round(targets.maintenance).toLocaleString('en-US')} kcal</T>
        </View>
        <View style={styles.rowBetween}>
          <T variant="heading">Your target</T>
          <T variant="heading" color={c.primary}>
            {daily.calories.toLocaleString('en-US')} kcal
          </T>
        </View>
      </Card>

      <Card title="Daily macros">
        <View style={styles.rowBetween}>
          <T color={c.protein}>Protein</T>
          <T>
            {daily.protein} g · {pctOfCalories(daily.protein, 4)}%
          </T>
        </View>
        <View style={styles.rowBetween}>
          <T color={c.carbs}>Carbs</T>
          <T>
            {daily.carbs} g · {pctOfCalories(daily.carbs, 4)}%
          </T>
        </View>
        <View style={styles.rowBetween}>
          <T color={c.fat}>Fat</T>
          <T>
            {daily.fat} g · {pctOfCalories(daily.fat, 9)}%
          </T>
        </View>
        <View style={styles.rowBetween}>
          <T color={c.fiber}>Fiber</T>
          <T>at least {daily.fiber} g</T>
        </View>
        <View style={styles.rowBetween}>
          <T variant="muted">Saturated fat</T>
          <T>under {daily.saturatedFat} g</T>
        </View>
      </Card>

      <Card title="Daily vitamins & minerals">
        {MICRO_KEYS.map((k) => {
          const info = NUTRIENT_INFO[k];
          return (
            <View key={k} style={styles.rowBetween}>
              <T variant="muted">{info.label}</T>
              <T>
                {info.kind === 'limit' ? 'under ' : ''}
                {formatAmount(daily[k], info.unit)}
              </T>
            </View>
          );
        })}
        <T variant="small">
          Recommended Dietary Allowances for adults from the National Academies, adjusted for your sex and age.
        </T>
      </Card>

      <T variant="small" style={{ textAlign: 'center' }}>
        Forkcast offers general guidance, not medical advice. BMI doesn’t account for muscle mass, and targets don’t
        cover pregnancy or medical conditions — check with a professional if that applies to you.
      </T>

      {confirmReset ? (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirmReset(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Erase everything" variant="danger" icon="trash" onPress={() => dispatch({ type: 'reset' })} />
          </View>
        </View>
      ) : (
        <Button label="Reset profile & food log" variant="danger" onPress={() => setConfirmReset(true)} />
      )}
    </Screen>
  );
}
