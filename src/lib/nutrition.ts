import { emptyNutrients, type Nutrients } from './nutrients';

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type Goal = 'cut' | 'bulk';
export type Diet = 'omnivore' | 'vegetarian';
export type Units = 'metric' | 'imperial';

export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  diet: Diet;
  units: Units;
};

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; detail: string; factor: number }[] = [
  { id: 'sedentary', label: 'Sedentary', detail: 'Desk job, little exercise', factor: 1.2 },
  { id: 'light', label: 'Lightly active', detail: 'Exercise 1–3 days a week', factor: 1.375 },
  { id: 'moderate', label: 'Moderately active', detail: 'Exercise 3–5 days a week', factor: 1.55 },
  { id: 'active', label: 'Very active', detail: 'Hard exercise 6–7 days a week', factor: 1.725 },
  { id: 'veryActive', label: 'Athlete', detail: 'Physical job or twice-a-day training', factor: 1.9 },
];

export const MIN_AGE = 18;
export const MAX_AGE = 100;

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export const BMI_CATEGORIES: { id: BmiCategory; label: string; min: number; max: number }[] = [
  { id: 'underweight', label: 'Underweight', min: 0, max: 18.5 },
  { id: 'healthy', label: 'Healthy weight', min: 18.5, max: 25 },
  { id: 'overweight', label: 'Overweight', min: 25, max: 30 },
  { id: 'obese', label: 'Obese', min: 30, max: Infinity },
];

export function calculateBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): BmiCategory {
  return BMI_CATEGORIES.find((c) => bmi < c.max)!.id;
}

/** Weight range (kg) that corresponds to a healthy BMI of 18.5–24.9 at this height. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m2 = (heightCm / 100) ** 2;
  return { min: 18.5 * m2, max: 24.9 * m2 };
}

/** Basal metabolic rate, Mifflin–St Jeor equation. */
export function calculateBmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((a) => a.id === level)!.factor;
}

/**
 * Calorie adjustment relative to maintenance, chosen from the user's goal and BMI.
 * Larger deficits are only used where there is more weight to lose, and surpluses
 * shrink as BMI rises so bulking stays lean.
 */
const CALORIE_ADJUSTMENT: Record<Goal, Record<BmiCategory, number>> = {
  cut: { underweight: 0, healthy: -0.15, overweight: -0.2, obese: -0.25 },
  bulk: { underweight: 0.15, healthy: 0.1, overweight: 0.05, obese: 0 },
};

/** Never recommend fewer calories than this, regardless of goal. */
const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

/** Protein per kg of reference body weight. Eating below a surplus needs more to preserve muscle. */
const PROTEIN_PER_KG: Record<Targets['strategy'], number> = { cut: 2.0, recomp: 2.0, bulk: 1.8, maintain: 1.8 };

const FAT_SHARE = 0.25;
const MIN_FAT_PER_KG = 0.6;

export type Targets = {
  bmi: number;
  category: BmiCategory;
  bmr: number;
  maintenance: number;
  /** Fractional change from maintenance, e.g. -0.2 for a 20% deficit. */
  adjustment: number;
  /** What the plan actually does after BMI safety checks. */
  strategy: 'cut' | 'bulk' | 'maintain' | 'recomp';
  daily: Nutrients;
  notes: string[];
};

export function calculateTargets(p: Profile): Targets {
  const bmi = calculateBmi(p.weightKg, p.heightCm);
  const category = bmiCategory(bmi);
  const bmr = calculateBmr(p);
  const maintenance = bmr * activityFactor(p.activity);
  const notes: string[] = [];

  const adjustment = CALORIE_ADJUSTMENT[p.goal][category];
  let strategy: Targets['strategy'] = p.goal;
  if (p.goal === 'cut' && category === 'underweight') {
    strategy = 'maintain';
    notes.push(
      'Your BMI is in the underweight range, so cutting isn’t recommended. Your plan is set to maintenance — consider talking to a doctor or dietitian.',
    );
  } else if (p.goal === 'bulk' && category === 'obese') {
    strategy = 'recomp';
    notes.push(
      'Your BMI is in the obese range, so your plan keeps calories at maintenance with high protein. Paired with strength training this builds muscle while you lose fat (body recomposition).',
    );
  } else if (p.goal === 'bulk' && category === 'overweight') {
    notes.push('Your BMI is in the overweight range, so you get a small surplus (lean bulk) to limit fat gain.');
  } else if (p.goal === 'bulk' && category === 'underweight') {
    notes.push('Your BMI is in the underweight range, so you get a larger surplus to help you reach a healthy weight.');
  } else if (p.goal === 'cut') {
    notes.push(
      `A ${Math.round(-adjustment * 100)}% deficit suits your BMI and should mean roughly ${formatWeeklyChange(maintenance * adjustment, p.units)} per week.`,
    );
  } else {
    notes.push(
      `A ${Math.round(adjustment * 100)}% surplus suits your BMI and should mean roughly ${formatWeeklyChange(maintenance * adjustment, p.units)} per week.`,
    );
  }

  let calories = maintenance * (1 + adjustment);
  const floor = CALORIE_FLOOR[p.sex];
  if (calories < floor) {
    calories = floor;
    notes.push(`Calories are held at a minimum of ${floor} kcal/day for safety.`);
  }
  calories = Math.round(calories / 10) * 10;

  // Protein is based on the weight at a BMI of 25 when the user is above it, so
  // targets don't scale with body fat.
  const referenceKg = Math.min(p.weightKg, 25 * (p.heightCm / 100) ** 2);
  const protein = Math.round(PROTEIN_PER_KG[strategy] * referenceKg);
  const fat = Math.round(Math.max((calories * FAT_SHARE) / 9, MIN_FAT_PER_KG * referenceKg));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  const daily = emptyNutrients();
  daily.calories = calories;
  daily.protein = protein;
  daily.carbs = carbs;
  daily.fat = fat;
  daily.fiber = Math.round((14 * calories) / 1000);
  daily.saturatedFat = Math.round((calories * 0.1) / 9);
  Object.assign(daily, microTargets(p.sex, p.age));

  return { bmi, category, bmr, maintenance, adjustment, strategy, daily, notes };
}

/** ~7,700 kcal per kg of body weight. */
function formatWeeklyChange(dailyKcal: number, units: Units): string {
  const kg = Math.abs(dailyKcal * 7) / 7700;
  return units === 'imperial' ? `${(kg * 2.20462).toFixed(1)} lb` : `${kg.toFixed(2)} kg`;
}

/**
 * Daily micronutrient goals for adults: RDA where one exists, otherwise Adequate
 * Intake (vitamin K, potassium). Sodium is the chronic-disease-risk limit.
 * Source: National Academies Dietary Reference Intakes (via NIH ODS fact sheets).
 * Pregnancy and lactation are not covered.
 */
export function microTargets(sex: Sex, age: number) {
  const male = sex === 'male';
  return {
    vitaminA: male ? 900 : 700,
    vitaminC: male ? 90 : 75,
    vitaminD: age > 70 ? 20 : 15,
    vitaminE: 15,
    vitaminK: male ? 120 : 90,
    vitaminB6: age <= 50 ? 1.3 : male ? 1.7 : 1.5,
    vitaminB12: 2.4,
    folate: 400,
    calcium: (male && age > 70) || (!male && age > 50) ? 1200 : 1000,
    iron: male || age > 50 ? 8 : 18,
    magnesium: male ? (age <= 30 ? 400 : 420) : age <= 30 ? 310 : 320,
    potassium: male ? 3400 : 2600,
    zinc: male ? 11 : 8,
    sodium: 2300,
  };
}

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * CM_PER_IN;
}

export function formatWeight(kg: number, units: Units): string {
  return units === 'imperial' ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg * 10) / 10} kg`;
}

export function formatHeight(cm: number, units: Units): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { ft, inches } = cmToFtIn(cm);
  return `${ft}′${inches}″`;
}

export const STRATEGY_LABELS: Record<Targets['strategy'], string> = {
  cut: 'Cutting',
  bulk: 'Bulking',
  maintain: 'Maintenance',
  recomp: 'Recomposition',
};
