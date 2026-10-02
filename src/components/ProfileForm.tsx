import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  ACTIVITY_LEVELS,
  BMI_CATEGORIES,
  MAX_AGE,
  MIN_AGE,
  bmiCategory,
  calculateBmi,
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  type ActivityLevel,
  type Diet,
  type Goal,
  type Profile,
  type Sex,
  type Units,
} from '@/lib/nutrition';

import { usePalette } from './theme';
import { Button, Card, Field, Input, Segmented, styles, T } from './ui';

const GOALS: { value: Goal; title: string; detail: string }[] = [
  { value: 'cut', title: 'Cutting', detail: 'Lose fat while keeping muscle — a calorie deficit with high protein.' },
  { value: 'bulk', title: 'Bulking', detail: 'Build muscle and strength — a calorie surplus with plenty of carbs.' },
];

function parse(text: string): number {
  return Number(text.replace(',', '.'));
}

function trimNumber(n: number, digits = 1): string {
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
}

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Profile;
  submitLabel: string;
  onSubmit: (p: Profile) => void;
}) {
  const c = usePalette();
  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [units, setUnits] = useState<Units>(initial?.units ?? 'metric');
  const [heightCm, setHeightCm] = useState(initial ? trimNumber(initial.heightCm, 0) : '');
  const initialFtIn = initial ? cmToFtIn(initial.heightCm) : null;
  const [heightFt, setHeightFt] = useState(initialFtIn ? String(initialFtIn.ft) : '');
  const [heightIn, setHeightIn] = useState(initialFtIn ? String(initialFtIn.inches) : '');
  const [weight, setWeight] = useState(
    initial ? trimNumber(initial.units === 'imperial' ? kgToLb(initial.weightKg) : initial.weightKg) : '',
  );
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? 'moderate');
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? 'cut');
  const [diet, setDiet] = useState<Diet>(initial?.diet ?? 'omnivore');
  const [showErrors, setShowErrors] = useState(false);

  const cm = units === 'metric' ? parse(heightCm) : ftInToCm(parse(heightFt || '0'), parse(heightIn || '0'));
  const kg = units === 'metric' ? parse(weight) : lbToKg(parse(weight));
  const ageNum = parse(age);

  const errors = {
    age: !(Number.isInteger(ageNum) && ageNum >= MIN_AGE && ageNum <= MAX_AGE)
      ? `Enter an age from ${MIN_AGE} to ${MAX_AGE}. Forkcast's targets are for adults.`
      : null,
    height: !(cm >= 120 && cm <= 230) ? 'Enter a height between 120 and 230 cm (3′11″–7′7″).' : null,
    weight: !(kg >= 30 && kg <= 300) ? 'Enter a weight between 30 and 300 kg (66–660 lb).' : null,
  };
  const valid = !errors.age && !errors.height && !errors.weight;
  const bmi = !errors.height && !errors.weight ? calculateBmi(kg, cm) : null;
  const category = bmi ? BMI_CATEGORIES.find((x) => x.id === bmiCategory(bmi))! : null;

  function switchUnits(next: Units) {
    if (next === units) return;
    if (next === 'imperial') {
      if (cm > 0) {
        const { ft, inches } = cmToFtIn(cm);
        setHeightFt(String(ft));
        setHeightIn(String(inches));
      }
      if (kg > 0) setWeight(trimNumber(kgToLb(kg)));
    } else {
      if (cm > 0) setHeightCm(trimNumber(cm, 0));
      if (kg > 0) setWeight(trimNumber(kg));
    }
    setUnits(next);
  }

  function submit() {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    onSubmit({ name: name.trim(), sex, age: ageNum, heightCm: cm, weightKg: kg, activity, goal, diet, units });
  }

  const error = (msg: string | null) =>
    showErrors && msg ? (
      <T variant="small" color={c.danger}>
        {msg}
      </T>
    ) : null;

  return (
    <View style={{ gap: 16 }}>
      <Card title="About you">
        <Field label="Name (optional)">
          <Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        </Field>
        <Field label="Sex" hint="Used for calorie and nutrient targets.">
          <Segmented
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            value={sex}
            onChange={setSex}
          />
        </Field>
        <Field label="Age">
          <Input value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 28" suffix="years" />
          {error(errors.age)}
        </Field>
      </Card>

      <Card title="Body">
        <Segmented
          options={[
            { value: 'metric', label: 'kg / cm' },
            { value: 'imperial', label: 'lb / ft' },
          ]}
          value={units}
          onChange={switchUnits}
        />
        <Field label="Height">
          {units === 'metric' ? (
            <Input value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="e.g. 175" suffix="cm" />
          ) : (
            <View style={styles.row}>
              <Input style={{ flex: 1 }} value={heightFt} onChangeText={setHeightFt} keyboardType="number-pad" placeholder="5" suffix="ft" />
              <Input style={{ flex: 1 }} value={heightIn} onChangeText={setHeightIn} keyboardType="number-pad" placeholder="9" suffix="in" />
            </View>
          )}
          {error(errors.height)}
        </Field>
        <Field label="Weight">
          <Input
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={units === 'metric' ? 'e.g. 72' : 'e.g. 160'}
            suffix={units === 'metric' ? 'kg' : 'lb'}
          />
          {error(errors.weight)}
        </Field>
        {bmi && category && (
          <View style={[styles.rowBetween, { backgroundColor: c.track, borderRadius: 12, padding: 12 }]}>
            <T variant="muted">Your BMI</T>
            <T variant="heading" color={c.bmi[category.id]}>
              {bmi.toFixed(1)} · {category.label}
            </T>
          </View>
        )}
      </Card>

      <Card title="Your goal">
        {GOALS.map((g) => {
          const active = goal === g.value;
          return (
            <Pressable
              key={g.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setGoal(g.value)}
              style={{
                borderWidth: active ? 2 : 1,
                borderColor: active ? c.primary : c.border,
                backgroundColor: active ? c.primarySoft : c.card,
                borderRadius: 12,
                padding: 14,
                gap: 4,
              }}>
              <T variant="heading" color={active ? c.primary : undefined}>
                {g.title}
              </T>
              <T variant="muted">{g.detail}</T>
            </Pressable>
          );
        })}
      </Card>

      <Card title="Activity level">
        {ACTIVITY_LEVELS.map((a) => {
          const active = activity === a.id;
          return (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setActivity(a.id)}
              style={[styles.rowBetween, { paddingVertical: 4 }]}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: active ? '700' : '400' }}>{a.label}</T>
                <T variant="small">{a.detail}</T>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: active ? 7 : 2,
                  borderColor: active ? c.primary : c.border,
                }}
              />
            </Pressable>
          );
        })}
      </Card>

      <Card title="Food preference">
        <Segmented
          options={[
            { value: 'omnivore', label: 'Everything' },
            { value: 'vegetarian', label: 'Vegetarian' },
          ]}
          value={diet}
          onChange={setDiet}
        />
      </Card>

      <Button label={submitLabel} onPress={submit} icon="checkmark-circle" />
      {showErrors && !valid && (
        <T variant="small" color={c.danger} style={{ textAlign: 'center' }}>
          Fix the highlighted fields above.
        </T>
      )}
    </View>
  );
}
