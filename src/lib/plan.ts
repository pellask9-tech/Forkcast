import { FOOD, Food, Role, Template, TemplateKind, TEMPLATE, TEMPLATES, emptyNutrients, sumItems } from './foods';
import { Diet, Profile, Targets, clamp, computeTargets } from './nutrition';
import type { SlotKey } from './store';

export interface PlanSlot {
  key: string;
  label: string;
  /** share of daily calories, carbs and fat */
  k: number;
  /** share of daily protein */
  p: number;
  kind: TemplateKind;
  log: SlotKey;
}

export function planSlots(kcal: number): PlanSlot[] {
  return kcal >= 2600
    ? [
        { key: 'breakfast', label: 'Breakfast', k: 0.22, p: 0.2, kind: 'b', log: 'breakfast' },
        { key: 'lunch', label: 'Lunch', k: 0.28, p: 0.3, kind: 'm', log: 'lunch' },
        { key: 'snack1', label: 'Afternoon snack', k: 0.11, p: 0.1, kind: 's', log: 'snacks' },
        { key: 'dinner', label: 'Dinner', k: 0.28, p: 0.3, kind: 'm', log: 'dinner' },
        { key: 'snack2', label: 'Evening snack', k: 0.11, p: 0.1, kind: 's', log: 'snacks' },
      ]
    : [
        { key: 'breakfast', label: 'Breakfast', k: 0.25, p: 0.22, kind: 'b', log: 'breakfast' },
        { key: 'lunch', label: 'Lunch', k: 0.3, p: 0.32, kind: 'm', log: 'lunch' },
        { key: 'snack1', label: 'Snack', k: 0.15, p: 0.14, kind: 's', log: 'snacks' },
        { key: 'dinner', label: 'Dinner', k: 0.3, p: 0.32, kind: 'm', log: 'dinner' },
      ];
}

const ALLOWED: Record<Diet, Food['type'][] | null> = {
  any: null,
  nopork: ['beef', 'poultry', 'fish', 'egg', 'dairy', 'plant'],
  pesc: ['fish', 'egg', 'dairy', 'plant'],
  veg: ['egg', 'dairy', 'plant'],
  vegan: ['plant'],
};
export const allowedTemplate = (t: Template, diet: Diet) => {
  const a = ALLOWED[diet];
  return !a || t.items.every(([id]) => a.includes(FOOD[id].type));
};

export function pickTemplate(kind: TemplateKind, diet: Diet, exclude: string[]): string {
  let pool = TEMPLATES.filter(t => t.kind === kind && allowedTemplate(t, diet) && !exclude.includes(t.id));
  if (!pool.length) pool = TEMPLATES.filter(t => t.kind === kind && allowedTemplate(t, diet));
  if (!pool.length) pool = TEMPLATES.filter(t => t.kind === kind);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** Fill in any missing or no-longer-valid meal picks. Returns the same object if nothing changed. */
export function ensurePicks(picks: Record<string, string> | null, kcal: number, diet: Diet): Record<string, string> {
  const next: Record<string, string> = { ...(picks ?? {}) };
  let changed = !picks;
  const used: string[] = [];
  for (const sl of planSlots(kcal)) {
    const t = TEMPLATE[next[sl.key]];
    if (!t || t.kind !== sl.kind || !allowedTemplate(t, diet) || used.includes(t.id)) {
      next[sl.key] = pickTemplate(sl.kind, diet, used);
      changed = true;
    }
    used.push(next[sl.key]);
  }
  return changed ? next : (picks as Record<string, string>);
}

export interface PlanItem { f: Food; s: number; role: Role }
const roundStep = (x: number, s: number) => Math.round(x / s) * s;

/** Size a meal's portions to hit its share of protein, carbs, fat and calories. */
export function solveMeal(t: Template, tgt: { kcal: number; p: number; c: number; f: number }): PlanItem[] {
  const items: PlanItem[] = t.items.map(([id, role, base]) => ({ f: FOOD[id], role, s: base ?? 1 }));
  if (t.kind === 's') {
    const factor = tgt.kcal / sumItems(items)[0];
    items.forEach(it => { it.s = clamp(roundStep(it.s * factor, it.f.step), it.f.step, it.f.max); });
    return items;
  }
  const P = items.find(i => i.role === 'p');
  const C = items.find(i => i.role === 'c');
  const F = items.find(i => i.role === 'f');
  for (let iter = 0; iter < 5; iter++) {
    if (P) { const o = sumItems(items)[1] - P.s * P.f.n[1]; P.s = clamp((tgt.p - o) / P.f.n[1], P.f.step, P.f.max); }
    if (C) { const o = sumItems(items)[2] - C.s * C.f.n[2]; C.s = clamp((tgt.c - o) / C.f.n[2], C.f.step, C.f.max); }
    if (F) { const o = sumItems(items)[3] - F.s * F.f.n[3]; F.s = clamp((tgt.f - o) / F.f.n[3], 0, F.f.max); }
  }
  items.forEach(it => {
    if (it.role !== 'v') it.s = clamp(roundStep(it.s, it.f.step), it.role === 'f' ? 0 : it.f.step, it.f.max);
  });
  const nudge = (it: PlanItem | undefined, dir: 1 | -1) => {
    if (!it) return false;
    const ns = +(it.s + dir * it.f.step).toFixed(3);
    const min = it.role === 'f' ? 0 : it.f.step;
    if (ns < min - 1e-9 || ns > it.f.max + 1e-9) return false;
    it.s = ns;
    return true;
  };
  for (let g = 0; g < 16; g++) {
    const kc = sumItems(items)[0];
    if (kc > tgt.kcal * 1.08) { if (!nudge(C, -1) && !nudge(F, -1) && !nudge(P, -1)) break; }
    else if (kc < tgt.kcal * 0.92) { if (!nudge(C, 1) && !nudge(F, 1)) break; }
    else break;
  }
  return items.filter(it => it.s > 0);
}

export interface PlannedMeal { slot: PlanSlot; tpl: Template; items: PlanItem[]; tot: number[] }
export interface Plan { T: Targets; meals: PlannedMeal[]; day: number[] }

export function buildPlan(profile: Profile, picks: Record<string, string>): Plan {
  const T = computeTargets(profile);
  const meals = planSlots(T.kcal).map(slot => {
    const tpl = TEMPLATE[picks[slot.key]];
    const items = solveMeal(tpl, { kcal: T.kcal * slot.k, p: T.protein * slot.p, c: T.carbs * slot.k, f: T.fat * slot.k });
    return { slot, tpl, items, tot: sumItems(items) };
  });
  const day = meals.reduce((a, m) => a.map((v, i) => v + m.tot[i]), emptyNutrients());
  return { T, meals, day };
}
