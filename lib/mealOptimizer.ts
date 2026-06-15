/**
 * Math-based day / template optimizer — pure scoring + search engine.
 *
 * Sibling to `smartMealAnalysis.ts`: no DB, no AI, no solver. Given a day of
 * meals, 1–3 target nutrients, and the candidate recipe pool, it exhaustively
 * evaluates swap / remove / add combinations and returns up to three labelled
 * variations. The endpoint (`/api/meal-plans/[id]/optimize`) resolves all the
 * data and calls `optimizeDay`; everything here is deterministic and unit-testable.
 *
 * See briefs/meal-optimizer.md for the full spec (§6 objective, §7 search,
 * §8 variation selection).
 */

// ── Lane model ──────────────────────────────────────────────────────────────
// Breakfast/Lunch/Dinner never gain an extra meal; the rest are "additive".
export const ADDITIVE_LANES = ['side', 'snack', 'beverage'] as const;

// Search guardrails
const PRUNE_THRESHOLD = 200_000; // combinations above this trigger top-K pruning
const PRUNE_TOP_K = 20; // candidates kept per slot when pruning
const CAP_GUARD_WEIGHT = 5; // weight on non-target high-goal overages
const CAP_OVER_LAMBDA = 10; // steepness of going over a target cap
const FAV_EPSILON = 0.001; // favorites tiebreak (never overrides a real win)
const NULL_TARGET_PENALTY = 1000; // a target whose total is unknown (missing data)
const PRIMARY_WEIGHT = 3; // weight on the primary target for the "Best for X" pick
const IMPROVE_MARGIN = 0.02; // min objective gain for "Closest to today" to count

// ── Public types ────────────────────────────────────────────────────────────
export type OptimizerScope = { swap: boolean; remove: boolean; add: boolean };

export type GoalThresholds = { lowGoal?: number; highGoal?: number };

/** A nutrient value map. `null` = data missing for that nutrient. */
export type NutrientVector = Record<number, number | null>;

export interface OptCandidate {
  recipeId: number;
  name: string;
  mealType: string; // lane
  isFavorite: boolean;
  /** Per-serving nutrition (candidates are placed at 1 serving — no portion changes). */
  nutrients: NutrientVector;
}

export interface OptCurrentMeal {
  mealLogId: number;
  mealType: string;
  recipeId: number | null; // null = ingredient / eating-out / empty
  name: string;
  /** Actual contribution as currently served (servings already applied). */
  nutrients: NutrientVector;
  /** Locked = never changed. Set by user lock or auto-lock (non-recipe / no candidates). */
  locked: boolean;
  lockReason?: 'user' | 'ingredient' | 'external' | 'no-candidates';
}

export interface OptimizeInput {
  /** 1–3 nutrient ids, ordered; first is the primary target. */
  targets: number[];
  /** All goals in play (targets + others, for the cap guard). */
  goals: Record<number, GoalThresholds>;
  meals: OptCurrentMeal[];
  /** meal-type → candidate recipes (already type-filtered, favorites-first). */
  candidatesByLane: Record<string, OptCandidate[]>;
  scope: OptimizerScope;
}

export type MealChangeState = 'kept' | 'swapped' | 'removed' | 'added';

export interface VariationMeal {
  mealLogId: number | null; // null for an added meal
  mealType: string;
  state: MealChangeState;
  name: string;
  fromName?: string; // previous recipe name (swapped only)
  recipeId: number | null; // proposed recipe (null when removed)
  locked?: boolean;
}

export interface VariationTarget {
  nutrientId: number;
  current: number | null;
  proposed: number | null;
}

export type VariationKey = 'balance' | 'primary' | 'closest';

export interface OptimizeVariation {
  key: VariationKey;
  changes: number;
  swaps: number;
  removes: number;
  adds: number;
  meals: VariationMeal[];
  targets: VariationTarget[];
  /** Totals for every relevant nutrient (targets + cap-guard), for display. */
  totals: NutrientVector;
}

export interface OptimizeOutput {
  baseline: { targets: VariationTarget[]; totals: NutrientVector };
  variations: OptimizeVariation[];
  pruned: boolean;
  combosEvaluated: number;
  /** Set when there's nothing to do (no swappable slots, or already optimal). */
  note?: string;
}

// ── Internal slot model ─────────────────────────────────────────────────────
type SlotOptionKind = 'current' | 'swap' | 'none' | 'add';

interface SlotOption {
  kind: SlotOptionKind;
  recipeId: number | null;
  name: string | null;
  nutrients: NutrientVector;
  isFavorite: boolean;
  laneType?: string; // set on 'add' options so the chosen meal knows its lane
}

interface Slot {
  laneType: string;
  mealLogId: number | null; // existing meal (null for the add slot)
  originRecipeId: number | null; // current recipe (for change detection)
  originName: string | null;
  options: SlotOption[];
  isAddSlot: boolean;
}

// ── Penalty functions (spec §6) ─────────────────────────────────────────────
/** Penalty for a target nutrient, normalised by its goal so scales compare. */
function targetPenalty(v: number, goal: GoalThresholds): number {
  const { lowGoal: L, highGoal: H } = goal;
  const hasL = L != null;
  const hasH = H != null;

  if (hasL && hasH) {
    // band: 0 inside, normalised distance outside
    if (v < L!) return (L! - v) / L!;
    if (v > H!) return (v - H!) / H!;
    return 0;
  }
  if (hasH) {
    // cap: minimise; gentle below, steep above
    if (v <= H!) return H! > 0 ? v / H! : 0;
    return 1 + (CAP_OVER_LAMBDA * (v - H!)) / H!;
  }
  if (hasL) {
    // minimum: reach it, no megadose reward
    if (v >= L!) return 0;
    return (L! - v) / L!;
  }
  return 0; // no goal — nothing to optimise toward
}

/** Cap-guard penalty for a non-target nutrient that has a high goal. */
function capGuardPenalty(v: number, H: number): number {
  if (H <= 0 || v <= H) return 0;
  return CAP_GUARD_WEIGHT * ((v - H) / H);
}

// ── Engine ──────────────────────────────────────────────────────────────────
export function optimizeDay(input: OptimizeInput): OptimizeOutput {
  const { targets, goals, meals, candidatesByLane, scope } = input;

  // Nutrients we actually need to total: targets + any nutrient with a high goal
  // (for the cap guard). Using a Set keeps the per-combo sum tight.
  const capGuardNutrients = Object.entries(goals)
    .filter(([id, g]) => g.highGoal != null && !targets.includes(Number(id)))
    .map(([id]) => Number(id));
  const relevant = Array.from(new Set([...targets, ...capGuardNutrients]));

  // Base vector: fixed contribution of locked + non-recipe meals.
  const base: NutrientVector = {};
  for (const n of relevant) base[n] = 0;
  const fixedMeals: OptCurrentMeal[] = [];
  const slots: Slot[] = [];

  for (const meal of meals) {
    const isFixed = meal.locked || meal.recipeId == null;
    if (isFixed) {
      fixedMeals.push(meal);
      addInto(base, meal.nutrients, relevant);
      continue;
    }

    // Swappable recipe slot.
    const laneCandidates = candidatesByLane[meal.mealType] ?? [];
    const usable = laneCandidates.filter((c) => hasAllTargets(c.nutrients, targets));

    const options: SlotOption[] = [
      {
        kind: 'current',
        recipeId: meal.recipeId,
        name: meal.name,
        nutrients: meal.nutrients,
        isFavorite: false,
      },
      ...usable
        .filter((c) => c.recipeId !== meal.recipeId)
        .map<SlotOption>((c) => ({
          kind: 'swap',
          recipeId: c.recipeId,
          name: c.name,
          nutrients: c.nutrients,
          isFavorite: c.isFavorite,
        })),
    ];
    if (scope.remove) {
      options.push({ kind: 'none', recipeId: null, name: null, nutrients: {}, isFavorite: false });
    }

    slots.push({
      laneType: meal.mealType,
      mealLogId: meal.mealLogId,
      originRecipeId: meal.recipeId,
      originName: meal.name,
      options,
      isAddSlot: false,
    });
  }

  // Optional single add slot (one extra side/snack/beverage for the whole day).
  if (scope.add) {
    const addCandidates: SlotOption[] = [];
    const seen = new Set<number>();
    for (const lane of ADDITIVE_LANES) {
      for (const c of candidatesByLane[lane] ?? []) {
        if (seen.has(c.recipeId)) continue;
        if (!hasAllTargets(c.nutrients, targets)) continue;
        seen.add(c.recipeId);
        addCandidates.push({
          kind: 'add',
          recipeId: c.recipeId,
          name: c.name,
          nutrients: c.nutrients,
          isFavorite: c.isFavorite,
          laneType: c.mealType,
        });
      }
    }
    if (addCandidates.length) {
      slots.push({
        laneType: 'add',
        mealLogId: null,
        originRecipeId: null,
        originName: null,
        options: [
          { kind: 'none', recipeId: null, name: null, nutrients: {}, isFavorite: false },
          ...addCandidates,
        ],
        isAddSlot: true,
      });
    }
  }

  // Nothing to optimise.
  const hasMoves = slots.some((s) => s.options.length > 1);
  if (!hasMoves) {
    const baselineTotals = cloneVector(base);
    return {
      baseline: { targets: targetSnapshot(baselineTotals, targets), totals: baselineTotals },
      variations: [],
      pruned: false,
      combosEvaluated: 0,
      note: 'nothing-to-optimize',
    };
  }

  // Prune candidate breadth if the cartesian product is too large.
  let pruned = false;
  let product = slots.reduce((acc, s) => acc * s.options.length, 1);
  if (product > PRUNE_THRESHOLD) {
    pruned = true;
    for (const slot of slots) pruneSlot(slot, targets, goals);
    product = slots.reduce((acc, s) => acc * s.options.length, 1);
  }

  // Baseline combo = every slot at its current option / add slot = none.
  const baselineChoice = slots.map((s) =>
    s.isAddSlot ? 0 : Math.max(0, s.options.findIndex((o) => o.kind === 'current'))
  );
  const baselineTotals = sumChoice(base, slots, baselineChoice, relevant);
  const baselineScore = scoreTotals(baselineTotals, targets, goals, capGuardNutrients, 1);

  // ── Exhaustive enumeration ──
  type Combo = {
    choice: number[];
    score: number; // equal-weight objective
    primary: number; // primary-weighted objective
    changes: number;
  };
  const combos: Combo[] = [];
  let evaluated = 0;

  const choice = new Array(slots.length).fill(0);
  const walk = (depth: number) => {
    if (depth === slots.length) {
      // Variety: no recipe used twice.
      if (hasDuplicateRecipe(slots, choice)) return;
      const totals = sumChoice(base, slots, choice, relevant);
      const score = scoreTotals(totals, targets, goals, capGuardNutrients, 1);
      const primary = scoreTotals(totals, targets, goals, capGuardNutrients, PRIMARY_WEIGHT);
      const favScore = FAV_EPSILON * countNonFavorites(slots, choice);
      combos.push({
        choice: choice.slice(),
        score: score + favScore,
        primary: primary + favScore,
        changes: countChanges(slots, choice),
      });
      evaluated++;
      return;
    }
    const opts = slots[depth].options;
    for (let i = 0; i < opts.length; i++) {
      choice[depth] = i;
      walk(depth + 1);
    }
  };
  walk(0);

  if (!combos.length) {
    return {
      baseline: { targets: targetSnapshot(baselineTotals, targets), totals: baselineTotals },
      variations: [],
      pruned,
      combosEvaluated: evaluated,
      note: 'nothing-to-optimize',
    };
  }

  // ── Variation selection (spec §8) ──
  const byBalance = [...combos].sort((a, b) => a.score - b.score);
  const byPrimary = [...combos].sort((a, b) => a.primary - b.primary);
  const improving = combos
    .filter((c) => c.score <= baselineScore - IMPROVE_MARGIN)
    .sort((a, b) => a.changes - b.changes || a.score - b.score);

  const chosen: { key: VariationKey; combo: Combo }[] = [];
  const usedKeys = new Set<string>();
  const tryAdd = (key: VariationKey, combo: Combo | undefined) => {
    if (!combo) return;
    const sig = combo.choice.join(',');
    if (usedKeys.has(sig)) return;
    usedKeys.add(sig);
    chosen.push({ key, combo });
  };

  tryAdd('balance', byBalance[0]);
  tryAdd('primary', byPrimary.find((c) => !usedKeys.has(c.choice.join(','))));
  tryAdd('closest', improving.find((c) => !usedKeys.has(c.choice.join(','))));

  // Backfill from the balance ranking if collisions left us short of 3.
  for (const c of byBalance) {
    if (chosen.length >= 3) break;
    const sig = c.choice.join(',');
    if (usedKeys.has(sig)) continue;
    usedKeys.add(sig);
    chosen.push({ key: 'balance', combo: c });
  }

  // Map each existing meal log to its slot (for ordered, complete output).
  const slotByMealLog = new Map<number, number>();
  slots.forEach((s, i) => {
    if (s.mealLogId != null) slotByMealLog.set(s.mealLogId, i);
  });

  const variations = chosen.map(({ key, combo }) =>
    buildVariation(key, combo.choice, slots, slotByMealLog, meals, base, relevant, targets, baselineTotals, combo.changes)
  );

  const note =
    variations.length === 0 || (improving.length === 0 && byBalance[0].score >= baselineScore - IMPROVE_MARGIN)
      ? 'already-optimal'
      : undefined;

  return {
    baseline: { targets: targetSnapshot(baselineTotals, targets), totals: baselineTotals },
    variations,
    pruned,
    combosEvaluated: evaluated,
    note,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function hasAllTargets(v: NutrientVector, targets: number[]): boolean {
  for (const t of targets) {
    const val = v[t];
    if (val == null) return false;
  }
  return true;
}

function addInto(acc: NutrientVector, v: NutrientVector, relevant: number[]): void {
  for (const n of relevant) {
    if (acc[n] === null) continue; // already poisoned
    const x = v[n];
    if (x == null) {
      acc[n] = null;
    } else {
      acc[n] = (acc[n] as number) + x;
    }
  }
}

function cloneVector(v: NutrientVector): NutrientVector {
  const out: NutrientVector = {};
  for (const k of Object.keys(v)) out[Number(k)] = v[Number(k)];
  return out;
}

function sumChoice(
  base: NutrientVector,
  slots: Slot[],
  choice: number[],
  relevant: number[]
): NutrientVector {
  const totals = cloneVector(base);
  for (let s = 0; s < slots.length; s++) {
    const opt = slots[s].options[choice[s]];
    addInto(totals, opt.nutrients, relevant);
  }
  // round for display stability
  for (const n of relevant) {
    if (totals[n] != null) totals[n] = Math.round((totals[n] as number) * 10) / 10;
  }
  return totals;
}

function scoreTotals(
  totals: NutrientVector,
  targets: number[],
  goals: Record<number, GoalThresholds>,
  capGuardNutrients: number[],
  primaryWeight: number
): number {
  let score = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const v = totals[t];
    const w = i === 0 ? primaryWeight : 1;
    if (v == null) {
      score += NULL_TARGET_PENALTY * w;
      continue;
    }
    const goal = goals[t] ?? {};
    score += w * targetPenalty(v, goal);
  }
  for (const n of capGuardNutrients) {
    const v = totals[n];
    if (v == null) continue;
    const H = goals[n]?.highGoal;
    if (H != null) score += capGuardPenalty(v, H);
  }
  return score;
}

function hasDuplicateRecipe(slots: Slot[], choice: number[]): boolean {
  const seen = new Set<number>();
  for (let s = 0; s < slots.length; s++) {
    const rid = slots[s].options[choice[s]].recipeId;
    if (rid == null) continue;
    if (seen.has(rid)) return true;
    seen.add(rid);
  }
  return false;
}

function countChanges(slots: Slot[], choice: number[]): number {
  let changes = 0;
  for (let s = 0; s < slots.length; s++) {
    const opt = slots[s].options[choice[s]];
    if (slots[s].isAddSlot) {
      if (opt.recipeId != null) changes++;
    } else if (opt.recipeId !== slots[s].originRecipeId) {
      changes++;
    }
  }
  return changes;
}

function countNonFavorites(slots: Slot[], choice: number[]): number {
  let n = 0;
  for (let s = 0; s < slots.length; s++) {
    const opt = slots[s].options[choice[s]];
    if (opt.kind === 'swap' || opt.kind === 'add') {
      if (!opt.isFavorite) n++;
    }
  }
  return n;
}

/** Keep the current + none options plus the top-K swaps by solo target help. */
function pruneSlot(slot: Slot, targets: number[], goals: Record<number, GoalThresholds>): void {
  const keep: SlotOption[] = [];
  const swaps: SlotOption[] = [];
  for (const o of slot.options) {
    if (o.kind === 'swap' || o.kind === 'add') swaps.push(o);
    else keep.push(o);
  }
  swaps.sort((a, b) => soloScore(a, targets, goals) - soloScore(b, targets, goals));
  slot.options = [...keep, ...swaps.slice(0, PRUNE_TOP_K)];
}

/** Lower = more helpful toward the targets in isolation. */
function soloScore(o: SlotOption, targets: number[], goals: Record<number, GoalThresholds>): number {
  let s = 0;
  for (const t of targets) {
    const v = o.nutrients[t];
    if (v == null) {
      s += NULL_TARGET_PENALTY;
      continue;
    }
    s += targetPenalty(v, goals[t] ?? {});
  }
  return s;
}

function targetSnapshot(totals: NutrientVector, targets: number[]): VariationTarget[] {
  return targets.map((t) => ({ nutrientId: t, current: totals[t] ?? null, proposed: totals[t] ?? null }));
}

function buildVariation(
  key: VariationKey,
  choice: number[],
  slots: Slot[],
  slotByMealLog: Map<number, number>,
  meals: OptCurrentMeal[],
  base: NutrientVector,
  relevant: number[],
  targets: number[],
  baselineTotals: NutrientVector,
  changes: number
): OptimizeVariation {
  const totals = sumChoice(base, slots, choice, relevant);
  const mealsOut: VariationMeal[] = [];
  let swaps = 0;
  let removes = 0;
  let adds = 0;

  // Walk the day in its original order so locked/non-recipe meals stay in place.
  for (const meal of meals) {
    const slotIdx = slotByMealLog.get(meal.mealLogId);
    if (slotIdx == null) {
      // Fixed: locked recipe, ingredient, or eating-out meal.
      mealsOut.push({
        mealLogId: meal.mealLogId,
        mealType: meal.mealType,
        state: 'kept',
        name: meal.name,
        recipeId: meal.recipeId,
        locked: true,
      });
      continue;
    }
    const slot = slots[slotIdx];
    const opt = slot.options[choice[slotIdx]];
    if (opt.kind === 'none') {
      removes++;
      mealsOut.push({ mealLogId: slot.mealLogId, mealType: slot.laneType, state: 'removed', name: slot.originName ?? '', recipeId: null });
    } else if (opt.recipeId !== slot.originRecipeId) {
      swaps++;
      mealsOut.push({ mealLogId: slot.mealLogId, mealType: slot.laneType, state: 'swapped', name: opt.name ?? '', fromName: slot.originName ?? undefined, recipeId: opt.recipeId });
    } else {
      mealsOut.push({ mealLogId: slot.mealLogId, mealType: slot.laneType, state: 'kept', name: opt.name ?? '', recipeId: opt.recipeId });
    }
  }

  // Added meals (the optional add slot) appended at the end.
  for (let s = 0; s < slots.length; s++) {
    if (!slots[s].isAddSlot) continue;
    const opt = slots[s].options[choice[s]];
    if (opt.recipeId != null) {
      adds++;
      mealsOut.push({ mealLogId: null, mealType: inferLane(opt), state: 'added', name: opt.name ?? '', recipeId: opt.recipeId });
    }
  }

  const targetsOut: VariationTarget[] = targets.map((t) => ({
    nutrientId: t,
    current: baselineTotals[t] ?? null,
    proposed: totals[t] ?? null,
  }));

  return { key, changes, swaps, removes, adds, meals: mealsOut, targets: targetsOut, totals };
}

/** Add options carry their lane (set at construction); fall back to 'snack'. */
function inferLane(opt: SlotOption): string {
  return opt.laneType ?? 'snack';
}
