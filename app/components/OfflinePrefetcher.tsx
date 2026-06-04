"use client";

import { useEffect } from "react";
import { usePersonContext } from "./PersonContext";

/**
 * Warms the service-worker cache so the app is genuinely usable offline
 * without the user having to browse every page first.
 *
 * Strategy: fetch in priority order, stop on any failure to avoid
 * hammering the network. All requests go through the service worker's
 * network-first handler, so successful fetches populate the cache.
 *
 * Runs once per page load, ~3s after mount, only when online.
 *
 * Priority order:
 *   1. Lists — recipes, ingredients, meal plans (cheap, used everywhere)
 *   2. Current week's plan detail + shopping list
 *   3. Recipe details for every recipe in the current week
 *   4. (Optional) All favorited recipe details
 */
export default function OfflinePrefetcher() {
  const { selectedPersonId } = usePersonContext();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedPersonId) return;
    if (!navigator.onLine) return;

    // Delay so we don't compete with first-paint resources
    const timer = window.setTimeout(() => {
      warmCache(selectedPersonId).catch(() => {
        // Silent — best-effort prefetch
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [selectedPersonId]);

  return null;
}

async function safeFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function isCurrentWeek(weekStartDate: string | Date): boolean {
  const d = weekStartDate instanceof Date ? weekStartDate : new Date(weekStartDate);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toDateString() === start.toDateString();
}

async function warmCache(personId: number) {
  // Phase 1 — lists in parallel
  const [, , planList] = await Promise.all([
    safeFetch("/api/recipes"),
    safeFetch("/api/ingredients"),
    safeFetch(`/api/meal-plans?personId=${personId}`),
  ]);

  if (!Array.isArray(planList)) return;

  // Phase 2 — the current week's plan + its shopping list
  const currentPlan = (planList as Array<{ id: number; weekStartDate: string }>).find((p) =>
    isCurrentWeek(p.weekStartDate)
  );
  if (!currentPlan) return;

  const [planDetail] = await Promise.all([
    safeFetch(`/api/meal-plans/${currentPlan.id}`),
    safeFetch(`/api/meal-plans/${currentPlan.id}/shopping-list`),
  ]);

  if (!planDetail || typeof planDetail !== "object") return;

  // Phase 3 — every recipe referenced in this week's mealLogs.
  // Recipe detail endpoints include nutrition, ingredients, instructions —
  // exactly what someone in a grocery store would want offline.
  const mealLogs = (planDetail as { mealLogs?: Array<{ recipeId?: number | null }> }).mealLogs ?? [];
  const recipeIds = Array.from(
    new Set(mealLogs.map((m) => m.recipeId).filter((id): id is number => typeof id === "number"))
  );

  // Sequential to be polite; usually <10 recipes per week
  for (const rid of recipeIds) {
    if (!navigator.onLine) break;
    await safeFetch(`/api/recipes/${rid}`);
  }

  // Phase 4 — favorited recipe details. Lower priority; only if Phase 3 finished.
  // Capped at 20 to avoid runaway fetches for power users.
  const recipesList = await safeFetch("/api/recipes");
  if (Array.isArray(recipesList)) {
    const favs = (recipesList as Array<{ id: number; isFavorited?: boolean }>)
      .filter((r) => r.isFavorited && !recipeIds.includes(r.id))
      .slice(0, 20);
    for (const r of favs) {
      if (!navigator.onLine) break;
      await safeFetch(`/api/recipes/${r.id}`);
    }
  }
}
