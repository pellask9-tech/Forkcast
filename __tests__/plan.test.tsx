/// <reference types="jest" />
import { FOOD, sumItems } from '@/lib/foods';
import { Profile, computeTargets } from '@/lib/nutrition';
import { MIN_MEAL_KCAL, buildPlan, ensurePicks, planSlots, solveMeal } from '@/lib/plan';
import type { Entry, SlotKey } from '@/lib/store';
import { TEMPLATE } from '@/lib/foods';

const cutter: Profile = {
  sex: 'm', age: 28, heightCm: 178, weightKg: 75, activity: 1.55,
  goal: 'cut', pace: 'standard', diet: 'any', cutoffs: 'who', units: 'metric',
};
const bulker: Profile = { ...cutter, goal: 'bulk', activity: 1.725, pace: 'fast' };

const entry = (fid: string, s: number, slot: SlotKey): Entry => {
  const f = FOOD[fid];
  return { id: `${fid}-${slot}-${s}`, fid, name: f.name, unit: f.unit, n: f.n.slice(), s, slot };
};
const kcalOf = (entries: Entry[]) => entries.reduce((a, e) => a + e.n[0] * e.s, 0);

describe('buildPlan with today’s log', () => {
  it('plans the full day exactly as before when nothing is logged', () => {
    const T = computeTargets(cutter);
    const picks = ensurePicks(null, T.kcal, cutter.diet);
    const plan = buildPlan(cutter, picks);
    expect(plan.meals.every(m => m.status === 'open')).toBe(true);
    for (const m of plan.meals) {
      const before = solveMeal(TEMPLATE[picks[m.slot.key]], {
        kcal: T.kcal * m.slot.k, p: T.protein * m.slot.p, c: T.carbs * m.slot.k, f: T.fat * m.slot.k,
      });
      expect(m.tot).toEqual(sumItems(before));
    }
  });

  it('marks a logged meal as eaten and sizes the rest to what is left', () => {
    const T = computeTargets(cutter);
    const picks = ensurePicks(null, T.kcal, cutter.diet);
    const breakfast = [entry('egg', 4, 'breakfast'), entry('chicken', 2, 'breakfast')];
    const plan = buildPlan(cutter, picks, breakfast);

    const b = plan.meals.find(m => m.slot.key === 'breakfast')!;
    expect(b.status).toBe('logged');
    expect(b.tot[0]).toBeCloseTo(kcalOf(breakfast));

    const open = plan.meals.filter(m => m.status === 'open');
    const planned = open.reduce((a, m) => a + m.tot[0], 0);
    const left = T.kcal - kcalOf(breakfast);
    expect(Math.abs(planned - left) / left).toBeLessThan(0.12);
    // The day total is what was eaten plus what's still planned.
    expect(plan.day[0]).toBeCloseTo(kcalOf(breakfast) + planned);
  });

  it('plans nothing more once the day’s calories are reached', () => {
    const T = computeTargets(cutter);
    const picks = ensurePicks(null, T.kcal, cutter.diet);
    const plan = buildPlan(cutter, picks, [entry('beef', 12, 'lunch')]);
    expect(kcalOf([entry('beef', 12, 'lunch')])).toBeGreaterThan(T.kcal);
    for (const m of plan.meals) expect(m.status === 'logged' || m.status === 'full').toBe(true);
    expect(plan.meals.find(m => m.slot.key === 'dinner')!.status).toBe('full');
    expect(MIN_MEAL_KCAL).toBeGreaterThan(0);
  });

  it('keeps the evening snack open after a small afternoon snack, and counts snacks once', () => {
    const T = computeTargets(bulker);
    expect(planSlots(T.kcal).map(s => s.key)).toContain('snack2');
    const picks = ensurePicks(null, T.kcal, bulker.diet);

    const small = buildPlan(bulker, picks, [entry('egg', 2, 'snacks')]);
    expect(small.meals.find(m => m.slot.key === 'snack1')!.status).toBe('logged');
    expect(small.meals.find(m => m.slot.key === 'snack2')!.status).toBe('open');

    const big = [entry('beef', 3, 'snacks'), entry('egg', 3, 'snacks')];
    const both = buildPlan(bulker, picks, big);
    const snacks = both.meals.filter(m => m.slot.log === 'snacks');
    expect(snacks.every(m => m.status === 'logged')).toBe(true);
    expect(snacks.reduce((a, m) => a + m.tot[0], 0)).toBeCloseTo(kcalOf(big));
  });
});
