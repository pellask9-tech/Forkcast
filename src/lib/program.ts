/**
 * Weekly training program, built from the latest body check.
 * Muscle groups marked "Train more" go first in every session they appear in and get an extra
 * exercise and set. Strong points get maintenance volume. Without a body check, every group is
 * treated as on track, which gives a balanced program.
 *
 * No React Native imports, so this is easy to test.
 */
import type { BodyCheck, MuscleStatus } from './store';

export type Equipment = 'gym' | 'home';
export type DaysPerWeek = 3 | 4 | 5;
export type GroupId = 'shoulders' | 'chest' | 'arms' | 'back' | 'core' | 'glutes' | 'quads' | 'hamstrings' | 'calves';

export const GROUP_NAMES: Record<GroupId, string> = {
  shoulders: 'Shoulders', chest: 'Chest', arms: 'Arms', back: 'Back', core: 'Core',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves',
};

type Move = { name: string; reps?: string };
/** Exercises per group, best first. Gym moves use common machines and dumbbells; home moves need a backpack or a band at most. */
const LIBRARY: Record<GroupId, Record<Equipment, Move[]>> = {
  shoulders: {
    gym: [{ name: 'Seated dumbbell shoulder press' }, { name: 'Lateral raises', reps: '12–15' }, { name: 'Face pulls', reps: '12–15' }],
    home: [{ name: 'Pike push-ups' }, { name: 'Lateral raises with water bottles', reps: '15–20' }, { name: 'Band pull-aparts', reps: '15–20' }],
  },
  chest: {
    gym: [{ name: 'Dumbbell bench press' }, { name: 'Incline dumbbell press' }, { name: 'Cable or machine fly', reps: '12–15' }],
    home: [{ name: 'Push-ups' }, { name: 'Feet-elevated push-ups' }, { name: 'Wide push-ups' }],
  },
  arms: {
    gym: [{ name: 'Dumbbell curls' }, { name: 'Triceps rope pushdowns', reps: '12–15' }, { name: 'Hammer curls' }],
    home: [{ name: 'Close-grip push-ups' }, { name: 'Bench or chair dips' }, { name: 'Backpack curls', reps: '12–15' }],
  },
  back: {
    gym: [{ name: 'Lat pulldown' }, { name: 'Seated cable row' }, { name: 'One-arm dumbbell row' }],
    home: [{ name: 'Backpack bent-over rows' }, { name: 'Towel rows on a door', reps: '12–15' }, { name: 'Superman holds', reps: '20–30 s' }],
  },
  core: {
    gym: [{ name: 'Plank', reps: '30–45 s' }, { name: 'Hanging knee raises', reps: '10–15' }, { name: 'Cable woodchops', reps: '12 each side' }],
    home: [{ name: 'Plank', reps: '30–45 s' }, { name: 'Dead bugs', reps: '10 each side' }, { name: 'Side plank', reps: '20–30 s each side' }],
  },
  glutes: {
    gym: [{ name: 'Barbell or machine hip thrusts' }, { name: 'Cable kickbacks', reps: '12–15 each leg' }, { name: 'Reverse lunges', reps: '10 each leg' }],
    home: [{ name: 'Glute bridges', reps: '15–20' }, { name: 'Single-leg glute bridges', reps: '10–12 each leg' }, { name: 'Reverse lunges', reps: '10 each leg' }],
  },
  quads: {
    gym: [{ name: 'Goblet or back squats' }, { name: 'Leg press' }, { name: 'Walking lunges', reps: '10 each leg' }],
    home: [{ name: 'Bodyweight or backpack squats', reps: '15–20' }, { name: 'Bulgarian split squats', reps: '8–12 each leg' }, { name: 'Step-ups', reps: '10 each leg' }],
  },
  hamstrings: {
    gym: [{ name: 'Romanian deadlifts' }, { name: 'Lying or seated leg curls', reps: '10–15' }],
    home: [{ name: 'Single-leg Romanian deadlifts', reps: '8–12 each leg' }, { name: 'Hamstring bridge walkouts', reps: '8–10' }],
  },
  calves: {
    gym: [{ name: 'Standing calf raises', reps: '12–20' }, { name: 'Seated calf raises', reps: '15–20' }],
    home: [{ name: 'Single-leg calf raises on a step', reps: '12–20 each leg' }, { name: 'Calf raises', reps: '20–25' }],
  },
};

/** Which muscle groups each session trains, in its usual order. */
const SPLITS: Record<DaysPerWeek, { title: string; groups: GroupId[] }[]> = {
  3: [
    { title: 'Full body A', groups: ['quads', 'chest', 'back', 'shoulders', 'core'] },
    { title: 'Full body B', groups: ['hamstrings', 'glutes', 'back', 'shoulders', 'arms'] },
    { title: 'Full body C', groups: ['quads', 'chest', 'glutes', 'arms', 'calves', 'core'] },
  ],
  4: [
    { title: 'Upper body A', groups: ['chest', 'back', 'shoulders', 'arms'] },
    { title: 'Lower body A', groups: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
    { title: 'Upper body B', groups: ['back', 'shoulders', 'chest', 'arms'] },
    { title: 'Lower body B', groups: ['glutes', 'hamstrings', 'quads', 'core', 'calves'] },
  ],
  5: [
    { title: 'Upper body', groups: ['chest', 'back', 'shoulders', 'arms'] },
    { title: 'Lower body', groups: ['quads', 'hamstrings', 'glutes', 'calves'] },
    { title: 'Push', groups: ['chest', 'shoulders', 'arms', 'core'] },
    { title: 'Pull', groups: ['back', 'arms', 'shoulders', 'core'] },
    { title: 'Legs', groups: ['glutes', 'quads', 'hamstrings', 'calves'] },
  ],
};

/** Suggested weekdays for each plan, leaving rest days between sessions. */
export const SCHEDULE: Record<DaysPerWeek, string[]> = {
  3: ['Mon', 'Wed', 'Fri'],
  4: ['Mon', 'Tue', 'Thu', 'Fri'],
  5: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'],
};

export interface ProgramExercise { name: string; sets: string; group: GroupId; priority: boolean }
export interface ProgramDay {
  id: string;
  title: string;
  weekday: string;
  /** Groups this session prioritises, from the body check. */
  focus: GroupId[];
  exercises: ProgramExercise[];
  finisher: string | null;
}
export interface Program { days: ProgramDay[]; priority: GroupId[]; maintain: GroupId[]; coachNotes: string[]; personalised: boolean }

const MAX_EXERCISES = 7;

function statusOf(check: Pick<BodyCheck, 'groups'> | null, id: GroupId): MuscleStatus {
  return (check?.groups.find(g => g.id === id)?.status as MuscleStatus | undefined) ?? 'on_track';
}

export function buildProgram(opts: {
  check: Pick<BodyCheck, 'groups' | 'focus'> | null;
  goal: 'cut' | 'bulk';
  days: DaysPerWeek;
  equipment: Equipment;
}): Program {
  const { check, goal, days, equipment } = opts;
  const status = (id: GroupId) => statusOf(check, id);
  const allIds = Object.keys(GROUP_NAMES) as GroupId[];

  // Priority order: the body check's own focus order first, then any other "Train more" groups.
  const focusOrder = (check?.focus ?? []).map(f => f.group).filter((g): g is GroupId => g in GROUP_NAMES);
  const priority = [...new Set([...focusOrder, ...allIds.filter(id => status(id) === 'needs_work')])];
  const maintain = allIds.filter(id => status(id) === 'strong' && !priority.includes(id));

  // Exercises the body check suggested for a group come first, then the library's.
  const suggested = (id: GroupId): Move[] =>
    (check?.focus ?? []).filter(f => f.group === id).flatMap(f => f.exercises.map(e => ({ name: e.name, reps: undefined })));
  const movesFor = (id: GroupId): Move[] => {
    const seen = new Set<string>();
    return [...suggested(id), ...LIBRARY[id][equipment]].filter(m => {
      const k = m.name.trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const reps = goal === 'bulk' ? '8–12' : '10–15';
  const setsFor = (id: GroupId, move: Move) => {
    const n = priority.includes(id) ? 4 : maintain.includes(id) ? 2 : 3;
    return `${n} × ${move.reps ?? reps}`;
  };

  const used: Partial<Record<GroupId, number>> = {};
  const nextMove = (id: GroupId) => {
    const moves = movesFor(id);
    const i = used[id] ?? 0;
    used[id] = i + 1;
    return moves[i % moves.length];
  };

  const dayList = SPLITS[days].map((split, d) => {
    // "Train more" groups move to the front of the session, while you're fresh.
    const ordered = [...split.groups].sort((a, b) => Number(priority.includes(b)) - Number(priority.includes(a)));
    const exercises: ProgramExercise[] = [];
    for (const id of ordered) {
      const count = priority.includes(id) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const move = nextMove(id);
        if (exercises.some(e => e.name === move.name)) continue;
        exercises.push({ name: move.name, sets: setsFor(id, move), group: id, priority: priority.includes(id) });
      }
    }
    // Keep sessions to about an hour: trim from the end, which is never a priority group's first exercise.
    while (exercises.length > MAX_EXERCISES) {
      const drop = exercises.map(e => !e.priority).lastIndexOf(true);
      exercises.splice(drop >= 0 ? drop : exercises.length - 1, 1);
    }
    const finisher = goal === 'cut'
      ? '20–30 min brisk incline walk or easy bike'
      : d === SPLITS[days].length - 1 ? '10 min easy walk to cool down' : null;
    return {
      id: `d${d + 1}`,
      title: split.title,
      weekday: SCHEDULE[days][d],
      focus: ordered.filter(g => priority.includes(g)),
      exercises,
      finisher,
    };
  });

  const name = (ids: GroupId[]) => ids.map(id => GROUP_NAMES[id].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const coachNotes: string[] = [];
  if (priority.length) {
    coachNotes.push(`We're bringing up your ${name(priority)}. They come first in each session, with an extra exercise and set, so they get your best energy.`);
  } else {
    coachNotes.push(check ? 'Your body check looks balanced, so this program trains everything evenly.' : 'This is a balanced program. Do a body check and I’ll tailor it to the muscles that need the most work.');
  }
  if (maintain.length) coachNotes.push(`Your ${name(maintain)} ${maintain.length === 1 ? 'is a strong point' : 'are strong points'}, so ${maintain.length === 1 ? 'it gets' : 'they get'} two sets to hold on to it while the rest catches up.`);
  coachNotes.push(goal === 'bulk'
    ? 'Pick a weight where the last 2 reps are hard. When you hit the top of the rep range on every set, go a little heavier next time.'
    : 'Keep your lifts heavy so you hold on to muscle while you lose fat. The walk after each session adds to your calorie deficit without wearing you out.');
  coachNotes.push('Rest 1 to 2 minutes between sets, sleep 7 or more hours, and do a new body check in 4 weeks to see what changed.');

  return { days: dayList, priority, maintain, coachNotes, personalised: !!check };
}

/** Monday of the week containing `d`, as YYYY-MM-DD. Workout ticks reset each week. */
export function weekKey(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}
