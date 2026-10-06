/**
 * Food database and meal templates.
 * Nutrients are per serving, in this order (see NUTRIENT_KEYS):
 * kcal, protein g, carbs g, fat g, fiber g, sugars g, sat fat g, sodium mg, potassium mg,
 * calcium mg, iron mg, magnesium mg, zinc mg, vitamin A µg RAE, vitamin C mg, vitamin D µg,
 * vitamin B12 µg, folate µg DFE.
 * Values are approximate, based on standard nutrition references and typical home recipes.
 *
 * This file has no React Native imports so the scan server (src/app/api/scan+api.ts) can use it too.
 */

export const NUTRIENT_KEYS = [
  'kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 'b12', 'fol',
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export const IDX = Object.fromEntries(NUTRIENT_KEYS.map((k, i) => [k, i])) as Record<NutrientKey, number>;
export const emptyNutrients = () => new Array<number>(NUTRIENT_KEYS.length).fill(0);

export type FoodType = 'pork' | 'beef' | 'poultry' | 'fish' | 'egg' | 'dairy' | 'plant';

/** A standard serving: `n` units of `u`, weighing `g` grams in total. */
export type StdUnit = { kind: 'std'; n: number; u: [string, string]; g: number };
/** A food the user typed in: one serving as they described it. */
export type CustomUnit = { kind: 'custom'; label: string };
/** A food estimated from a photo: the whole portion, in grams. */
export type ScanUnit = { kind: 'scan'; grams: number };
export type Unit = StdUnit | CustomUnit | ScanUnit;

export interface Food {
  id: string;
  name: string;
  alias: string;
  type: FoodType;
  unit: Unit;
  n: number[];
  /** Smallest amount change, in servings. */
  step: number;
  /** Largest amount the meal planner will use, in servings. */
  max: number;
  custom?: boolean;
}

const G = (n: number): StdUnit => ({ kind: 'std', n, u: ['g', 'g'], g: n });
const U = (n: number, s: string, p: string, g: number): StdUnit => ({ kind: 'std', n, u: [s, p], g });

export const FOODS: Food[] = [];
function food(id: string, name: string, alias: string, type: FoodType, unit: StdUnit, n: number[], o: { step?: number; max?: number } = {}) {
  FOODS.push({ id, name, alias, type, unit, n, step: o.step ?? 0.25, max: o.max ?? 4 });
}

// Protein
food('egg', 'Egg', 'itlog boiled scrambled fried', 'egg', U(1, 'large egg', 'large eggs', 50), [72, 6.3, 0.4, 4.8, 0, 0.2, 1.6, 71, 69, 28, 0.9, 6, 0.65, 80, 0, 1, 0.45, 24], { step: 1, max: 6 });
food('eggwhite', 'Egg whites', 'itlog', 'egg', U(1, 'egg white', 'egg whites', 33), [17, 3.6, 0.2, 0.1, 0, 0.2, 0, 55, 54, 2, 0, 4, 0, 0, 0, 0, 0.03, 1], { step: 1, max: 8 });
food('chicken', 'Chicken breast, grilled', 'inihaw manok', 'poultry', G(100), [165, 31, 0, 3.6, 0, 0, 1, 74, 256, 15, 1, 29, 1, 6, 0, 0.1, 0.34, 4]);
food('thigh', 'Chicken thigh, skinless', 'manok', 'poultry', G(100), [195, 26, 0, 10, 0, 0, 2.8, 88, 240, 12, 1.3, 23, 2.4, 20, 0, 0.1, 0.4, 8]);
food('beef', 'Lean ground beef, cooked', 'baka giniling', 'beef', G(100), [217, 26, 0, 11.8, 0, 0, 4.6, 76, 348, 12, 2.7, 23, 6.3, 0, 0, 0.1, 2.6, 9]);
food('pork', 'Pork tenderloin, roasted', 'baboy', 'pork', G(100), [143, 26, 0, 3.5, 0, 0, 1.2, 57, 421, 6, 1.2, 28, 2.4, 2, 0, 0.5, 0.6, 1]);
food('salmon', 'Salmon, baked', 'fish isda', 'fish', G(100), [206, 22, 0, 12.4, 0, 0, 2.5, 61, 384, 15, 0.3, 30, 0.4, 69, 3.7, 13.1, 2.8, 34]);
food('tuna', 'Tuna, canned in water', 'fish isda', 'fish', G(100), [116, 25.5, 0, 0.8, 0, 0, 0.2, 247, 237, 11, 1.5, 27, 0.8, 17, 0, 1.7, 2.5, 4]);
food('bangus', 'Bangus (milkfish), grilled', 'milkfish inihaw isda', 'fish', G(100), [190, 26, 0, 8.6, 0, 0, 2.2, 92, 385, 66, 0.4, 39, 1.1, 30, 0, 0, 4.1, 20]);
food('tilapia', 'Tilapia, baked', 'fish isda', 'fish', G(100), [128, 26.2, 0, 2.7, 0, 0, 0.9, 56, 380, 14, 0.7, 34, 0.4, 0, 0, 3.7, 1.9, 6]);
food('shrimp', 'Shrimp, boiled', 'hipon prawns', 'fish', G(100), [99, 24, 0.2, 0.3, 0, 0, 0.1, 224, 182, 39, 3.1, 34, 1.6, 68, 0, 0, 1.5, 3]);
food('sardines', 'Sardines in tomato sauce', 'sardinas canned fish', 'fish', G(100), [186, 20.9, 0.7, 10.5, 0.1, 0.4, 2.7, 414, 341, 240, 2.3, 34, 1.4, 34, 1, 4.8, 8.9, 24]);
food('tofu', 'Tofu, firm', 'tokwa bean curd', 'plant', G(100), [144, 17.3, 2.8, 8.7, 2.3, 0.6, 1.3, 14, 237, 350, 2.7, 58, 1.6, 0, 0, 0, 0, 29]);
food('greekyog', 'Greek yogurt, plain nonfat', 'yoghurt', 'dairy', U(1, 'container', 'containers', 170), [100, 17, 6, 0.7, 0, 5.5, 0.2, 61, 240, 187, 0.1, 19, 0.9, 2, 0, 0, 1.3, 12], { step: 0.5, max: 3 });
food('cottage', 'Cottage cheese, low-fat', '', 'dairy', U(0.5, 'cup', 'cups', 113), [92, 12, 4.1, 2.6, 0, 4.1, 1, 350, 141, 125, 0.2, 10, 0.6, 25, 0, 0, 0.5, 14], { step: 0.5, max: 4 });
food('milk', 'Milk, 2%', 'gatas', 'dairy', U(1, 'cup', 'cups', 244), [122, 8.1, 11.7, 4.8, 0, 12, 3.1, 115, 342, 293, 0.05, 27, 1.2, 134, 0.5, 2.9, 1.3, 12], { step: 0.5, max: 3 });
food('soymilk', 'Soy milk, unsweetened', 'soya', 'plant', U(1, 'cup', 'cups', 243), [80, 7, 4, 4, 1, 1, 0.5, 90, 300, 300, 1.1, 39, 0.6, 130, 0, 2.9, 2.7, 24], { step: 0.5, max: 3 });
food('whey', 'Whey protein', 'protein shake powder', 'dairy', U(1, 'scoop', 'scoops', 30), [120, 24, 3, 1.5, 0, 2, 1, 50, 150, 120, 0.5, 20, 1, 0, 0, 0, 0.5, 0], { step: 0.5, max: 2 });
food('cheddar', 'Cheddar cheese', 'keso', 'dairy', G(28), [115, 6.5, 0.4, 9.4, 0, 0.1, 5.3, 180, 21, 200, 0.2, 8, 1, 75, 0, 0.3, 0.3, 5], { step: 0.5, max: 3 });
// Carbs
food('rice', 'White rice, cooked', 'kanin', 'plant', U(1, 'cup', 'cups', 158), [205, 4.3, 44.5, 0.4, 0.6, 0.1, 0.1, 2, 55, 16, 0.3, 19, 0.8, 0, 0, 0, 0, 5]);
food('brownrice', 'Brown rice, cooked', 'kanin', 'plant', U(1, 'cup', 'cups', 195), [216, 5, 45, 1.8, 3.5, 0.7, 0.4, 10, 84, 20, 0.8, 84, 1.2, 0, 0, 0, 0, 8]);
food('sinangag', 'Garlic fried rice (sinangag)', 'kanin', 'plant', U(1, 'cup', 'cups', 170), [300, 5, 48, 9, 1, 0.3, 1.5, 350, 70, 20, 0.5, 20, 0.9, 0, 1, 0, 0, 8], { max: 3 });
food('oats', 'Rolled oats, dry', 'oatmeal', 'plant', U(0.5, 'cup', 'cups', 40), [150, 5.3, 27, 2.6, 4, 0.4, 0.5, 2, 146, 21, 1.7, 55, 1.5, 0, 0, 0, 0, 13]);
food('wwbread', 'Whole wheat bread', 'tinapay toast', 'plant', U(1, 'slice', 'slices', 32), [81, 4, 13.8, 1.1, 1.9, 1.4, 0.2, 146, 81, 52, 0.8, 24, 0.6, 0, 0, 0, 0, 14], { step: 1, max: 4 });
food('pandesal', 'Pandesal', 'bread roll tinapay', 'plant', U(1, 'piece', 'pieces', 30), [85, 2.5, 16, 1.2, 0.6, 2, 0.3, 130, 30, 15, 0.9, 7, 0.2, 0, 0, 0, 0, 30], { step: 1, max: 6 });
food('kamote', 'Sweet potato (kamote), boiled', 'camote', 'plant', U(1, 'medium kamote', 'medium kamote', 150), [135, 3, 31, 0.2, 5, 9.7, 0.1, 54, 713, 57, 1, 41, 0.5, 1400, 29, 0, 0, 9], { step: 0.5 });
food('potato', 'Potato, boiled', 'patatas', 'plant', U(1, 'medium potato', 'medium potatoes', 150), [130, 2.8, 30, 0.2, 2.7, 1.3, 0.1, 7, 490, 12, 0.5, 30, 0.4, 0, 11, 0, 0, 15], { step: 0.5 });
food('pasta', 'Whole wheat pasta, cooked', 'spaghetti noodles', 'plant', U(1, 'cup', 'cups', 140), [174, 7.5, 37, 0.8, 6.3, 1, 0.1, 4, 62, 21, 1.5, 42, 1.1, 0, 0, 0, 0, 7]);
food('quinoa', 'Quinoa, cooked', '', 'plant', U(1, 'cup', 'cups', 185), [222, 8.1, 39.4, 3.6, 5.2, 1.6, 0.4, 13, 318, 31, 2.8, 118, 2, 2, 0, 0, 0, 78]);
food('corn', 'Corn on the cob', 'mais', 'plant', U(1, 'ear', 'ears', 100), [96, 3.4, 21, 1.5, 2.4, 4.5, 0.2, 1, 218, 3, 0.5, 26, 0.6, 13, 5.5, 0, 0, 23], { step: 0.5 });
food('granola', 'Granola', '', 'plant', U(0.5, 'cup', 'cups', 60), [270, 6, 38, 11, 4, 12, 2, 20, 200, 40, 2, 70, 1.5, 0, 0, 0, 0, 20], { step: 0.5, max: 3 });
// Fruit
food('banana', 'Banana', 'saging lakatan', 'plant', U(1, 'medium banana', 'medium bananas', 118), [105, 1.3, 27, 0.4, 3.1, 14.4, 0.1, 1, 422, 6, 0.3, 32, 0.2, 4, 10.3, 0, 0, 24], { step: 0.5, max: 3 });
food('saba', 'Saba banana, boiled', 'saging plantain', 'plant', U(1, 'piece', 'pieces', 100), [116, 0.8, 31, 0.2, 2.3, 14, 0.1, 5, 465, 2, 0.6, 32, 0.1, 45, 11, 0, 0, 26], { step: 0.5, max: 3 });
food('apple', 'Apple', 'mansanas', 'plant', U(1, 'medium apple', 'medium apples', 182), [95, 0.5, 25, 0.3, 4.4, 19, 0.1, 2, 195, 11, 0.2, 9, 0.1, 5, 8.4, 0, 0, 5], { step: 0.5, max: 2 });
food('mango', 'Mango, ripe', 'mangga', 'plant', U(1, 'cup', 'cups', 165), [99, 1.4, 25, 0.6, 2.6, 22.5, 0.1, 2, 277, 18, 0.3, 16, 0.1, 89, 60, 0, 0, 71], { step: 0.5, max: 2 });
food('papaya', 'Papaya', '', 'plant', U(1, 'cup', 'cups', 145), [62, 0.7, 15.7, 0.4, 2.5, 11.3, 0.1, 12, 264, 29, 0.4, 30, 0.1, 68, 88, 0, 0, 54], { step: 0.5, max: 2 });
food('orange', 'Orange', 'dalandan kahel', 'plant', U(1, 'medium orange', 'medium oranges', 131), [62, 1.2, 15.4, 0.2, 3.1, 12.2, 0, 0, 237, 52, 0.1, 13, 0.1, 14, 70, 0, 0, 39], { step: 0.5, max: 2 });
food('blueberries', 'Blueberries', 'berries', 'plant', U(1, 'cup', 'cups', 148), [84, 1.1, 21, 0.5, 3.6, 14.7, 0, 1, 114, 9, 0.4, 9, 0.2, 4, 14.4, 0, 0, 9], { step: 0.5, max: 2 });
// Vegetables
food('broccoli', 'Broccoli, steamed', 'gulay', 'plant', U(1, 'cup', 'cups', 156), [55, 3.7, 11.2, 0.6, 5.1, 2.2, 0.1, 64, 457, 62, 1, 33, 0.7, 120, 101, 0, 0, 168], { step: 0.5 });
food('spinach', 'Spinach, cooked', 'gulay', 'plant', U(1, 'cup', 'cups', 180), [41, 5.3, 6.8, 0.5, 4.3, 0.8, 0.1, 126, 839, 245, 6.4, 157, 1.4, 943, 17.6, 0, 0, 263], { step: 0.5 });
food('kangkong', 'Kangkong, cooked', 'water spinach gulay', 'plant', U(1, 'cup', 'cups', 100), [20, 2.1, 3.1, 0.2, 2.1, 0, 0.1, 113, 184, 55, 1.3, 55, 0.2, 262, 16, 0, 0, 57], { step: 0.5 });
food('malunggay', 'Malunggay leaves', 'moringa gulay', 'plant', U(1, 'cup', 'cups', 21), [13, 2, 1.7, 0.3, 0.4, 0.1, 0, 2, 71, 39, 0.8, 31, 0.1, 79, 11, 0, 0, 8], { step: 0.5 });
food('salad', 'Mixed salad greens', 'lettuce gulay', 'plant', U(2, 'cup', 'cups', 85), [15, 1.2, 2.9, 0.2, 1.8, 0.4, 0, 26, 200, 36, 0.9, 12, 0.2, 200, 10, 0, 0, 70], { step: 0.5 });
food('carrot', 'Carrot', 'gulay', 'plant', U(1, 'medium carrot', 'medium carrots', 61), [25, 0.6, 5.8, 0.1, 1.7, 2.9, 0, 42, 195, 20, 0.2, 7, 0.1, 509, 3.6, 0, 0, 12], { step: 0.5 });
food('tomato', 'Tomato', 'kamatis', 'plant', U(1, 'medium tomato', 'medium tomatoes', 123), [22, 1.1, 4.8, 0.2, 1.5, 3.2, 0, 6, 292, 12, 0.3, 14, 0.2, 52, 17, 0, 0, 18], { step: 0.5 });
// Legumes
food('lentils', 'Lentils, cooked', 'beans', 'plant', U(1, 'cup', 'cups', 198), [230, 17.9, 39.9, 0.8, 15.6, 3.6, 0.1, 4, 731, 38, 6.6, 71, 2.5, 2, 3, 0, 0, 358], { max: 2.5 });
food('blackbeans', 'Black beans, cooked', 'beans', 'plant', U(1, 'cup', 'cups', 172), [227, 15.2, 40.8, 0.9, 15, 0.6, 0.2, 2, 611, 46, 3.6, 120, 1.9, 0, 0, 0, 0, 256], { max: 2.5 });
// Filipino dishes (typical home-cooked values)
food('tinola', 'Chicken tinola', 'soup manok', 'poultry', U(1, 'bowl', 'bowls', 350), [250, 28, 10, 11, 2, 4, 3, 900, 650, 60, 1.8, 45, 2, 90, 25, 0.2, 0.4, 40], { step: 0.5, max: 2.5 });
food('adobo', 'Chicken adobo', 'manok', 'poultry', U(1, 'serving', 'servings', 150), [330, 30, 4, 21, 0.3, 2, 6, 1100, 300, 25, 1.8, 30, 2.6, 40, 1, 0.2, 0.4, 10], { step: 0.5, max: 2.5 });
food('sinigang', 'Sinigang na hipon', 'shrimp sour soup', 'fish', U(1, 'bowl', 'bowls', 350), [180, 22, 12, 4, 3, 4, 1, 1100, 600, 120, 3, 60, 1.8, 150, 30, 0, 1.2, 50], { step: 0.5, max: 2.5 });
food('monggo', 'Monggo guisado (vegetable)', 'mung bean munggo stew', 'plant', U(1, 'cup', 'cups', 250), [230, 14, 30, 6, 10, 3, 1.5, 600, 600, 70, 3, 90, 1.8, 100, 8, 0, 0, 300], { step: 0.5, max: 2.5 });
food('pinakbet', 'Pinakbet', 'vegetable stew bagoong gulay', 'fish', U(1, 'cup', 'cups', 200), [160, 7, 14, 9, 4, 6, 2.5, 700, 450, 60, 1.5, 40, 1, 150, 30, 0, 0.2, 60], { step: 0.5, max: 2 });
// Fats & extras
food('pb', 'Peanut butter', '', 'plant', U(1, 'tbsp', 'tbsp', 16), [95, 3.5, 3.5, 8, 1, 1.5, 1.6, 75, 90, 8, 0.3, 25, 0.45, 0, 0, 0, 0, 12], { step: 0.5, max: 4 });
food('almonds', 'Almonds', 'nuts', 'plant', G(28), [164, 6, 6.1, 14.2, 3.5, 1.2, 1.1, 0, 208, 76, 1, 76, 0.9, 0, 0, 0, 0, 12], { step: 0.5, max: 3 });
food('peanuts', 'Peanuts, roasted', 'mani nuts', 'plant', G(28), [166, 6.7, 6, 14.1, 2.3, 1.2, 2, 2, 200, 15, 0.6, 50, 0.9, 0, 0, 0, 0, 40], { step: 0.5, max: 3 });
food('avocado', 'Avocado', 'abukado', 'plant', U(0.5, 'avocado', 'avocados', 68), [114, 1.3, 6, 10.5, 4.6, 0.2, 1.5, 5, 345, 9, 0.4, 20, 0.4, 5, 6, 0, 0, 60], { step: 0.5, max: 3 });
food('oil', 'Olive oil', 'cooking oil mantika', 'plant', U(1, 'tbsp', 'tbsp', 13.5), [119, 0, 0, 13.5, 0, 0, 1.9, 0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0], { step: 0.5, max: 3 });
food('darkchoc', 'Dark chocolate, 70%', '', 'dairy', G(20), [120, 1.6, 9, 8.5, 2.2, 4.8, 4.9, 4, 143, 15, 2.4, 45, 0.7, 0, 0, 0, 0, 0], { step: 0.5, max: 2 });

export const FOOD: Record<string, Food> = Object.fromEntries(FOODS.map(f => [f.id, f]));

/* ---------------- Meal templates ---------------- */
/** p = protein anchor (scaled), c = carb (scaled), f = fat (scaled, may drop), v = fixed side, x = snack item */
export type Role = 'p' | 'c' | 'f' | 'v' | 'x';
export type TemplateKind = 'b' | 'm' | 's';
export interface Template {
  id: string;
  kind: TemplateKind;
  name: string;
  items: [string, Role, number?][];
}
export const TEMPLATES: Template[] = [
  { id: 'b1', kind: 'b', name: 'Eggs, oats and blueberries', items: [['egg', 'p'], ['oats', 'c'], ['blueberries', 'v', 0.5], ['almonds', 'f']] },
  { id: 'b2', kind: 'b', name: 'Greek yogurt, granola and mango', items: [['greekyog', 'p'], ['granola', 'c'], ['mango', 'v', 0.5]] },
  { id: 'b3', kind: 'b', name: 'Pandesal with eggs and papaya', items: [['egg', 'p'], ['pandesal', 'c'], ['papaya', 'v']] },
  { id: 'b4', kind: 'b', name: 'Tofu scramble on toast', items: [['tofu', 'p'], ['wwbread', 'c'], ['tomato', 'v'], ['oil', 'f']] },
  { id: 'b5', kind: 'b', name: 'Protein oats with banana', items: [['whey', 'p'], ['oats', 'c'], ['banana', 'v'], ['pb', 'f']] },
  { id: 'b6', kind: 'b', name: 'Malunggay omelette with kamote', items: [['egg', 'p'], ['kamote', 'c'], ['malunggay', 'v'], ['oil', 'f']] },
  { id: 'b7', kind: 'b', name: 'Peanut butter toast with soy milk', items: [['soymilk', 'p'], ['wwbread', 'c'], ['banana', 'v'], ['pb', 'f']] },
  { id: 'b8', kind: 'b', name: 'Cottage cheese toast with an orange', items: [['cottage', 'p'], ['wwbread', 'c'], ['orange', 'v']] },
  { id: 'm1', kind: 'm', name: 'Grilled chicken, rice and broccoli', items: [['chicken', 'p'], ['rice', 'c'], ['broccoli', 'v'], ['oil', 'f']] },
  { id: 'm2', kind: 'm', name: 'Chicken tinola with rice', items: [['tinola', 'p'], ['rice', 'c'], ['malunggay', 'v']] },
  { id: 'm3', kind: 'm', name: 'Grilled bangus with rice and kangkong', items: [['bangus', 'p'], ['rice', 'c'], ['kangkong', 'v'], ['tomato', 'v']] },
  { id: 'm4', kind: 'm', name: 'Sinigang na hipon with rice', items: [['sinigang', 'p'], ['rice', 'c']] },
  { id: 'm5', kind: 'm', name: 'Chicken adobo with rice and kangkong', items: [['adobo', 'p'], ['rice', 'c'], ['kangkong', 'v']] },
  { id: 'm6', kind: 'm', name: 'Baked salmon, kamote and spinach', items: [['salmon', 'p'], ['kamote', 'c'], ['spinach', 'v']] },
  { id: 'm7', kind: 'm', name: 'Beef and whole wheat pasta', items: [['beef', 'p'], ['pasta', 'c'], ['tomato', 'v'], ['salad', 'v']] },
  { id: 'm8', kind: 'm', name: 'Tilapia, brown rice and pinakbet', items: [['tilapia', 'p'], ['brownrice', 'c'], ['pinakbet', 'v']] },
  { id: 'm9', kind: 'm', name: 'Tofu quinoa bowl', items: [['tofu', 'p'], ['quinoa', 'c'], ['broccoli', 'v'], ['peanuts', 'f']] },
  { id: 'm10', kind: 'm', name: 'Lentil rice bowl with spinach', items: [['lentils', 'p'], ['rice', 'c'], ['spinach', 'v'], ['oil', 'f']] },
  { id: 'm11', kind: 'm', name: 'Monggo with rice and malunggay', items: [['monggo', 'p'], ['rice', 'c'], ['malunggay', 'v']] },
  { id: 'm12', kind: 'm', name: 'Tuna pasta salad', items: [['tuna', 'p'], ['pasta', 'c'], ['salad', 'v'], ['oil', 'f']] },
  { id: 'm13', kind: 'm', name: 'Pork tenderloin, potatoes and carrots', items: [['pork', 'p'], ['potato', 'c'], ['carrot', 'v'], ['oil', 'f']] },
  { id: 'm14', kind: 'm', name: 'Black bean rice bowl with egg', items: [['egg', 'p'], ['blackbeans', 'c'], ['tomato', 'v'], ['avocado', 'f']] },
  { id: 'm15', kind: 'm', name: 'Sardines, rice and kangkong', items: [['sardines', 'p'], ['rice', 'c'], ['kangkong', 'v']] },
  { id: 'm16', kind: 'm', name: 'Chicken thigh, brown rice and salad', items: [['thigh', 'p'], ['brownrice', 'c'], ['salad', 'v'], ['carrot', 'v']] },
  { id: 'm17', kind: 'm', name: 'Shrimp with garlic rice and broccoli', items: [['shrimp', 'p'], ['sinangag', 'c'], ['broccoli', 'v']] },
  { id: 's1', kind: 's', name: 'Greek yogurt with blueberries', items: [['greekyog', 'x', 1], ['blueberries', 'x', 0.5]] },
  { id: 's2', kind: 's', name: 'Apple with peanut butter', items: [['apple', 'x', 1], ['pb', 'x', 1]] },
  { id: 's3', kind: 's', name: 'Banana and almonds', items: [['banana', 'x', 1], ['almonds', 'x', 0.5]] },
  { id: 's4', kind: 's', name: 'Protein shake with banana', items: [['whey', 'x', 1], ['milk', 'x', 1], ['banana', 'x', 1]] },
  { id: 's5', kind: 's', name: 'Cottage cheese and papaya', items: [['cottage', 'x', 1], ['papaya', 'x', 1]] },
  { id: 's6', kind: 's', name: 'Boiled eggs and an orange', items: [['egg', 'x', 2], ['orange', 'x', 1]] },
  { id: 's7', kind: 's', name: 'Boiled saba and peanuts', items: [['saba', 'x', 1], ['peanuts', 'x', 0.5]] },
  { id: 's8', kind: 's', name: 'Soy milk and a banana', items: [['soymilk', 'x', 1], ['banana', 'x', 1]] },
  { id: 's9', kind: 's', name: 'Corn on the cob and an egg', items: [['corn', 'x', 1], ['egg', 'x', 1]] },
  { id: 's10', kind: 's', name: 'Cheese on whole wheat toast', items: [['cheddar', 'x', 1], ['wwbread', 'x', 1]] },
  { id: 's11', kind: 's', name: 'Dark chocolate and almonds', items: [['darkchoc', 'x', 1], ['almonds', 'x', 0.5]] },
];
export const TEMPLATE: Record<string, Template> = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

/* ---------------- Quantities ---------------- */
export function fracStr(x: number): string {
  const F: [number, string][] = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [0.75, '¾'], [0.875, '⅞'], [1, '']];
  let w = Math.floor(x + 1e-9);
  const r = x - w;
  let best = F[0];
  for (const f of F) if (Math.abs(f[0] - r) < Math.abs(best[0] - r)) best = f;
  if (best[0] === 1) {
    w += 1;
    best = F[0];
  }
  return (w ? String(w) : '') + best[1] || '0';
}

/** "1½ cups", "150 g", "2 × 1 plate" */
export function qtyShort(unit: Unit, s: number): string {
  if (unit.kind === 'scan') return `${Math.round(unit.grams * s)} g, from photo`;
  if (unit.kind === 'custom') return `${fracStr(s)} × ${unit.label || 'serving'}`;
  const q = unit.n * s;
  if (unit.u[0] === 'g') return `${Math.round(q)} g`;
  return `${fracStr(q)} ${q <= 1 + 1e-9 ? unit.u[0] : unit.u[1]}`;
}

/** qtyShort plus the weight in grams where it helps: "1½ cups (237 g)" */
export function qtyText(unit: Unit, s: number): string {
  const base = qtyShort(unit, s);
  if (unit.kind !== 'std' || unit.u[0] === 'g' || !unit.g) return base;
  return `${base} (${Math.round(unit.g * s)} g)`;
}

export function sumItems(items: { f: Food; s: number }[]): number[] {
  const t = emptyNutrients();
  items.forEach(it => it.f.n.forEach((v, i) => { t[i] += (v || 0) * it.s; }));
  return t;
}
