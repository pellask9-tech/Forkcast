export const MACRO_KEYS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'saturatedFat',
] as const;

export const MICRO_KEYS = [
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'vitaminB6',
  'vitaminB12',
  'folate',
  'calcium',
  'iron',
  'magnesium',
  'potassium',
  'zinc',
  'sodium',
] as const;

export const NUTRIENT_KEYS = [...MACRO_KEYS, ...MICRO_KEYS] as const;

export type MacroKey = (typeof MACRO_KEYS)[number];
export type MicroKey = (typeof MICRO_KEYS)[number];
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number>;

/**
 * `target` nutrients are goals to reach, `limit` nutrients are ceilings to stay
 * under, and `info` nutrients are tracked without a daily goal.
 */
export type NutrientKind = 'target' | 'limit' | 'info';

export const NUTRIENT_INFO: Record<NutrientKey, { label: string; unit: string; kind: NutrientKind }> = {
  calories: { label: 'Calories', unit: 'kcal', kind: 'target' },
  protein: { label: 'Protein', unit: 'g', kind: 'target' },
  carbs: { label: 'Carbs', unit: 'g', kind: 'target' },
  fat: { label: 'Fat', unit: 'g', kind: 'target' },
  fiber: { label: 'Fiber', unit: 'g', kind: 'target' },
  sugar: { label: 'Sugars', unit: 'g', kind: 'info' },
  saturatedFat: { label: 'Saturated fat', unit: 'g', kind: 'limit' },
  vitaminA: { label: 'Vitamin A', unit: 'µg', kind: 'target' },
  vitaminC: { label: 'Vitamin C', unit: 'mg', kind: 'target' },
  vitaminD: { label: 'Vitamin D', unit: 'µg', kind: 'target' },
  vitaminE: { label: 'Vitamin E', unit: 'mg', kind: 'target' },
  vitaminK: { label: 'Vitamin K', unit: 'µg', kind: 'target' },
  vitaminB6: { label: 'Vitamin B6', unit: 'mg', kind: 'target' },
  vitaminB12: { label: 'Vitamin B12', unit: 'µg', kind: 'target' },
  folate: { label: 'Folate', unit: 'µg', kind: 'target' },
  calcium: { label: 'Calcium', unit: 'mg', kind: 'target' },
  iron: { label: 'Iron', unit: 'mg', kind: 'target' },
  magnesium: { label: 'Magnesium', unit: 'mg', kind: 'target' },
  potassium: { label: 'Potassium', unit: 'mg', kind: 'target' },
  zinc: { label: 'Zinc', unit: 'mg', kind: 'target' },
  sodium: { label: 'Sodium', unit: 'mg', kind: 'limit' },
};

export function emptyNutrients(): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients;
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = emptyNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k];
  return out;
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = emptyNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = n[k] * factor;
  return out;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce(addNutrients, emptyNutrients());
}

/** Formats an amount with precision suited to its size (e.g. 0.42 mg, 12 g, 1,240 kcal). */
export function formatAmount(value: number, unit: string): string {
  const abs = Math.abs(value);
  const digits = abs >= 10 || abs === 0 ? 0 : 1;
  const text = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
  return unit === 'kcal' ? `${text} kcal` : `${text} ${unit}`;
}
