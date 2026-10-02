# Forkcast

Calorie, macro and micronutrient tracker that sets up your BMI and daily targets, then
recommends what to eat next depending on whether you're **cutting** or **bulking**.

Built with Expo (SDK 57), Expo Router and TypeScript. Runs on iOS, Android and the web.

## Features

- **Profile & BMI.** Enter sex, age, height, weight (metric or imperial), activity level,
  goal and food preference. Forkcast shows your BMI, its category, and a healthy
  weight range for your height.
- **Daily targets.** Calories from the Mifflin–St Jeor BMR × activity factor, adjusted for your
  goal *and* your BMI (see below). Protein, carbs, fat, fiber and saturated fat targets, plus 14
  vitamins and minerals from the National Academies' RDAs for your sex and age.
- **Food log.** Search the built-in food database, log by servings or grams to any meal and day,
  and see calories, macros and micronutrients against your targets.
- **Meal plan.** For each meal you haven't logged yet, Forkcast splits whatever is left of
  today's targets and recommends a meal with portions scaled to fit. Swap for alternatives, or
  log a whole meal in one tap. Vegetarian plans contain no meat or fish.
- Everything is stored on the device (AsyncStorage). Light and dark mode.

### How the goal and BMI set your calories

| BMI category | Cutting | Bulking |
| --- | --- | --- |
| Underweight (< 18.5) | Maintenance (cutting not recommended) | +15% |
| Healthy (18.5–24.9) | −15% | +10% |
| Overweight (25–29.9) | −20% | +5% (lean bulk) |
| Obese (≥ 30) | −25% | Maintenance + high protein (recomposition) |

Calories never go below 1,500 kcal (men) or 1,200 kcal (women). Protein is 2.0 g/kg when cutting
and 1.8 g/kg when bulking, using the weight at BMI 25 for anyone above it. Fat is 25% of calories
and carbs fill the rest.

Forkcast gives general guidance, not medical advice. Targets are for adults and don't cover
pregnancy, breastfeeding or medical conditions.

## Project layout

```
src/
  app/                  Expo Router screens
    _layout.tsx         Root stack; shows onboarding until a profile exists
    onboarding.tsx      Profile setup
    edit-profile.tsx
    food/[id].tsx       Food detail: amount, meal, full nutrient breakdown
    (tabs)/             Today, Meal plan, Add food, Profile
  components/           UI kit, theme, profile form
  lib/
    nutrition.ts        BMI, BMR, calorie/macro/micronutrient targets
    mealPlan.ts         Meal templates, portion scaling, recommendations
    foods.ts            Food database (per-100 g values, approx. USDA FoodData Central)
    nutrients.ts        Nutrient keys, labels, units
  state/store.tsx       App state and persistence
```

## Development

```sh
npm install
npx expo start        # then press i / a / w, or scan the QR code with Expo Go
npm test              # unit tests for the nutrition and meal-plan logic
npm run typecheck
npm run lint
```
