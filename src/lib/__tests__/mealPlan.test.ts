import { FOODS, describeAmount, getFood } from '../foods';
import {
  MEAL_SLOTS,
  MEAL_TEMPLATES,
  NEAR_BEST_MARGIN,
  defaultChoice,
  recommendMeals,
  remainingMealTargets,
  scaleTemplate,
  type MacroTarget,
  type MealSlot,
} from '../mealPlan';
import { NUTRIENT_KEYS } from '../nutrients';
import { calculateTargets, type Diet, type Goal, type Profile } from '../nutrition';

const nothingEaten = (): Record<MealSlot, MacroTarget> =>
  Object.fromEntries(MEAL_SLOTS.map((s) => [s.id, { calories: 0, protein: 0, carbs: 0, fat: 0 }])) as Record<
    MealSlot,
    MacroTarget
  >;

const profile = (overrides: Partial<Profile>): Profile => ({
  name: '',
  sex: 'male',
  age: 28,
  heightCm: 178,
  weightKg: 75,
  activity: 'moderate',
  goal: 'cut',
  diet: 'omnivore',
  units: 'metric',
  ...overrides,
});

describe('food database', () => {
  it('has a complete, non-negative nutrient row for every food', () => {
    for (const f of FOODS) {
      for (const k of NUTRIENT_KEYS) {
        expect(Number.isFinite(f.per100g[k])).toBe(true);
        expect(f.per100g[k]).toBeGreaterThanOrEqual(0);
      }
      // Calories should roughly agree with the macros (Atwater factors).
      const atwater = f.per100g.protein * 4 + f.per100g.carbs * 4 + f.per100g.fat * 9;
      expect(Math.abs(atwater - f.per100g.calories)).toBeLessThan(Math.max(25, f.per100g.calories * 0.15));
    }
  });

  it('describes unit foods by count', () => {
    expect(describeAmount('egg', 100)).toBe('2 eggs (100 g)');
    expect(describeAmount('banana', 118)).toBe('1 banana (118 g)');
    expect(describeAmount('oats', 45)).toBe('45 g');
  });
});

describe('meal templates', () => {
  it('only reference known foods', () => {
    for (const t of MEAL_TEMPLATES) for (const x of t.components) expect(() => getFood(x.food)).not.toThrow();
  });

  it.each([
    ['cut', 'omnivore'],
    ['bulk', 'omnivore'],
    ['cut', 'vegetarian'],
    ['bulk', 'vegetarian'],
  ] as [Goal, Diet][])('offer at least two options per meal for %s / %s', (goal, diet) => {
    for (const { id } of MEAL_SLOTS) {
      expect(recommendMeals(id, { calories: 500, protein: 30, carbs: 55, fat: 15 }, { goal, diet }).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('scaleTemplate', () => {
  it('keeps portions within a meal in proportion', () => {
    for (const t of MEAL_TEMPLATES) {
      for (const calories of [200, 400, 600, 900]) {
        for (const proteinShare of [0.18, 0.26, 0.33]) {
          const target = {
            calories,
            protein: (calories * proteinShare) / 4,
            carbs: (calories * (0.75 - proteinShare)) / 4,
            fat: (calories * 0.25) / 9,
          };
          const meal = scaleTemplate(t, target);
          const scales = t.components
            .map((x, i) => ({ role: x.role, scale: meal.items[i].grams / x.grams }))
            .filter((x) => x.role !== 'fixed')
            .map((x) => x.scale);
          // Whole-unit rounding (eggs, fruit, slices) can widen the spread a little.
          expect(Math.max(...scales) / Math.min(...scales)).toBeLessThanOrEqual(4.5);
        }
      }
    }
  });
});

describe('recommendMeals', () => {
  it('keeps vegetarian plans free of meat and fish', () => {
    for (const { id } of MEAL_SLOTS) {
      for (const meal of recommendMeals(id, { calories: 600, protein: 40, carbs: 60, fat: 20 }, { goal: 'bulk', diet: 'vegetarian' })) {
        for (const item of meal.items) expect(['meat', 'fish']).not.toContain(getFood(item.foodId).tag);
      }
    }
  });

  it('returns nothing when the remaining target is negligible', () => {
    expect(recommendMeals('snack', { calories: 50, protein: 2, carbs: 5, fat: 1 }, { goal: 'cut', diet: 'omnivore' })).toEqual([]);
  });

  it.each([
    profile({}),
    profile({ goal: 'bulk' }),
    profile({ sex: 'female', heightCm: 165, weightKg: 62 }),
    profile({ sex: 'female', heightCm: 165, weightKg: 62, goal: 'bulk', diet: 'vegetarian' }),
    profile({ weightKg: 105 }),
    profile({ sex: 'female', heightCm: 155, weightKg: 50, activity: 'sedentary', age: 60 }),
  ])('builds a full day close to the targets (%#)', (p) => {
    const { daily } = calculateTargets(p);
    const targets = remainingMealTargets(daily, p.goal, nothingEaten());
    const best = MEAL_SLOTS.map(({ id }) => recommendMeals(id, targets[id]!, p)[0]);
    const total = (k: keyof MacroTarget) => best.reduce((acc, m) => acc + m.totals[k], 0);

    expect(Math.abs(total('calories') - daily.calories) / daily.calories).toBeLessThan(0.05);
    expect(Math.abs(total('protein') - daily.protein) / daily.protein).toBeLessThan(0.1);
  });
});

describe('remainingMealTargets', () => {
  const daily = { calories: 2000, protein: 150, carbs: 200, fat: 60 };

  it('splits the full day by meal share when nothing is logged', () => {
    const t = remainingMealTargets(daily, 'cut', nothingEaten());
    expect(t.breakfast!.calories).toBeCloseTo(500);
    expect(t.lunch!.calories).toBeCloseTo(600);
    expect(t.snack!.calories).toBeCloseTo(300);
  });

  it('spreads what is left over the meals not yet logged', () => {
    const eaten = nothingEaten();
    eaten.breakfast = { calories: 800, protein: 30, carbs: 100, fat: 30 };
    const t = remainingMealTargets(daily, 'cut', eaten);
    expect(t.breakfast).toBeNull();
    const open = [t.lunch!, t.dinner!, t.snack!];
    expect(open.reduce((a, m) => a + m.calories, 0)).toBeCloseTo(1200);
    expect(open.reduce((a, m) => a + m.protein, 0)).toBeCloseTo(120);
    expect(t.lunch!.calories).toBeCloseTo(t.dinner!.calories);
  });

  it('never asks for negative amounts after overeating', () => {
    const eaten = nothingEaten();
    eaten.lunch = { calories: 2500, protein: 100, carbs: 300, fat: 90 };
    const t = remainingMealTargets(daily, 'bulk', eaten);
    expect(t.dinner!.calories).toBe(0);
    expect(t.dinner!.fat).toBe(0);
    expect(t.dinner!.protein).toBeGreaterThan(0);
  });
});

describe('defaultChoice', () => {
  it('rotates among near-best options only', () => {
    const meals = recommendMeals('lunch', { calories: 600, protein: 40, carbs: 70, fat: 15 }, { goal: 'cut', diet: 'omnivore' });
    const picks = new Set(Array.from({ length: 20 }, (_, day) => defaultChoice(meals, day)));
    for (const i of picks) expect(meals[i].fitError).toBeLessThanOrEqual(meals[0].fitError + NEAR_BEST_MARGIN);
    expect(defaultChoice([], 3)).toBe(0);
  });
});
