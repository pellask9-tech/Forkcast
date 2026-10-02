import {
  bmiCategory,
  calculateBmi,
  calculateBmr,
  calculateTargets,
  cmToFtIn,
  ftInToCm,
  healthyWeightRange,
  kgToLb,
  lbToKg,
  microTargets,
  type Profile,
} from '../nutrition';

const base: Profile = {
  name: 'Test',
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activity: 'moderate',
  goal: 'cut',
  diet: 'omnivore',
  units: 'metric',
};

describe('BMI', () => {
  it('computes kg/m²', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.86, 2);
  });

  it('uses WHO category boundaries', () => {
    expect(bmiCategory(18.49)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('healthy');
    expect(bmiCategory(24.99)).toBe('healthy');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(29.99)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });

  it('gives the healthy weight range for a height', () => {
    const { min, max } = healthyWeightRange(175);
    expect(min).toBeCloseTo(56.66, 1);
    expect(max).toBeCloseTo(76.26, 1);
  });
});

describe('BMR', () => {
  it('matches Mifflin–St Jeor for men and women', () => {
    expect(calculateBmr({ sex: 'male', age: 30, heightCm: 175, weightKg: 80 })).toBeCloseTo(1748.75);
    expect(calculateBmr({ sex: 'female', age: 25, heightCm: 165, weightKg: 60 })).toBeCloseTo(1345.25);
  });
});

describe('calculateTargets', () => {
  it('applies a deficit for cutting and a surplus for bulking', () => {
    const cut = calculateTargets(base);
    const bulk = calculateTargets({ ...base, goal: 'bulk' });
    expect(cut.strategy).toBe('cut');
    expect(cut.daily.calories).toBeCloseTo(cut.maintenance * 0.85, -1);
    expect(bulk.strategy).toBe('bulk');
    expect(bulk.daily.calories).toBeCloseTo(bulk.maintenance * 1.1, -1);
  });

  it('uses bigger deficits at higher BMI', () => {
    const healthy = calculateTargets(base);
    const overweight = calculateTargets({ ...base, weightKg: 85 });
    const obese = calculateTargets({ ...base, weightKg: 100 });
    expect(healthy.adjustment).toBe(-0.15);
    expect(overweight.adjustment).toBe(-0.2);
    expect(obese.adjustment).toBe(-0.25);
  });

  it('holds an underweight user who picks cutting at maintenance', () => {
    const t = calculateTargets({ ...base, weightKg: 52 });
    expect(t.category).toBe('underweight');
    expect(t.strategy).toBe('maintain');
    expect(t.daily.calories).toBeCloseTo(t.maintenance, -1);
    expect(t.notes.join(' ')).toMatch(/underweight/);
  });

  it('switches an obese user who picks bulking to recomposition', () => {
    const t = calculateTargets({ ...base, weightKg: 110, goal: 'bulk' });
    expect(t.category).toBe('obese');
    expect(t.strategy).toBe('recomp');
    expect(t.daily.calories).toBeCloseTo(t.maintenance, -1);
  });

  it('never goes below the calorie floor', () => {
    const t = calculateTargets({
      ...base,
      sex: 'female',
      age: 70,
      heightCm: 150,
      weightKg: 58,
      activity: 'sedentary',
    });
    expect(t.daily.calories).toBe(1200);
  });

  it('bases protein on BMI-25 reference weight when above it', () => {
    const t = calculateTargets({ ...base, weightKg: 120 });
    const referenceKg = 25 * 1.75 ** 2;
    expect(t.daily.protein).toBe(Math.round(2.0 * referenceKg));
  });

  it('splits calories into macros that add back up', () => {
    for (const goal of ['cut', 'bulk'] as const) {
      for (const weightKg of [50, 70, 90, 120]) {
        const { daily } = calculateTargets({ ...base, goal, weightKg });
        const fromMacros = daily.protein * 4 + daily.carbs * 4 + daily.fat * 9;
        expect(Math.abs(fromMacros - daily.calories)).toBeLessThanOrEqual(15);
        expect(daily.carbs).toBeGreaterThan(0);
      }
    }
  });

  it('sets fiber and limits from calories', () => {
    const { daily } = calculateTargets(base);
    expect(daily.fiber).toBe(Math.round((14 * daily.calories) / 1000));
    expect(daily.sodium).toBe(2300);
  });
});

describe('microTargets', () => {
  it('follows sex- and age-specific RDAs', () => {
    expect(microTargets('female', 30).iron).toBe(18);
    expect(microTargets('female', 55).iron).toBe(8);
    expect(microTargets('male', 30).iron).toBe(8);
    expect(microTargets('female', 55).calcium).toBe(1200);
    expect(microTargets('male', 55).calcium).toBe(1000);
    expect(microTargets('male', 75).vitaminD).toBe(20);
    expect(microTargets('male', 25).magnesium).toBe(400);
    expect(microTargets('male', 35).magnesium).toBe(420);
  });
});

describe('unit conversions', () => {
  it('round-trips pounds and feet/inches', () => {
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5);
    expect(cmToFtIn(ftInToCm(5, 11))).toEqual({ ft: 5, inches: 11 });
  });
});
