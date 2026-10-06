/**
 * Body stats → BMI, calorie target and macro/micro targets.
 * Calories use the Mifflin-St Jeor equation. BMI category changes what the plan does:
 * underweight users can't cut, overweight/obese users get a lean surplus when bulking,
 * and protein is based on the top of the healthy range when BMI is in the obese range.
 */

export type Sex = 'm' | 'f';
export type Goal = 'cut' | 'bulk';
export type Pace = 'gentle' | 'standard' | 'fast';
export type Diet = 'any' | 'nopork' | 'pesc' | 'veg' | 'vegan';
export type Cutoffs = 'who' | 'asia';
export type Units = 'metric' | 'imperial';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: number;
  goal: Goal;
  pace: Pace;
  diet: Diet;
  cutoffs: Cutoffs;
  units: Units;
}

export const LB = 0.45359237;

export const ACTIVITY = [
  { value: 1.2, label: 'Mostly sitting', hint: 'Desk job, little exercise' },
  { value: 1.375, label: 'Lightly active', hint: 'Exercise 1 to 3 days a week' },
  { value: 1.55, label: 'Moderately active', hint: 'Exercise 3 to 5 days a week' },
  { value: 1.725, label: 'Very active', hint: 'Hard training 6 to 7 days a week' },
  { value: 1.9, label: 'Athlete', hint: 'Twice-a-day training or a physical job' },
] as const;

export const DIETS: { value: Diet; label: string }[] = [
  { value: 'any', label: 'Anything' },
  { value: 'nopork', label: 'No pork' },
  { value: 'pesc', label: 'Pescatarian' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

export const MICROS: [key: 'va' | 'vc' | 'vd' | 'b12' | 'fol' | 'ca' | 'fe' | 'mg' | 'k' | 'zn', name: string, unit: string][] = [
  ['va', 'Vitamin A', 'µg'], ['vc', 'Vitamin C', 'mg'], ['vd', 'Vitamin D', 'µg'], ['b12', 'Vitamin B12', 'µg'], ['fol', 'Folate', 'µg'],
  ['ca', 'Calcium', 'mg'], ['fe', 'Iron', 'mg'], ['mg', 'Magnesium', 'mg'], ['k', 'Potassium', 'mg'], ['zn', 'Zinc', 'mg'],
];
export type MicroKey = (typeof MICROS)[number][0];

/* ---------------- Formatting ---------------- */
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-US');
export const fmtG = (n: number) => (Math.abs(n) < 10 ? fmt1(n) : fmt(n));
export const fmtW = (kg: number, units: Units) => (units === 'imperial' ? `${fmt1(kg / LB)} lb` : `${fmt1(kg)} kg`);
export const fmtWr = (lo: number, hi: number, units: Units) =>
  units === 'imperial' ? `${fmt(lo / LB)} to ${fmt(hi / LB)} lb` : `${fmt1(lo)} to ${fmt1(hi)} kg`;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/* ---------------- Targets ---------------- */
export function microTargets(sex: Sex, age: number): Record<MicroKey, number> {
  const m = sex === 'm';
  return {
    va: m ? 900 : 700,
    vc: m ? 90 : 75,
    vd: age > 70 ? 20 : 15,
    b12: 2.4,
    fol: 400,
    ca: (!m && age > 50) || age > 70 ? 1200 : 1000,
    fe: m ? 8 : age > 50 ? 8 : 18,
    mg: m ? (age > 30 ? 420 : 400) : age > 30 ? 320 : 310,
    k: m ? 3400 : 2600,
    zn: m ? 11 : 8,
  };
}

export type BmiKey = 'under' | 'normal' | 'over' | 'obese';
export function bmiInfo(bmi: number, cutoffs: Cutoffs) {
  const bands: [number, number, number] = cutoffs === 'asia' ? [18.5, 23, 25] : [18.5, 25, 30];
  const key: BmiKey = bmi < bands[0] ? 'under' : bmi < bands[1] ? 'normal' : bmi < bands[2] ? 'over' : 'obese';
  const label = { under: 'Underweight', normal: 'Healthy weight', over: 'Overweight', obese: 'Obese' }[key];
  return { key, label, bands };
}

export interface Note { text: string; warn?: boolean }
export type Mode = 'cut' | 'bulk' | 'maintain';
export interface Targets {
  bmi: number;
  info: ReturnType<typeof bmiInfo>;
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  satLimit: number;
  weekly: number;
  mode: Mode;
  summary: string;
  notes: Note[];
  refW: number;
  healthyLo: number;
  healthyHi: number;
  micro: Record<MicroKey, number>;
}

export function computeTargets(p: Profile): Targets {
  const h = p.heightCm / 100;
  const w = p.weightKg;
  const units = p.units;
  const bmi = w / (h * h);
  const info = bmiInfo(bmi, p.cutoffs);
  const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * p.activity;
  const upperNormal = info.bands[1] - 0.1;
  const healthyLo = info.bands[0] * h * h;
  const healthyHi = upperNormal * h * h;
  const floor = p.sex === 'm' ? 1500 : 1200;
  const b = bmi.toFixed(1);
  const notes: Note[] = [];
  let mode: Mode = p.goal;
  let kcal: number;
  let summary: string;

  if (p.goal === 'cut') {
    if (info.key === 'under') {
      mode = 'maintain';
      kcal = tdee;
      summary = `Your BMI of ${b} is in the underweight range, so the plan holds you at maintenance instead of cutting.`;
      notes.push({ warn: true, text: `Cutting from a BMI under ${info.bands[0]} risks losing muscle and bone. If you want a leaner look, a lean bulk with strength training is the safer route. If weight has been dropping without trying, talk to a doctor.` });
    } else {
      let pct = { gentle: 0.12, standard: 0.2, fast: 0.25 }[p.pace] ?? 0.2;
      if (p.pace === 'fast' && info.key === 'normal') {
        pct = 0.2;
        notes.push({ text: `Fast cuts are held back for BMI in the overweight range and above. At ${b} you'll keep more muscle at the standard pace, so the plan uses that.` });
      }
      kcal = tdee - Math.min(tdee * pct, 1000);
      if (kcal < floor) {
        kcal = floor;
        notes.push({ text: `Your target is held at ${fmt(floor)} kcal, the usual minimum for ${p.sex === 'm' ? 'men' : 'women'} without medical supervision.` });
      }
      if (info.key === 'normal') {
        summary = `Your BMI of ${b} is already in the healthy range, so this is a lean-out cut: a modest deficit with high protein to keep muscle while you lose fat.`;
      } else {
        summary = `Your BMI of ${b} is in the ${info.label.toLowerCase()} range, so the plan uses a calorie deficit to bring it down toward the healthy range.`;
        notes.push({ text: `The healthy weight range for your height is ${fmtWr(healthyLo, healthyHi, units)}.` });
      }
    }
  } else {
    let pct = { gentle: 0.08, standard: 0.12, fast: 0.15 }[p.pace] ?? 0.12;
    if (info.key === 'obese') {
      pct = Math.min(pct, 0.05);
      summary = `Your BMI of ${b} is in the obese range, so the plan uses a very small surplus.`;
      notes.push({ warn: true, text: 'Lifting at a small surplus (or at maintenance) still builds muscle while keeping fat gain low. Many people at this BMI get better results from a cut first.' });
    } else if (info.key === 'over') {
      pct = Math.min(pct, 0.08);
      summary = `Your BMI of ${b} is in the overweight range, so the plan keeps the surplus lean to limit fat gain.`;
      if (p.pace !== 'gentle') notes.push({ text: 'Above the healthy BMI range the plan uses the lean pace whichever pace you pick, since a bigger surplus mostly adds fat.' });
    } else if (info.key === 'under') {
      summary = `Your BMI of ${b} is in the underweight range, so bulking is a good call. The plan adds a calorie surplus to move you toward the healthy range.`;
      notes.push({ text: `The healthy weight range for your height is ${fmtWr(healthyLo, healthyHi, units)}.` });
    } else {
      summary = `Your BMI of ${b} is in the healthy range, which gives you room to gain. The plan adds a surplus to build muscle.`;
    }
    kcal = tdee + Math.min(tdee * pct, 500);
  }
  kcal = Math.round(kcal / 10) * 10;

  let refW = w;
  if (bmi >= info.bands[2]) {
    refW = upperNormal * h * h;
    notes.push({ text: `Protein is set from ${fmtW(refW, units)} (the top of the healthy range for your height) rather than your current weight, which keeps the target realistic.` });
  }
  const gPerKg = mode === 'cut' ? 2.0 : 1.8;
  let protein = Math.round(refW * gPerKg);
  let fat = Math.round(Math.max((kcal * 0.25) / 9, 0.6 * refW));
  let carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (carbs < 100) {
    fat = Math.round(Math.max(0.6 * refW, (kcal * 0.2) / 9));
    carbs = (kcal - protein * 4 - fat * 9) / 4;
  }
  if (carbs < 80) {
    protein = Math.round(refW * 1.6);
    carbs = (kcal - protein * 4 - fat * 9) / 4;
  }
  carbs = Math.max(0, Math.round(carbs));

  return {
    bmi, info, bmr, tdee, kcal, protein, fat, carbs, mode, summary, notes, refW, healthyLo, healthyHi,
    weekly: ((kcal - tdee) * 7) / 7700,
    fiber: Math.round((kcal / 1000) * 14),
    satLimit: Math.round((kcal * 0.1) / 9),
    micro: microTargets(p.sex, p.age),
  };
}

export function validateProfile(p: Partial<Profile>): string | null {
  if (!p.sex) return 'Choose male or female so the calorie formula can run.';
  if (!(p.age! >= 18 && p.age! <= 100)) return 'Enter an age from 18 to 100.';
  if (!(p.heightCm! >= 120 && p.heightCm! <= 230)) return p.units === 'imperial' ? 'Enter a height from 4 ft to 7 ft 6 in.' : 'Enter a height from 120 to 230 cm.';
  if (!(p.weightKg! >= 30 && p.weightKg! <= 300)) return p.units === 'imperial' ? 'Enter a weight from 66 to 660 lb.' : 'Enter a weight from 30 to 300 kg.';
  return null;
}

export const modeWord = (m: Mode) => (m === 'cut' ? 'cutting' : m === 'bulk' ? 'bulking' : 'maintenance');
