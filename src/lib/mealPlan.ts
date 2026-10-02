import { getFood, isAllowedForDiet, nutrientsFor } from './foods';
import { sumNutrients, type Nutrients } from './nutrients';
import type { Diet, Goal } from './nutrition';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

/** Share of the day's targets assigned to each meal. Bulking moves more into snacks. */
export const SLOT_SHARE: Record<Goal, Record<MealSlot, number>> = {
  cut: { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 },
  bulk: { breakfast: 0.25, lunch: 0.25, dinner: 0.3, snack: 0.2 },
};

/**
 * Components with the same role are scaled together. `fixed` components (vegetables,
 * fruit toppings) keep their portion so every meal stays balanced.
 */
type Role = 'protein' | 'carb' | 'fat' | 'fixed';
type Component = { food: string; grams: number; role: Role };

export type MealTemplate = {
  id: string;
  name: string;
  slot: MealSlot;
  goals: Goal[];
  components: Component[];
};

const BOTH: Goal[] = ['cut', 'bulk'];

function c(food: string, grams: number, role: Role): Component {
  return { food, grams, role };
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  // Breakfast
  { id: 'b-protein-oats', name: 'Protein oats with blueberries', slot: 'breakfast', goals: BOTH, components: [
    c('oats', 50, 'carb'), c('whey', 30, 'protein'), c('blueberries', 75, 'fixed'), c('peanut-butter', 16, 'fat')] },
  { id: 'b-eggs-toast', name: 'Eggs & avocado toast with an orange', slot: 'breakfast', goals: BOTH, components: [
    c('egg', 100, 'protein'), c('egg-white', 100, 'protein'), c('wholewheat-bread', 64, 'carb'),
    c('orange', 131, 'carb'), c('avocado', 40, 'fat'), c('spinach', 30, 'fixed')] },
  { id: 'b-yogurt-bowl', name: 'Greek yogurt bowl with strawberries', slot: 'breakfast', goals: BOTH, components: [
    c('greek-yogurt', 250, 'protein'), c('oats', 30, 'carb'), c('honey', 10, 'carb'),
    c('strawberries', 100, 'fixed'), c('almonds', 15, 'fat')] },
  { id: 'b-tofu-scramble', name: 'Tofu scramble on toast with a banana', slot: 'breakfast', goals: BOTH, components: [
    c('tofu', 150, 'protein'), c('wholewheat-bread', 64, 'carb'), c('banana', 118, 'carb'),
    c('bell-pepper', 60, 'fixed'), c('spinach', 30, 'fixed'), c('olive-oil', 5, 'fat')] },
  { id: 'b-pb-banana', name: 'Peanut butter banana toast + protein milk', slot: 'breakfast', goals: ['bulk'], components: [
    c('wholewheat-bread', 64, 'carb'), c('banana', 118, 'carb'), c('peanut-butter', 32, 'fat'),
    c('milk', 300, 'protein'), c('whey', 20, 'protein')] },
  { id: 'b-cottage-berries', name: 'Cottage cheese & berries with toast', slot: 'breakfast', goals: ['cut'], components: [
    c('cottage-cheese', 200, 'protein'), c('blueberries', 75, 'fixed'), c('wholewheat-bread', 32, 'carb'),
    c('walnuts', 10, 'fat')] },

  // Lunch
  { id: 'l-chicken-rice', name: 'Chicken, rice & broccoli bowl', slot: 'lunch', goals: BOTH, components: [
    c('chicken-breast', 120, 'protein'), c('brown-rice', 150, 'carb'), c('broccoli', 120, 'fixed'),
    c('olive-oil', 7, 'fat')] },
  { id: 'l-tuna-potato', name: 'Tuna & potato salad', slot: 'lunch', goals: BOTH, components: [
    c('tuna', 120, 'protein'), c('potato', 200, 'carb'), c('romaine', 75, 'fixed'), c('tomato', 100, 'fixed'),
    c('olive-oil', 10, 'fat')] },
  { id: 'l-chickpea-quinoa', name: 'Chickpea quinoa salad with eggs', slot: 'lunch', goals: BOTH, components: [
    c('chickpeas', 120, 'protein'), c('egg', 100, 'protein'), c('quinoa', 120, 'carb'), c('tomato', 100, 'fixed'),
    c('bell-pepper', 60, 'fixed'), c('olive-oil', 8, 'fat')] },
  { id: 'l-beef-pasta', name: 'Beef & tomato pasta', slot: 'lunch', goals: ['bulk'], components: [
    c('lean-beef', 120, 'protein'), c('pasta', 180, 'carb'), c('tomato', 120, 'fixed'), c('spinach', 30, 'fixed'),
    c('cheddar', 15, 'fat')] },
  { id: 'l-tofu-stirfry', name: 'Tofu veggie stir-fry with rice', slot: 'lunch', goals: BOTH, components: [
    c('tofu', 200, 'protein'), c('white-rice', 150, 'carb'), c('broccoli', 100, 'fixed'),
    c('bell-pepper', 75, 'fixed'), c('olive-oil', 8, 'fat')] },
  { id: 'l-salmon-salad', name: 'Salmon & sweet potato salad', slot: 'lunch', goals: ['cut'], components: [
    c('salmon', 120, 'protein'), c('sweet-potato', 150, 'carb'), c('spinach', 60, 'fixed'), c('tomato', 80, 'fixed')] },

  // Dinner
  { id: 'd-salmon-quinoa', name: 'Baked salmon, quinoa & green beans', slot: 'dinner', goals: BOTH, components: [
    c('salmon', 130, 'protein'), c('quinoa', 150, 'carb'), c('green-beans', 120, 'fixed'), c('olive-oil', 5, 'fat')] },
  { id: 'd-chicken-potato', name: 'Roast chicken with potatoes & carrots', slot: 'dinner', goals: BOTH, components: [
    c('chicken-breast', 140, 'protein'), c('potato', 250, 'carb'), c('carrots', 80, 'fixed'),
    c('green-beans', 100, 'fixed'), c('olive-oil', 10, 'fat')] },
  { id: 'd-beef-chili', name: 'Beef & bean chili with rice', slot: 'dinner', goals: BOTH, components: [
    c('lean-beef', 120, 'protein'), c('black-beans', 120, 'carb'), c('white-rice', 100, 'carb'),
    c('tomato', 150, 'fixed'), c('bell-pepper', 60, 'fixed'), c('cheddar', 15, 'fat')] },
  { id: 'd-burrito-bowl', name: 'Tofu & black bean burrito bowl', slot: 'dinner', goals: BOTH, components: [
    c('tofu', 150, 'protein'), c('black-beans', 100, 'carb'), c('brown-rice', 120, 'carb'), c('tomato', 80, 'fixed'),
    c('romaine', 50, 'fixed'), c('avocado', 50, 'fat')] },
  { id: 'd-lentil-curry', name: 'Lentil & spinach curry with yogurt', slot: 'dinner', goals: BOTH, components: [
    c('lentils', 200, 'protein'), c('greek-yogurt', 120, 'protein'), c('brown-rice', 120, 'carb'),
    c('spinach', 60, 'fixed'), c('tomato', 100, 'fixed'), c('olive-oil', 8, 'fat')] },
  { id: 'd-chicken-pasta', name: 'Chicken & spinach pasta', slot: 'dinner', goals: BOTH, components: [
    c('chicken-breast', 120, 'protein'), c('pasta', 160, 'carb'), c('tomato', 120, 'fixed'),
    c('spinach', 40, 'fixed'), c('olive-oil', 8, 'fat')] },

  // Snacks
  { id: 's-yogurt-berries', name: 'Greek yogurt & blueberries', slot: 'snack', goals: BOTH, components: [
    c('greek-yogurt', 170, 'protein'), c('blueberries', 75, 'fixed'), c('honey', 10, 'carb'), c('almonds', 10, 'fat')] },
  { id: 's-apple-pb', name: 'Apple & peanut butter', slot: 'snack', goals: BOTH, components: [
    c('apple', 182, 'carb'), c('peanut-butter', 16, 'fat')] },
  { id: 's-cottage-berries', name: 'Cottage cheese & strawberries', slot: 'snack', goals: ['cut'], components: [
    c('cottage-cheese', 150, 'protein'), c('strawberries', 150, 'carb'), c('walnuts', 7, 'fat')] },
  { id: 's-shake', name: 'Mass-gainer shake', slot: 'snack', goals: ['bulk'], components: [
    c('milk', 300, 'protein'), c('whey', 30, 'protein'), c('banana', 118, 'carb'), c('oats', 40, 'carb'),
    c('peanut-butter', 16, 'fat')] },
  { id: 's-trail-mix', name: 'Trail mix & a glass of milk', slot: 'snack', goals: ['bulk'], components: [
    c('milk', 250, 'protein'), c('raisins', 30, 'carb'), c('almonds', 25, 'fat')] },
  { id: 's-eggs-orange', name: 'Boiled eggs, carrots & an orange', slot: 'snack', goals: ['cut'], components: [
    c('egg', 100, 'protein'), c('carrots', 100, 'fixed'), c('orange', 131, 'carb')] },
];

export type MacroTarget = Pick<Nutrients, 'calories' | 'protein' | 'carbs' | 'fat'>;
export type PlannedItem = { foodId: string; grams: number };
export type PlannedMeal = {
  templateId: string;
  name: string;
  slot: MealSlot;
  items: PlannedItem[];
  totals: Nutrients;
  /** Weighted relative distance from the target; 0 is a perfect match. */
  fitError: number;
};

const FIT_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const;
const FIT_WEIGHTS: MacroTarget = { calories: 4, protein: 1.5, carbs: 1, fat: 1 };
const SCALED_ROLES = ['protein', 'carb', 'fat'] as const;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
/**
 * How far one role may stray from the meal's overall scale. Without a limit the fit
 * happily swaps one food's protein for another's (e.g. less tofu, five slices of toast).
 */
const MAX_SPREAD = 1.8;
/** Below this many calories a meal isn't worth recommending. */
export const MIN_MEAL_CALORIES = 100;
/** Meals within this fit error of the best one count as equally good for daily rotation. */
export const NEAR_BEST_MARGIN = 0.05;

function fitError(totals: MacroTarget, target: MacroTarget): number {
  let sum = 0;
  let weights = 0;
  for (const k of FIT_KEYS) {
    const t = Math.max(target[k], 1);
    sum += FIT_WEIGHTS[k] * ((totals[k] - t) / t) ** 2;
    weights += FIT_WEIGHTS[k];
  }
  return Math.sqrt(sum / weights);
}

function roundPortion(foodId: string, grams: number): number {
  const { unit } = getFood(foodId);
  if (unit) return Math.max(1, Math.round(grams / unit.grams)) * unit.grams;
  if (grams < 30) return Math.max(1, Math.round(grams));
  if (grams < 100) return Math.round(grams / 5) * 5;
  return Math.round(grams / 10) * 10;
}

/**
 * Scales a template's protein, carb and fat components so the meal lands as close as
 * possible to `target`. Each role's scale factor is solved by coordinate descent on a
 * weighted least-squares error (the error is quadratic in each factor, so every step has
 * a closed-form optimum). Factors are clamped near the meal's overall scale so portions
 * stay realistic.
 */
export function scaleTemplate(template: MealTemplate, target: MacroTarget): PlannedMeal {
  const contribution = (role: Role) =>
    sumNutrients(template.components.filter((x) => x.role === role).map((x) => nutrientsFor(x.food, x.grams)));
  const fixed = contribution('fixed');
  const roles = SCALED_ROLES.filter((r) => template.components.some((x) => x.role === r));
  const base = Object.fromEntries(roles.map((r) => [r, contribution(r)])) as Record<Role, Nutrients>;
  const scaledCalories = roles.reduce((acc, r) => acc + base[r].calories, 0);
  const overall = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (target.calories - fixed.calories) / scaledCalories));
  const lo = Math.max(MIN_SCALE, overall / MAX_SPREAD);
  const hi = Math.min(MAX_SCALE, overall * MAX_SPREAD);
  const scale = Object.fromEntries(roles.map((r) => [r, overall])) as Record<Role, number>;

  for (let iter = 0; iter < 40; iter++) {
    for (const role of roles) {
      let num = 0;
      let den = 0;
      for (const k of FIT_KEYS) {
        const t = Math.max(target[k], 1);
        const others = roles.reduce((acc, r) => (r === role ? acc : acc + scale[r] * base[r][k]), fixed[k]);
        const w = FIT_WEIGHTS[k] / (t * t);
        num += w * (others - target[k]) * base[role][k];
        den += w * base[role][k] ** 2;
      }
      if (den > 0) scale[role] = Math.min(hi, Math.max(lo, -num / den));
    }
  }

  const items = template.components.map((x) => ({
    foodId: x.food,
    grams: roundPortion(x.food, x.role === 'fixed' ? x.grams : x.grams * scale[x.role]),
  }));
  const totals = sumNutrients(items.map((i) => nutrientsFor(i.foodId, i.grams)));
  return {
    templateId: template.id,
    name: template.name,
    slot: template.slot,
    items,
    totals,
    fitError: fitError(totals, target),
  };
}

/** All suitable meals for a slot, best fit first. Empty when the target is too small to bother. */
export function recommendMeals(
  slot: MealSlot,
  target: MacroTarget,
  prefs: { goal: Goal; diet: Diet },
): PlannedMeal[] {
  if (target.calories < MIN_MEAL_CALORIES) return [];
  return MEAL_TEMPLATES.filter(
    (t) =>
      t.slot === slot &&
      t.goals.includes(prefs.goal) &&
      t.components.every((x) => isAllowedForDiet(getFood(x.food), prefs.diet)),
  )
    .map((t) => scaleTemplate(t, target))
    .sort((a, b) => a.fitError - b.fitError);
}

/**
 * Picks which recommendation to show first. Rotates by day among the meals that fit
 * nearly as well as the best one, so the plan varies without sacrificing accuracy.
 */
export function defaultChoice(meals: PlannedMeal[], seed: number): number {
  if (meals.length === 0) return 0;
  const good = meals.filter((m) => m.fitError <= meals[0].fitError + NEAR_BEST_MARGIN).length;
  return ((seed % good) + good) % good;
}

/**
 * Splits whatever is left of today's targets across the meals that haven't been
 * logged yet, in proportion to their usual share. Logged meals get `null`.
 */
export function remainingMealTargets(
  daily: MacroTarget,
  goal: Goal,
  eatenBySlot: Record<MealSlot, MacroTarget>,
): Record<MealSlot, MacroTarget | null> {
  const open = MEAL_SLOTS.map((s) => s.id).filter((s) => eatenBySlot[s].calories <= 0);
  const shareSum = open.reduce((acc, s) => acc + SLOT_SHARE[goal][s], 0);
  const remaining = {} as MacroTarget;
  for (const k of FIT_KEYS) {
    const eaten = MEAL_SLOTS.reduce((acc, s) => acc + eatenBySlot[s.id][k], 0);
    remaining[k] = Math.max(0, daily[k] - eaten);
  }

  const out = {} as Record<MealSlot, MacroTarget | null>;
  for (const { id } of MEAL_SLOTS) {
    if (!open.includes(id)) {
      out[id] = null;
      continue;
    }
    const share = SLOT_SHARE[goal][id] / shareSum;
    out[id] = {
      calories: remaining.calories * share,
      protein: remaining.protein * share,
      carbs: remaining.carbs * share,
      fat: remaining.fat * share,
    };
  }
  return out;
}
