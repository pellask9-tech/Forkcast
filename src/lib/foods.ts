import { NUTRIENT_KEYS, type Nutrients } from './nutrients';

export type FoodTag = 'meat' | 'fish' | 'dairy' | 'egg' | 'plant';

export type Food = {
  id: string;
  name: string;
  tag: FoodTag;
  /** A typical portion, used as the default amount when logging. */
  serving: { label: string; grams: number };
  /** Foods eaten in whole pieces (eggs, slices, fruit) are portioned in multiples of one piece. */
  unit?: { name: string; grams: number };
  per100g: Nutrients;
};

/**
 * Column order for the nutrient rows below (all values per 100 g, as eaten):
 *  kcal, protein g, carbs g, fat g, fiber g, sugars g, sat fat g,
 *  vit A µg RAE, vit C mg, vit D µg, vit E mg, vit K µg, B6 mg, B12 µg, folate µg DFE,
 *  calcium mg, iron mg, magnesium mg, potassium mg, zinc mg, sodium mg
 *
 * Values are rounded approximations of USDA FoodData Central (SR Legacy) entries.
 * Branded products vary, so treat them as estimates.
 */
type Row = [
  number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
  number, number, number, number, number, number,
];

function food(
  id: string,
  name: string,
  tag: FoodTag,
  serving: [label: string, grams: number],
  row: Row,
  unit?: [name: string, grams: number],
): Food {
  const per100g = Object.fromEntries(NUTRIENT_KEYS.map((k, i) => [k, row[i]])) as Nutrients;
  return {
    id,
    name,
    tag,
    serving: { label: serving[0], grams: serving[1] },
    unit: unit && { name: unit[0], grams: unit[1] },
    per100g,
  };
}

export const FOODS: Food[] = [
  // Protein foods
  food('chicken-breast', 'Chicken breast, roasted', 'meat', ['1 portion', 120],
    [165, 31, 0, 3.6, 0, 0, 1.0, 6, 0, 0.1, 0.3, 0.3, 0.6, 0.34, 4, 15, 1.04, 29, 256, 1.0, 74]),
  food('lean-beef', 'Lean ground beef 90/10, cooked', 'meat', ['1 portion', 120],
    [217, 26.1, 0, 11.7, 0, 0, 4.6, 4, 0, 0.1, 0.4, 1.2, 0.37, 2.6, 9, 12, 2.7, 22, 345, 6.3, 76]),
  food('salmon', 'Salmon, baked', 'fish', ['1 fillet', 130],
    [206, 22.1, 0, 12.4, 0, 0, 2.5, 15, 3.7, 11, 1.1, 0.5, 0.65, 2.8, 34, 15, 0.34, 30, 384, 0.43, 61]),
  food('tuna', 'Tuna, canned in water', 'fish', ['1 can, drained', 120],
    [116, 25.5, 0, 0.8, 0, 0, 0.23, 17, 0, 1.7, 0.33, 0, 0.32, 3.0, 4, 11, 1.53, 27, 237, 0.77, 300]),
  food('egg', 'Egg, hard-boiled', 'egg', ['1 large egg', 50],
    [155, 12.6, 1.1, 10.6, 0, 1.1, 3.3, 149, 0, 2.2, 1.03, 0.3, 0.12, 1.11, 44, 50, 1.19, 10, 126, 1.05, 124], ['egg', 50]),
  food('egg-white', 'Egg whites', 'egg', ['1/2 cup', 120],
    [52, 10.9, 0.7, 0.2, 0, 0.7, 0, 0, 0, 0, 0, 0, 0.01, 0.09, 4, 7, 0.08, 11, 163, 0.03, 166]),
  food('greek-yogurt', 'Greek yogurt, plain nonfat', 'dairy', ['1 cup', 200],
    [59, 10.2, 3.6, 0.4, 0, 3.2, 0.1, 1, 0, 0, 0.01, 0, 0.06, 0.75, 7, 110, 0.07, 11, 141, 0.52, 36]),
  food('cottage-cheese', 'Cottage cheese, 2%', 'dairy', ['1/2 cup', 113],
    [81, 10.5, 4.8, 2.3, 0, 4.0, 1.2, 20, 0, 0, 0.02, 0.1, 0.06, 0.47, 13, 90, 0.16, 9, 125, 0.5, 308]),
  food('whey', 'Whey protein powder', 'dairy', ['1 scoop', 30],
    [400, 80, 10, 5, 0, 6, 2.5, 0, 0, 0, 0, 0, 0.2, 1.0, 10, 470, 1.0, 80, 500, 2.0, 200]),
  food('tofu', 'Tofu, firm', 'plant', ['1/2 block', 150],
    [144, 17.3, 2.8, 8.7, 2.3, 0.6, 1.3, 8, 0.2, 0, 0.01, 2.4, 0.09, 0, 29, 683, 2.66, 58, 237, 1.57, 14]),
  food('lentils', 'Lentils, cooked', 'plant', ['1 cup', 198],
    [116, 9.0, 20.1, 0.4, 7.9, 1.8, 0.05, 0, 1.5, 0, 0.11, 1.7, 0.18, 0, 181, 19, 3.33, 36, 369, 1.27, 2]),
  food('black-beans', 'Black beans, cooked', 'plant', ['1 cup', 172],
    [132, 8.9, 23.7, 0.5, 8.7, 0.3, 0.14, 0, 0, 0, 0.87, 3.3, 0.07, 0, 149, 27, 2.1, 70, 355, 1.12, 1]),
  food('chickpeas', 'Chickpeas, cooked', 'plant', ['1 cup', 164],
    [164, 8.9, 27.4, 2.6, 7.6, 4.8, 0.27, 1, 1.3, 0, 0.35, 4.0, 0.14, 0, 172, 49, 2.89, 48, 291, 1.53, 7]),

  // Dairy
  food('milk', 'Milk, 2%', 'dairy', ['1 cup', 244],
    [50, 3.3, 4.8, 2.0, 0, 5.1, 1.26, 55, 0, 1.2, 0.03, 0.2, 0.04, 0.53, 5, 120, 0.03, 11, 140, 0.48, 47]),
  food('cheddar', 'Cheddar cheese', 'dairy', ['1 slice', 28],
    [403, 24.9, 1.3, 33.1, 0, 0.5, 21.1, 265, 0, 0.6, 0.29, 2.8, 0.07, 0.83, 18, 721, 0.68, 28, 98, 3.11, 621]),

  // Grains and starches
  food('oats', 'Rolled oats, dry', 'plant', ['1/2 cup', 40],
    [379, 13.2, 67.7, 6.5, 10.1, 1.0, 1.1, 0, 0, 0, 0.42, 2.0, 0.12, 0, 32, 52, 4.25, 138, 362, 3.64, 6]),
  food('white-rice', 'White rice, cooked', 'plant', ['1 cup', 158],
    [130, 2.7, 28.2, 0.3, 0.4, 0.05, 0.08, 0, 0, 0, 0.04, 0, 0.09, 0, 58, 10, 1.2, 12, 35, 0.49, 1]),
  food('brown-rice', 'Brown rice, cooked', 'plant', ['1 cup', 195],
    [123, 2.7, 25.6, 1.0, 1.6, 0.2, 0.26, 0, 0, 0, 0.17, 0.6, 0.12, 0, 9, 3, 0.56, 39, 86, 0.71, 4]),
  food('quinoa', 'Quinoa, cooked', 'plant', ['1 cup', 185],
    [120, 4.4, 21.3, 1.9, 2.8, 0.87, 0.23, 0, 0, 0, 0.63, 0, 0.12, 0, 42, 17, 1.49, 64, 172, 1.09, 7]),
  food('pasta', 'Pasta, cooked', 'plant', ['1 cup', 140],
    [158, 5.8, 30.9, 0.9, 1.8, 0.6, 0.17, 0, 0, 0, 0.06, 0, 0.05, 0, 102, 7, 1.28, 18, 44, 0.51, 1]),
  food('wholewheat-bread', 'Whole-wheat bread', 'plant', ['1 slice', 32],
    [252, 12.4, 42.7, 3.5, 6.0, 4.4, 0.7, 0, 0, 0, 0.3, 7.8, 0.22, 0, 42, 107, 2.47, 76, 254, 1.8, 450], ['slice', 32]),
  food('sweet-potato', 'Sweet potato, baked', 'plant', ['1 medium', 150],
    [90, 2.0, 20.7, 0.15, 3.3, 6.5, 0.05, 961, 19.6, 0, 0.71, 2.3, 0.29, 0, 6, 38, 0.69, 27, 475, 0.32, 36]),
  food('potato', 'Potato, baked with skin', 'plant', ['1 medium', 173],
    [93, 2.5, 21.2, 0.13, 2.2, 1.2, 0.03, 1, 9.6, 0, 0.04, 2.0, 0.31, 0, 28, 15, 1.08, 28, 535, 0.36, 10]),

  // Fruit
  food('banana', 'Banana', 'plant', ['1 medium', 118],
    [89, 1.1, 22.8, 0.3, 2.6, 12.2, 0.11, 3, 8.7, 0, 0.1, 0.5, 0.37, 0, 20, 5, 0.26, 27, 358, 0.15, 1], ['banana', 118]),
  food('apple', 'Apple', 'plant', ['1 medium', 182],
    [52, 0.26, 13.8, 0.17, 2.4, 10.4, 0.03, 3, 4.6, 0, 0.18, 2.2, 0.04, 0, 3, 6, 0.12, 5, 107, 0.04, 1], ['apple', 182]),
  food('orange', 'Orange', 'plant', ['1 medium', 131],
    [47, 0.94, 11.8, 0.12, 2.4, 9.4, 0.02, 11, 53.2, 0, 0.18, 0, 0.06, 0, 30, 40, 0.1, 10, 181, 0.07, 0], ['orange', 131]),
  food('blueberries', 'Blueberries', 'plant', ['1 cup', 148],
    [57, 0.74, 14.5, 0.33, 2.4, 10.0, 0.03, 3, 9.7, 0, 0.57, 19.3, 0.05, 0, 6, 6, 0.28, 6, 77, 0.16, 1]),
  food('strawberries', 'Strawberries', 'plant', ['1 cup', 152],
    [32, 0.67, 7.7, 0.3, 2.0, 4.9, 0.02, 1, 58.8, 0, 0.29, 2.2, 0.05, 0, 24, 16, 0.41, 13, 153, 0.14, 1]),
  food('raisins', 'Raisins', 'plant', ['1 small box', 43],
    [299, 3.1, 79.2, 0.46, 3.7, 59.2, 0.06, 0, 2.3, 0, 0.12, 3.5, 0.17, 0, 5, 50, 1.88, 32, 749, 0.22, 11]),

  // Vegetables
  food('broccoli', 'Broccoli, steamed', 'plant', ['1 cup', 156],
    [35, 2.4, 7.2, 0.4, 3.3, 1.4, 0.08, 77, 64.9, 0, 1.45, 141.1, 0.2, 0, 108, 40, 0.67, 21, 293, 0.45, 41]),
  food('spinach', 'Spinach, raw', 'plant', ['2 cups', 60],
    [23, 2.9, 3.6, 0.4, 2.2, 0.4, 0.06, 469, 28.1, 0, 2.03, 482.9, 0.2, 0, 194, 99, 2.71, 79, 558, 0.53, 79]),
  food('romaine', 'Romaine lettuce', 'plant', ['2 cups', 94],
    [17, 1.2, 3.3, 0.3, 2.1, 1.2, 0.04, 436, 4.0, 0, 0.13, 102.5, 0.07, 0, 136, 33, 0.97, 14, 247, 0.23, 8]),
  food('carrots', 'Carrots', 'plant', ['1 cup sticks', 122],
    [41, 0.93, 9.6, 0.24, 2.8, 4.7, 0.04, 835, 5.9, 0, 0.66, 13.2, 0.14, 0, 19, 33, 0.3, 12, 320, 0.24, 69]),
  food('bell-pepper', 'Red bell pepper', 'plant', ['1 medium', 119],
    [31, 0.99, 6.0, 0.3, 2.1, 4.2, 0.03, 157, 127.7, 0, 1.58, 4.9, 0.29, 0, 46, 7, 0.43, 12, 211, 0.25, 4]),
  food('tomato', 'Tomato', 'plant', ['1 medium', 123],
    [18, 0.88, 3.9, 0.2, 1.2, 2.6, 0.03, 42, 13.7, 0, 0.54, 7.9, 0.08, 0, 15, 10, 0.27, 11, 237, 0.17, 5]),
  food('green-beans', 'Green beans, cooked', 'plant', ['1 cup', 125],
    [35, 1.9, 7.9, 0.28, 3.2, 1.6, 0.06, 35, 9.7, 0, 0.46, 48, 0.06, 0, 33, 44, 0.65, 18, 146, 0.25, 1]),
  food('avocado', 'Avocado', 'plant', ['1/2 avocado', 75],
    [160, 2.0, 8.5, 14.7, 6.7, 0.7, 2.13, 7, 10.0, 0, 2.07, 21.0, 0.26, 0, 81, 12, 0.55, 29, 485, 0.64, 7]),

  // Fats, nuts and extras
  food('almonds', 'Almonds', 'plant', ['1 handful', 28],
    [579, 21.2, 21.6, 49.9, 12.5, 4.4, 3.8, 0, 0, 0, 25.6, 0, 0.14, 0, 44, 269, 3.71, 270, 733, 3.12, 1]),
  food('walnuts', 'Walnuts', 'plant', ['1 handful', 28],
    [654, 15.2, 13.7, 65.2, 6.7, 2.6, 6.1, 1, 1.3, 0, 0.7, 2.7, 0.54, 0, 98, 98, 2.91, 158, 441, 3.09, 2]),
  food('peanut-butter', 'Peanut butter', 'plant', ['2 tbsp', 32],
    [588, 25.1, 20.0, 50.4, 6.0, 9.2, 10.3, 0, 0, 0, 9.0, 0.3, 0.55, 0, 87, 43, 1.74, 154, 649, 2.51, 430]),
  food('chia', 'Chia seeds', 'plant', ['1 tbsp', 12],
    [486, 16.5, 42.1, 30.7, 34.4, 0, 3.33, 0, 1.6, 0, 0.5, 0, 0, 0, 49, 631, 7.72, 335, 407, 4.58, 16]),
  food('olive-oil', 'Olive oil', 'plant', ['1 tbsp', 14],
    [884, 0, 0, 100, 0, 0, 13.8, 0, 0, 0, 14.35, 60.2, 0, 0, 0, 1, 0.56, 0, 1, 0, 2]),
  food('honey', 'Honey', 'plant', ['1 tbsp', 21],
    [304, 0.3, 82.4, 0, 0.2, 82.1, 0, 0, 0.5, 0, 0, 0, 0.02, 0, 2, 6, 0.42, 2, 52, 0.22, 4]),
];

const FOOD_INDEX = new Map(FOODS.map((f) => [f.id, f]));

export function getFood(id: string): Food {
  const found = FOOD_INDEX.get(id);
  if (!found) throw new Error(`Unknown food: ${id}`);
  return found;
}

export function findFood(id: string): Food | undefined {
  return FOOD_INDEX.get(id);
}

export function nutrientsFor(foodId: string, grams: number): Nutrients {
  const per100g = getFood(foodId).per100g;
  const out = { ...per100g };
  for (const k of NUTRIENT_KEYS) out[k] = (per100g[k] * grams) / 100;
  return out;
}

export function searchFoods(query: string): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOODS;
  return FOODS.filter((f) => f.name.toLowerCase().includes(q));
}

/** Human-readable amount, e.g. "2 eggs (100 g)" for unit foods or "150 g" otherwise. */
export function describeAmount(foodId: string, grams: number): string {
  const { unit } = getFood(foodId);
  if (unit) {
    const count = Math.round((grams / unit.grams) * 2) / 2;
    return `${count} ${count === 1 ? unit.name : `${unit.name}s`} (${Math.round(grams)} g)`;
  }
  return `${Math.round(grams)} g`;
}

export function isAllowedForDiet(f: Food, diet: 'omnivore' | 'vegetarian'): boolean {
  return diet === 'omnivore' || (f.tag !== 'meat' && f.tag !== 'fish');
}
