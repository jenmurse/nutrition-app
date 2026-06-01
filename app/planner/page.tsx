"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";
import { usePersonContext } from "@/app/components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
import EmptyState from "@/app/components/EmptyState";

/** Parse an ISO date string to a local Date preserving the calendar day. */
function parseUTCDate(dateStr: string | Date): Date {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const BASE_SLOTS = ["breakfast", "lunch", "dinner"] as const;
const ADD_SLOTS = ["snack", "side", "dessert", "beverage"] as const;
const ALL_SLOTS = [...BASE_SLOTS, ...ADD_SLOTS] as const;
type SlotType = (typeof ALL_SLOTS)[number];

const SLOT_LABELS: Record<SlotType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  side: "Side",
  dessert: "Dessert",
  beverage: "Beverage",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type MealLog = {
  id: number;
  date: string;
  mealType: string;
  position?: number | null;
  servings?: number | null;
  quantity?: number | null;
  unit?: string | null;
  recipeId?: number | null;
  recipe?: { id: number; name: string; servingSize: number; servingUnit: string; isComplete?: boolean } | null;
  ingredientId?: number | null;
  ingredient?: { id: number; name: string; defaultUnit: string } | null;
};

type DailyNutrition = {
  date: string | Date;
  dayOfWeek: string;
  totalNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    displayName: string;
    unit: string;
    value: number;
    lowGoal?: number | null;
    highGoal?: number | null;
    status?: "ok" | "warning" | "error";
  }>;
};

type MealPlanDetails = {
  id: number;
  weekStartDate: string | Date;
  personId: number | null;
  mealLogs: MealLog[];
  weeklySummary?: { dailyNutritions?: DailyNutrition[] };
  recipeCaloriesMap?: Record<number, number>;
  recipeNutrientsMap?: Record<number, Record<string, number>>;
  mealLogCaloriesMap?: Record<number, number>;
  mealLogNutrientsMap?: Record<number, Record<string, number>>;
};

type MealPlanSummary = {
  id: number;
  weekStartDate: string | Date;
  personId: number | null;
};

type RecipeSlim = {
  id: number;
  name: string;
  tags?: string;
  image?: string | null;
  isFavorited?: boolean;
  totals?: Array<{ nutrientId: number; displayName: string; value: number; unit: string }>;
};

type IngredientSlim = {
  id: number;
  name: string;
  defaultUnit: string;
  isMealItem?: boolean;
  isFavorited?: boolean;
  category?: string | null;
};

type BrowseState = {
  slot: SlotType;
  date: Date;
};

type BrowseTab = "favorites" | "all";

type PickerState = {
  slot: SlotType;
  date: Date;
  rect: { top: number; left: number; bottom: number; right: number };
};

export default function PlannerPageWrapper() {
  return (
    <Suspense>
      <PlannerPage />
    </Suspense>
  );
}

function PlannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams?.get("planId");
  const { selectedPersonId } = usePersonContext();

  const [plans, setPlans] = useState<MealPlanSummary[]>([]);
  const [plan, setPlan] = useState<MealPlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeSlim[]>([]);
  const [ingredients, setIngredients] = useState<IngredientSlim[]>([]);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [userAddedSlots, setUserAddedSlots] = useState<SlotType[]>([]);
  const [slotOrder, setSlotOrder] = useState<SlotType[]>([]);
  const [draggingSlot, setDraggingSlot] = useState<SlotType | null>(null);
  const [dropBeforeSlot, setDropBeforeSlot] = useState<SlotType | null>(null);
  const [dragKind, setDragKind] = useState<"slot" | "cell" | null>(null);
  const [draggingCell, setDraggingCell] = useState<{ date: Date; slot: SlotType; logId: number } | null>(null);
  const [dropTargetCell, setDropTargetCell] = useState<{ dateKey: string; slot: SlotType } | null>(null);
  const [browse, setBrowse] = useState<BrowseState | null>(null);
  const [browseTab, setBrowseTab] = useState<BrowseTab>("favorites");
  const [browseSearch, setBrowseSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // ── Mobile detection ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Persist user-added slot rows + slot order per plan ────────
  const extraSlotsKey = plan ? `gm-matrix-extra-slots-${plan.id}` : null;
  const slotOrderKey = plan ? `gm-matrix-slot-order-${plan.id}` : null;

  useEffect(() => {
    if (!extraSlotsKey || !slotOrderKey) return;
    if (typeof window === "undefined") return;
    try {
      const storedExtras = window.localStorage.getItem(extraSlotsKey);
      const parsedExtras: unknown = storedExtras ? JSON.parse(storedExtras) : [];
      const validExtras = Array.isArray(parsedExtras)
        ? (parsedExtras.filter((s): s is SlotType => ADD_SLOTS.includes(s as (typeof ADD_SLOTS)[number])) as SlotType[])
        : [];
      setUserAddedSlots(validExtras);
    } catch {
      setUserAddedSlots([]);
    }
    try {
      const storedOrder = window.localStorage.getItem(slotOrderKey);
      const parsedOrder: unknown = storedOrder ? JSON.parse(storedOrder) : [];
      const validOrder = Array.isArray(parsedOrder)
        ? (parsedOrder.filter((s): s is SlotType => ALL_SLOTS.includes(s as SlotType)) as SlotType[])
        : [];
      setSlotOrder(validOrder);
    } catch {
      setSlotOrder([]);
    }
  }, [extraSlotsKey, slotOrderKey]);

  function persistAddedSlots(next: SlotType[]) {
    setUserAddedSlots(next);
    if (extraSlotsKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(extraSlotsKey, JSON.stringify(next));
      } catch {}
    }
  }

  function persistSlotOrder(next: SlotType[]) {
    setSlotOrder(next);
    if (slotOrderKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(slotOrderKey, JSON.stringify(next));
      } catch {}
    }
  }

  // ── Load plan list + auto-select active plan ─────────────────
  useEffect(() => {
    if (selectedPersonId === null) return;
    let cancelled = false;

    const run = async () => {
      const key = `/api/meal-plans?personId=${selectedPersonId}`;
      const cached = clientCache.get<MealPlanSummary[]>(key);
      if (cached) {
        setPlans(cached);
      } else {
        setLoading(true);
      }
      try {
        let list: MealPlanSummary[] = cached ?? [];
        if (!cached) {
          const r = await fetch(key);
          if (!r.ok) throw new Error("Failed to load plans");
          list = await r.json();
          clientCache.set(key, list);
          if (cancelled) return;
          setPlans(list);
        }

        const urlPlanId = planIdParam ? Number(planIdParam) : null;
        let targetId = urlPlanId && list.some((p) => p.id === urlPlanId) ? urlPlanId : null;

        if (!targetId && list.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const matches = list.filter((p) => {
            const ws = parseUTCDate(p.weekStartDate);
            const we = new Date(ws);
            we.setDate(we.getDate() + 6);
            return today >= ws && today <= we;
          });
          const pick =
            matches.find((p) => parseUTCDate(p.weekStartDate).getDay() === 0) ??
            matches[0] ??
            list[0];
          targetId = pick?.id ?? null;
          if (targetId) {
            const params = new URLSearchParams(searchParams?.toString());
            params.set("planId", String(targetId));
            router.replace(`/planner?${params.toString()}`);
          }
        }

        if (targetId) {
          await loadPlanDetails(targetId);
        } else {
          setPlan(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error("Failed to load plans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  // ── Re-fetch when URL planId changes ─────────────────────────
  useEffect(() => {
    const id = planIdParam ? Number(planIdParam) : null;
    if (!id) return;
    if (plan?.id === id) return;
    if (!plans.some((p) => p.id === id)) return;
    loadPlanDetails(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planIdParam, plans]);

  // ── Load pantry items (ingredients) for the picker ───────────
  useEffect(() => {
    const cached = clientCache.get<IngredientSlim[]>("/api/ingredients");
    if (cached) setIngredients(cached);
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((data: IngredientSlim[]) => {
        if (Array.isArray(data)) {
          clientCache.set("/api/ingredients", data);
          setIngredients(data);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load recipes (slim) once for the picker; upgrade to full lazily ──
  useEffect(() => {
    const cachedFull = clientCache.get<RecipeSlim[]>("/api/recipes");
    const cachedSlim = clientCache.get<RecipeSlim[]>("/api/recipes?slim=true");
    if (cachedFull) setRecipes(cachedFull);
    else if (cachedSlim) setRecipes(cachedSlim);
    if (!cachedFull) {
      fetch("/api/recipes?slim=true")
        .then((r) => r.json())
        .then((data: RecipeSlim[]) => {
          if (Array.isArray(data)) {
            clientCache.set("/api/recipes?slim=true", data);
            setRecipes((prev) => (prev.length === 0 ? data : prev));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Lazy-load full recipes when the browse sheet opens (needed for kcal/macros)
  useEffect(() => {
    if (!browse) return;
    const cachedFull = clientCache.get<RecipeSlim[]>("/api/recipes");
    if (cachedFull && cachedFull.some((r) => r.totals && r.totals.length > 0)) return;
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data: RecipeSlim[]) => {
        if (Array.isArray(data)) {
          clientCache.set("/api/recipes", data);
          setRecipes(data);
        }
      })
      .catch(() => {});
  }, [browse]);

  async function loadPlanDetails(id: number) {
    const key = `/api/meal-plans/${id}`;
    const cached = clientCache.get<MealPlanDetails>(key);
    if (cached) setPlan(cached);
    try {
      const r = await fetch(key);
      if (!r.ok) throw new Error("Failed");
      const data: MealPlanDetails = await r.json();
      clientCache.set(key, data);
      setPlan(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load plan");
    }
  }

  async function refreshPlan() {
    if (!plan) return;
    // bust cache so next load gets fresh totals
    clientCache.set(`/api/meal-plans/${plan.id}`, null as unknown as MealPlanDetails);
    await loadPlanDetails(plan.id);
  }

  // ── Derive grid data ─────────────────────────────────────────
  const days = useMemo(() => {
    if (!plan) return [];
    const start = parseUTCDate(plan.weekStartDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [plan]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Default selected day: today if in the week, else the first day
  useEffect(() => {
    if (days.length === 0) return;
    if (selectedDayKey && days.some((d) => d.toDateString() === selectedDayKey)) return;
    const todayInWeek = days.find((d) => d.toDateString() === today.toDateString());
    setSelectedDayKey((todayInWeek ?? days[0]).toDateString());
  }, [days, today, selectedDayKey]);

  const selectedDay = useMemo(() => {
    if (!selectedDayKey) return days[0] ?? null;
    return days.find((d) => d.toDateString() === selectedDayKey) ?? days[0] ?? null;
  }, [days, selectedDayKey]);

  const cellMap = useMemo(() => {
    const map = new Map<string, MealLog[]>();
    if (!plan) return map;
    for (const log of plan.mealLogs) {
      const d = parseUTCDate(log.date);
      const key = `${d.toDateString()}|${log.mealType}`;
      const arr = map.get(key) ?? [];
      arr.push(log);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [plan]);

  const slotRows: SlotType[] = useMemo(() => {
    if (!plan) return [...BASE_SLOTS];
    // Eligible: base slots + any extra with meals or user-added
    const eligible = new Set<SlotType>(BASE_SLOTS);
    for (const extra of ADD_SLOTS) {
      const hasAny = plan.mealLogs.some((l) => l.mealType === extra);
      const userAdded = userAddedSlots.includes(extra);
      if (hasAny || userAdded) eligible.add(extra);
    }
    // Start with the user's saved order, filtering to eligible
    const ordered: SlotType[] = slotOrder.filter((s) => eligible.has(s));
    // Append any eligible slot not yet in the order (preserving default order)
    for (const s of ALL_SLOTS) {
      if (eligible.has(s) && !ordered.includes(s)) ordered.push(s);
    }
    return ordered;
  }, [plan, userAddedSlots, slotOrder]);

  const dailyTotals = useMemo(() => {
    const arr = plan?.weeklySummary?.dailyNutritions ?? [];
    return arr.map((d) => ({
      date: parseUTCDate(d.date),
      nutrients: d.totalNutrients,
    }));
  }, [plan]);

  function totalsForDay(d: Date) {
    return dailyTotals.find((dn) => dn.date.toDateString() === d.toDateString());
  }

  function nutrientCell(
    day: ReturnType<typeof totalsForDay>,
    keys: string[],
    fmt: (v: number) => string
  ) {
    if (!day) return { value: "—", over: false, met: false, hasGoal: false, empty: true };
    const match = day.nutrients.find((n) =>
      keys.some((k) => n.displayName.toLowerCase().includes(k))
    );
    if (!match || match.value === 0) return { value: "—", over: false, met: false, hasGoal: false, empty: true };
    const over = match.highGoal != null && match.value > match.highGoal;
    const met = match.lowGoal != null && match.value >= match.lowGoal;
    return {
      value: fmt(match.value),
      over,
      met: met && !over,
      hasGoal: match.highGoal != null || match.lowGoal != null,
      empty: false,
    };
  }

  // ── Range label ──────────────────────────────────────────────
  const rangeLabel = useMemo(() => {
    if (!plan || days.length === 0) return "";
    const s = days[0];
    const e = days[6];
    const sm = s.toLocaleString("default", { month: "short" });
    const em = e.toLocaleString("default", { month: "short" });
    if (sm === em) return `${sm} ${s.getDate()}–${e.getDate()}`;
    return `${sm} ${s.getDate()} – ${em} ${e.getDate()}`;
  }, [plan, days]);

  // ── Cell click → open picker ─────────────────────────────────
  function openPicker(slot: SlotType, date: Date, e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setPicker({
      slot,
      date,
      rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right },
    });
  }

  function closePicker() {
    setPicker(null);
  }

  // Recipes filtered for the active picker
  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    const slot = picker.slot;
    return recipes
      .filter((r) => r.isFavorited)
      .filter((r) => {
        const tags = (r.tags ?? "").toLowerCase().split(",").map((t) => t.trim());
        return tags.includes(slot);
      });
  }, [picker, recipes]);

  // Pantry items filtered for the picker — favorited + flagged as meal-eligible
  const pantryOptions = useMemo(() => {
    if (!picker) return [];
    return ingredients.filter((i) => i.isFavorited && i.isMealItem);
  }, [picker, ingredients]);

  function getRecipeKcal(r: RecipeSlim): number | null {
    if (!r.totals) return null;
    const match = r.totals.find((t) => {
      const n = t.displayName.toLowerCase();
      return n.includes("calorie") || n.includes("energy");
    });
    return match ? Math.round(match.value) : null;
  }

  // Add or swap a meal in a cell
  // Add a recipe to the active picker's cell (multi-select model)
  async function pickRecipe(recipeId: number) {
    if (!picker || !plan) return;
    const date = picker.date;
    const slot = picker.slot;
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const recipe = recipes.find((r) => r.id === recipeId);
    const cellKey = `${date.toDateString()}|${slot}`;
    const optimisticLog: MealLog = {
      id: -Date.now(),
      date: dateISO,
      mealType: slot,
      servings: 1,
      recipeId,
      recipe: recipe ? { id: recipe.id, name: recipe.name, servingSize: 1, servingUnit: "serving" } : undefined,
      position: (cellMap.get(cellKey)?.length ?? 0),
    };

    setPlan((prev) => prev ? { ...prev, mealLogs: [...prev.mealLogs, optimisticLog] } : prev);

    try {
      const postRes = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, date: dateISO, mealType: slot, servings: 1 }),
      });
      if (!postRes.ok) throw new Error("Failed");
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add meal");
      await refreshPlan();
    }
  }

  // Toggle a recipe in/out of the picker's cell — used in picker
  async function toggleRecipeInCell(recipeId: number) {
    if (!picker || !plan) return;
    const cellKey = `${picker.date.toDateString()}|${picker.slot}`;
    const logs = cellMap.get(cellKey) ?? [];
    const existing = logs.find((l) => l.recipeId === recipeId);
    if (existing) {
      await removeLogById(existing.id);
    } else {
      await pickRecipe(recipeId);
    }
  }

  // Add a pantry ingredient to the active picker's cell
  async function pickIngredient(ingredientId: number) {
    if (!picker || !plan) return;
    const date = picker.date;
    const slot = picker.slot;
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    const cellKey = `${date.toDateString()}|${slot}`;
    const optimisticLog: MealLog = {
      id: -Date.now(),
      date: dateISO,
      mealType: slot,
      quantity: 1,
      unit: ing.defaultUnit,
      ingredientId,
      ingredient: { id: ing.id, name: ing.name, defaultUnit: ing.defaultUnit },
      position: (cellMap.get(cellKey)?.length ?? 0),
    };
    setPlan((prev) => prev ? { ...prev, mealLogs: [...prev.mealLogs, optimisticLog] } : prev);
    try {
      const r = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientId, date: dateISO, mealType: slot, quantity: 1, unit: ing.defaultUnit }),
      });
      if (!r.ok) throw new Error("Failed");
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add pantry item");
      await refreshPlan();
    }
  }

  // Toggle a pantry ingredient in/out of the picker's cell
  async function toggleIngredientInCell(ingredientId: number) {
    if (!picker || !plan) return;
    const cellKey = `${picker.date.toDateString()}|${picker.slot}`;
    const logs = cellMap.get(cellKey) ?? [];
    const existing = logs.find((l) => l.ingredientId === ingredientId);
    if (existing) {
      await removeLogById(existing.id);
    } else {
      await pickIngredient(ingredientId);
    }
  }

  // Adjust servings (recipes) or quantity (ingredients) by delta
  async function bumpAmount(log: MealLog, delta: number) {
    if (!plan) return;
    const isRecipe = log.recipeId != null;
    const current = (isRecipe ? log.servings : log.quantity) ?? 1;
    const next = current + delta;
    if (next <= 0) {
      await removeLogById(log.id);
      return;
    }
    // Optimistic
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        mealLogs: prev.mealLogs.map((l) =>
          l.id === log.id
            ? isRecipe
              ? { ...l, servings: next }
              : { ...l, quantity: next }
            : l
        ),
      };
    });
    try {
      const body = isRecipe ? { servings: next } : { quantity: next };
      const r = await fetch(`/api/meal-plans/${plan.id}/meals/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update servings");
      await refreshPlan();
    }
  }

  async function removeLogById(logId: number) {
    if (!plan) return;
    setPlan((prev) => prev ? { ...prev, mealLogs: prev.mealLogs.filter((l) => l.id !== logId) } : prev);
    try {
      const r = await fetch(`/api/meal-plans/${plan.id}/meals/${logId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't remove meal");
      await refreshPlan();
    }
  }

  // ── Slot drag-reorder ────────────────────────────────────────
  function onSlotDragStart(slot: SlotType, e: React.DragEvent<HTMLDivElement>) {
    setDragKind("slot");
    setDraggingSlot(slot);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", `slot:${slot}`); } catch {}
  }
  function onSlotDragOver(slot: SlotType, e: React.DragEvent<HTMLDivElement>) {
    if (dragKind !== "slot" || !draggingSlot || draggingSlot === slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropBeforeSlot !== slot) setDropBeforeSlot(slot);
  }
  function onSlotDragLeave(slot: SlotType) {
    if (dropBeforeSlot === slot) setDropBeforeSlot(null);
  }
  function onSlotDrop(targetSlot: SlotType, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (dragKind !== "slot" || !draggingSlot || draggingSlot === targetSlot) {
      clearAllDrag();
      return;
    }
    const next = slotRows.filter((s) => s !== draggingSlot);
    const idx = next.indexOf(targetSlot);
    if (idx >= 0) next.splice(idx, 0, draggingSlot);
    else next.push(draggingSlot);
    persistSlotOrder(next);
    clearAllDrag();
  }
  function onSlotDragEnd() {
    clearAllDrag();
  }

  // ── Cell drag (move/swap between days+slots) ─────────────────
  function clearAllDrag() {
    setDragKind(null);
    setDraggingSlot(null);
    setDropBeforeSlot(null);
    setDraggingCell(null);
    setDropTargetCell(null);
  }

  function onCellDragStart(
    date: Date,
    slot: SlotType,
    logId: number,
    e: React.DragEvent<HTMLDivElement>
  ) {
    setDragKind("cell");
    setDraggingCell({ date, slot, logId });
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", `meal:${logId}`); } catch {}
  }

  function onCellDragOver(date: Date, slot: SlotType, e: React.DragEvent<HTMLDivElement>) {
    if (dragKind !== "cell" || !draggingCell) return;
    if (draggingCell.date.toDateString() === date.toDateString() && draggingCell.slot === slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const key = `${date.toDateString()}|${slot}`;
    if (dropTargetCell?.dateKey !== date.toDateString() || dropTargetCell?.slot !== slot) {
      setDropTargetCell({ dateKey: date.toDateString(), slot });
    }
  }

  function onCellDragLeave(date: Date, slot: SlotType) {
    if (dropTargetCell?.dateKey === date.toDateString() && dropTargetCell?.slot === slot) {
      setDropTargetCell(null);
    }
  }

  async function onCellDrop(targetDate: Date, targetSlot: SlotType, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const src = draggingCell;
    if (dragKind !== "cell" || !src || !plan) { clearAllDrag(); return; }
    if (src.date.toDateString() === targetDate.toDateString() && src.slot === targetSlot) {
      clearAllDrag();
      return;
    }
    await moveOrSwapMeal(src, { date: targetDate, slot: targetSlot });
    clearAllDrag();
  }

  function onCellDragEnd() {
    clearAllDrag();
  }

  function isoLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  type CellRef = { date: Date; slot: SlotType };

  function logToPostBody(log: MealLog, date: Date, slot: SlotType): Record<string, unknown> {
    const body: Record<string, unknown> = {
      date: isoLocalDate(date),
      mealType: slot,
    };
    if (log.recipeId) {
      body.recipeId = log.recipeId;
      body.servings = log.servings ?? 1;
    } else if (log.ingredientId) {
      body.ingredientId = log.ingredientId;
      body.quantity = log.quantity ?? 1;
      body.unit = log.unit ?? "g";
    }
    return body;
  }

  async function moveOrSwapMeal(src: { date: Date; slot: SlotType; logId: number }, target: CellRef) {
    if (!plan) return;
    const sourceLog = plan.mealLogs.find((l) => l.id === src.logId);
    if (!sourceLog) return;
    const targetKey = `${target.date.toDateString()}|${target.slot}`;
    const targetLogs = cellMap.get(targetKey) ?? [];
    const targetLog = targetLogs[0];

    // Optimistic local update
    setPlan((prev) => {
      if (!prev) return prev;
      let logs = [...prev.mealLogs];
      const targetDateISO = isoLocalDate(target.date);
      const sourceDateISO = isoLocalDate(src.date);
      if (targetLog) {
        // Swap: source → target's date+slot, target → source's date+slot
        logs = logs.map((l) => {
          if (l.id === sourceLog.id) return { ...l, date: targetDateISO, mealType: target.slot };
          if (l.id === targetLog.id) return { ...l, date: sourceDateISO, mealType: src.slot };
          return l;
        });
      } else {
        // Move
        logs = logs.map((l) =>
          l.id === sourceLog.id ? { ...l, date: targetDateISO, mealType: target.slot } : l
        );
      }
      return { ...prev, mealLogs: logs };
    });

    try {
      // DELETE existing + POST replacements (preserves servings/quantity but not custom notes)
      const deletions: Promise<Response>[] = [
        fetch(`/api/meal-plans/${plan.id}/meals/${sourceLog.id}`, { method: "DELETE" }),
      ];
      if (targetLog) {
        deletions.push(
          fetch(`/api/meal-plans/${plan.id}/meals/${targetLog.id}`, { method: "DELETE" })
        );
      }
      await Promise.all(deletions);

      // POST source's content at target location
      await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logToPostBody(sourceLog, target.date, target.slot)),
      });
      // If swap, POST target's content at source location
      if (targetLog) {
        await fetch(`/api/meal-plans/${plan.id}/meals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logToPostBody(targetLog, src.date, src.slot)),
        });
      }
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't move meal");
      await refreshPlan();
    }
  }

  function addSlotRow(slot: SlotType) {
    if (userAddedSlots.includes(slot)) return;
    persistAddedSlots([...userAddedSlots, slot]);
  }

  async function removeSlotRow(slot: SlotType) {
    if (!plan) return;
    if (BASE_SLOTS.includes(slot as (typeof BASE_SLOTS)[number])) return;
    const mealsInRow = plan.mealLogs.filter((l) => l.mealType === slot);
    if (mealsInRow.length > 0) {
      const ok = await dialog.confirm({
        title: `Remove the ${SLOT_LABELS[slot]} row?`,
        body: `${mealsInRow.length} ${SLOT_LABELS[slot].toLowerCase()} meal${mealsInRow.length === 1 ? "" : "s"} on this week will be deleted.`,
        confirmLabel: "Remove",
        danger: true,
      });
      if (!ok) return;
      // Optimistic: drop those logs locally
      setPlan((prev) => prev ? { ...prev, mealLogs: prev.mealLogs.filter((l) => l.mealType !== slot) } : prev);
      try {
        await Promise.all(
          mealsInRow.map((l) =>
            fetch(`/api/meal-plans/${plan.id}/meals/${l.id}`, { method: "DELETE" })
          )
        );
        await refreshPlan();
      } catch (e) {
        console.error(e);
        toast.error("Couldn't remove all meals");
        await refreshPlan();
      }
    }
    persistAddedSlots(userAddedSlots.filter((s) => s !== slot));
  }

  // ── Picker positioning ───────────────────────────────────────
  const pickerPosition = useMemo(() => {
    if (!picker) return null;
    if (typeof window === "undefined") return null;
    const PICKER_WIDTH = 260;
    const PICKER_MAX_H = window.innerHeight * 0.6;
    const margin = 8;

    // Default: anchor below the cell, left-aligned to the cell
    let top = picker.rect.bottom + 1;
    let left = picker.rect.left;

    // Flip up if it would clip the bottom
    if (top + PICKER_MAX_H > window.innerHeight - margin) {
      top = Math.max(margin, picker.rect.top - PICKER_MAX_H - 1);
    }
    // Constrain right edge
    if (left + PICKER_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - PICKER_WIDTH - margin);
    }

    return { top, left };
  }, [picker]);

  // ── Picker — close on Escape ─────────────────────────────────
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePicker(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picker]);

  // ── Browse sheet ─────────────────────────────────────────────
  function openBrowse() {
    if (!picker) return;
    setBrowse({ slot: picker.slot, date: picker.date });
    setBrowseTab("favorites");
    setBrowseSearch("");
    closePicker();
  }
  function closeBrowse() {
    setBrowse(null);
  }
  useEffect(() => {
    if (!browse) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeBrowse(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [browse]);

  // Recipes matching the browse sheet's slot, filtered by search
  const browseFiltered = useMemo(() => {
    if (!browse) return { favorites: [], rest: [] };
    const slot = browse.slot;
    const q = browseSearch.trim().toLowerCase();
    const match = recipes.filter((r) => {
      const tags = (r.tags ?? "").toLowerCase().split(",").map((t) => t.trim());
      if (!tags.includes(slot)) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return {
      favorites: match.filter((r) => r.isFavorited),
      rest: match.filter((r) => !r.isFavorited),
    };
  }, [browse, browseSearch, recipes]);

  async function toggleRecipeFavorite(recipeId: number, next: boolean) {
    setRecipes((prev) => prev.map((r) => r.id === recipeId ? { ...r, isFavorited: next } : r));
    const cachedFull = clientCache.get<RecipeSlim[]>("/api/recipes");
    if (cachedFull) {
      clientCache.set("/api/recipes", cachedFull.map((r) => r.id === recipeId ? { ...r, isFavorited: next } : r));
    }
    const cachedSlim = clientCache.get<RecipeSlim[]>("/api/recipes?slim=true");
    if (cachedSlim) {
      clientCache.set("/api/recipes?slim=true", cachedSlim.map((r) => r.id === recipeId ? { ...r, isFavorited: next } : r));
    }
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error("Failed");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update favorite");
      setRecipes((prev) => prev.map((r) => r.id === recipeId ? { ...r, isFavorited: !next } : r));
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="pl-toolbar">
        <span className="pl-range">{rangeLabel || "Matrix planner"}</span>
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
          Beta
        </span>
        <div className="flex-1" />
        <Link
          href={plan ? `/meal-plans?planId=${plan.id}` : "/meal-plans"}
          className="ed-btn-text"
          aria-label="Back to the classic planner"
        >
          <span aria-hidden="true">←</span> Classic
        </Link>
      </div>

      <div className="list-scroll flex-1 overflow-y-auto relative">
        {loading && !plan && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-mono text-[13px] text-[var(--muted)] animate-loading">
              Loading planner…
            </div>
          </div>
        )}

        <div className="animate-page-enter" style={{ minHeight: "100%" }}>
          {!loading && !plan && plans.length === 0 && (
            <div className="mx-empty">
              <EmptyState
                eyebrow="§ NO PLANS YET"
                headline="A blank planner."
                lede={<>Create your first meal plan to start using<br />the matrix view.</>}
                ctaLabel="+ NEW PLAN →"
                onCta={() => router.push("/meal-plans?showForm=true")}
              />
            </div>
          )}

          {plan && isMobile && selectedDay && (
            <>
              {/* Mobile second toolbar — week + prev/next */}
              <div className="mx-mob-tb">
                <span className="mx-mob-week">{rangeLabel}</span>
                <div className="mx-mob-arrows">
                  <button
                    className="mx-mob-arrow"
                    disabled={(() => {
                      const idx = plans.findIndex((p) => p.id === plan.id);
                      return idx < 0 || idx >= plans.length - 1;
                    })()}
                    onClick={() => {
                      const idx = plans.findIndex((p) => p.id === plan.id);
                      if (idx >= 0 && idx < plans.length - 1) {
                        const next = plans[idx + 1];
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set("planId", String(next.id));
                        router.push(`/planner?${params.toString()}`);
                      }
                    }}
                    aria-label="Previous week"
                  >‹ Prev</button>
                  <button
                    className="mx-mob-arrow"
                    disabled={(() => {
                      const idx = plans.findIndex((p) => p.id === plan.id);
                      return idx <= 0;
                    })()}
                    onClick={() => {
                      const idx = plans.findIndex((p) => p.id === plan.id);
                      if (idx > 0) {
                        const prev = plans[idx - 1];
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set("planId", String(prev.id));
                        router.push(`/planner?${params.toString()}`);
                      }
                    }}
                    aria-label="Next week"
                  >Next ›</button>
                </div>
              </div>

              {/* Day strip */}
              <div className="mx-mob-daystrip">
                {days.map((d) => {
                  const isActive = d.toDateString() === selectedDayKey;
                  const isToday = d.toDateString() === today.toDateString();
                  const hasMeals = plan.mealLogs.some((l) => parseUTCDate(l.date).toDateString() === d.toDateString());
                  return (
                    <button
                      key={d.toISOString()}
                      className={`mx-mob-day${isActive ? " active" : ""}${hasMeals ? " has-meals" : ""}`}
                      onClick={() => setSelectedDayKey(d.toDateString())}
                      aria-pressed={isActive}
                      aria-label={`${DAY_NAMES[d.getDay()]} ${d.getDate()}`}
                    >
                      <div className="mx-mob-day-name">{DAY_NAMES[d.getDay()]}</div>
                      <div className={`mx-mob-day-num${isToday ? " today" : ""}`}>{d.getDate()}</div>
                      <div className="mx-mob-day-dot" />
                    </button>
                  );
                })}
              </div>

              {/* Slot rows for the active day */}
              {slotRows.map((slot) => {
                const key = `${selectedDay.toDateString()}|${slot}`;
                const logs = cellMap.get(key) ?? [];
                const first = logs[0];
                const extra = logs.length - 1;
                const isRemovable = !BASE_SLOTS.includes(slot as (typeof BASE_SLOTS)[number]);
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`mx-mob-slot${first ? "" : " empty"}`}
                    onClick={(e) => openPicker(slot, selectedDay, e as unknown as React.MouseEvent<HTMLDivElement>)}
                    aria-label={first ? `${SLOT_LABELS[slot]}: ${first.recipe?.name ?? first.ingredient?.name ?? "meal"}` : `Add ${SLOT_LABELS[slot]}`}
                  >
                    <div className="mx-mob-slot-label">
                      <span>{SLOT_LABELS[slot]}</span>
                      {isRemovable && (
                        <span
                          className="mx-mob-slot-remove"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); removeSlotRow(slot); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeSlotRow(slot); } }}
                          aria-label={`Remove ${SLOT_LABELS[slot]} row`}
                        >✕</span>
                      )}
                    </div>
                    {logs.length > 0 ? (
                      logs.map((log, idx) => (
                        <div key={log.id} style={idx > 0 ? { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--rule)" } : undefined}>
                          <div className="mx-mob-slot-name">
                            {log.recipe?.name ?? log.ingredient?.name ?? "Unnamed"}
                          </div>
                          <div className="mx-mob-slot-meta">
                            {log.servings && log.servings !== 1
                              ? `${log.servings}× serving`
                              : log.recipe
                              ? "1 serving"
                              : log.quantity
                              ? `${log.quantity}${log.unit ?? ""}`
                              : ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="mx-mob-slot-name">+ pick</div>
                    )}
                  </button>
                );
              })}

              {/* Need more? */}
              {ADD_SLOTS.some((s) => !slotRows.includes(s)) && (
                <div className="mx-mob-addslot">
                  <span className="mx-mob-addslot-label">Need more?</span>
                  {ADD_SLOTS.filter((s) => !slotRows.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="mx-mob-addslot-btn"
                      onClick={() => addSlotRow(s)}
                      aria-label={`Add ${SLOT_LABELS[s]} row`}
                    >+ {SLOT_LABELS[s]}</button>
                  ))}
                </div>
              )}

              {/* Day totals */}
              {(() => {
                const day = totalsForDay(selectedDay);
                const cal = nutrientCell(day, ["calorie", "energy"], (v) => `${Math.round(v)}`);
                const fat = nutrientCell(day, ["total fat", "fat"], (v) => `${Math.round(v)}g`);
                const sat = nutrientCell(day, ["saturated"], (v) => `${Math.round(v)}g`);
                const na = nutrientCell(day, ["sodium"], (v) => `${Math.round(v)}mg`);
                const carb = nutrientCell(day, ["carbohydrate", "carb"], (v) => `${Math.round(v)}g`);
                const sugar = nutrientCell(day, ["sugar"], (v) => `${Math.round(v)}g`);
                const prot = nutrientCell(day, ["protein"], (v) => `${Math.round(v)}g`);
                const fiber = nutrientCell(day, ["fiber"], (v) => `${Math.round(v)}g`);
                const cells = [
                  { k: "Cal", c: cal },
                  { k: "Fat", c: fat },
                  { k: "Sat F", c: sat },
                  { k: "Na", c: na },
                  { k: "Carb", c: carb },
                  { k: "Sugar", c: sugar },
                  { k: "Prot", c: prot },
                  { k: "Fiber", c: fiber },
                ];
                return (
                  <div className="mx-mob-totals">
                    <div className="mx-mob-totals-head">
                      {DAY_NAMES[selectedDay.getDay()]} totals
                    </div>
                    <div className="mx-mob-totals-grid">
                      {cells.map((r) => (
                        <div className="mx-mob-tot-cell" key={r.k}>
                          <div className="k">{r.k}</div>
                          <div className={`v${r.c.over ? " over" : r.c.met ? " met" : ""}${r.c.empty ? " empty" : ""}`}>
                            {r.c.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {plan && !isMobile && (
            <div className="mx" key={plan.id}>
              <div className="mx-corner" />
              {days.map((d) => {
                const isToday = d.toDateString() === today.toDateString();
                return (
                  <div className="mx-day-head" key={d.toISOString()}>
                    <div className="mx-day-name">{DAY_NAMES[d.getDay()]}</div>
                    <div className={`mx-day-num${isToday ? " today" : ""}`}>{d.getDate()}</div>
                  </div>
                );
              })}

              {slotRows.map((slot) => {
                const isRemovable = !BASE_SLOTS.includes(slot as (typeof BASE_SLOTS)[number]);
                const isDragging = draggingSlot === slot;
                const isDropTarget = dropBeforeSlot === slot;
                return (
                <React.Fragment key={slot}>
                  <div
                    className={`mx-slot-label${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-before" : ""}`}
                    draggable
                    onDragStart={(e) => onSlotDragStart(slot, e)}
                    onDragOver={(e) => onSlotDragOver(slot, e)}
                    onDragLeave={() => onSlotDragLeave(slot)}
                    onDrop={(e) => onSlotDrop(slot, e)}
                    onDragEnd={onSlotDragEnd}
                  >
                    <span className="mx-slot-handle" aria-hidden="true">
                      <span className="mx-slot-grip">⋮⋮</span>
                      <span>{SLOT_LABELS[slot]}</span>
                    </span>
                    {isRemovable && (
                      <button
                        type="button"
                        className="mx-slot-remove"
                        onClick={() => removeSlotRow(slot)}
                        aria-label={`Remove ${SLOT_LABELS[slot]} row`}
                        title={`Remove ${SLOT_LABELS[slot]} row`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {days.map((d) => {
                    const key = `${d.toDateString()}|${slot}`;
                    const logs = cellMap.get(key) ?? [];
                    const first = logs[0];
                    const extra = logs.length - 1;
                    const isOpen = picker?.slot === slot && picker?.date.toDateString() === d.toDateString();
                    const isCellTarget = dragKind === "cell"
                      && dropTargetCell?.dateKey === d.toDateString()
                      && dropTargetCell?.slot === slot;
                    const isCellDragging = dragKind === "cell"
                      && draggingCell?.date.toDateString() === d.toDateString()
                      && draggingCell?.slot === slot;
                    return (
                      <div
                        className={`mx-cell is-clickable${isOpen ? " is-target" : ""}${isDropTarget && dragKind === "slot" ? " is-drop-before" : ""}${isCellTarget ? " is-cell-target" : ""}${isCellDragging ? " is-cell-dragging" : ""}`}
                        draggable={!!first && logs.length === 1}
                        onDragStart={(e) => first && logs.length === 1 ? onCellDragStart(d, slot, first.id, e) : undefined}
                        onDragEnd={onCellDragEnd}
                        onDragOver={(e) => {
                          if (dragKind === "cell") onCellDragOver(d, slot, e);
                          else onSlotDragOver(slot, e);
                        }}
                        onDragLeave={() => {
                          if (dragKind === "cell") onCellDragLeave(d, slot);
                          else onSlotDragLeave(slot);
                        }}
                        onDrop={(e) => {
                          if (dragKind === "cell") onCellDrop(d, slot, e);
                          else onSlotDrop(slot, e);
                        }}
                        key={`${slot}-${d.toISOString()}`}
                        onClick={(e) => openPicker(slot, d, e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openPicker(slot, d, e as unknown as React.MouseEvent<HTMLDivElement>);
                          }
                        }}
                        aria-label={first ? `${SLOT_LABELS[slot]} ${d.toDateString()}: ${first.recipe?.name ?? first.ingredient?.name ?? "meal"}` : `Add ${SLOT_LABELS[slot]} for ${d.toDateString()}`}
                      >
                        {logs.length > 0 ? (
                          logs.map((log) => (
                            <div className="mx-cell-item" key={log.id}>
                              <div className="mx-cell-name">
                                {log.recipe?.name ?? log.ingredient?.name ?? "Unnamed"}
                              </div>
                              <div className="mx-cell-meta">
                                {log.servings && log.servings !== 1
                                  ? `${log.servings}× serving`
                                  : log.recipe
                                  ? "1 serving"
                                  : log.quantity
                                  ? `${log.quantity}${log.unit ?? ""}`
                                  : ""}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="mx-cell-add">+ pick</div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
                );
              })}

              <div className="mx-addslot">
                <span className="mx-addslot-label">Need more?</span>
                {ADD_SLOTS.filter((s) => !slotRows.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="mx-addslot-btn"
                    onClick={() => addSlotRow(s)}
                    aria-label={`Add ${SLOT_LABELS[s]} row`}
                  >
                    + {SLOT_LABELS[s]}
                  </button>
                ))}
                {ADD_SLOTS.every((s) => slotRows.includes(s)) && (
                  <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
                    All slot types in use
                  </span>
                )}
              </div>

              <div className="mx-totals-label">Daily totals</div>
              {days.map((d) => {
                const day = totalsForDay(d);
                const cal = nutrientCell(day, ["calorie", "energy"], (v) => `${Math.round(v)}`);
                const fat = nutrientCell(day, ["total fat", "fat"], (v) => `${Math.round(v)}g`);
                const sat = nutrientCell(day, ["saturated"], (v) => `${Math.round(v)}g`);
                const na = nutrientCell(day, ["sodium"], (v) => `${Math.round(v)}mg`);
                const prot = nutrientCell(day, ["protein"], (v) => `${Math.round(v)}g`);
                const fiber = nutrientCell(day, ["fiber"], (v) => `${Math.round(v)}g`);
                const rows = [
                  { k: "Cal", c: cal },
                  { k: "Fat", c: fat },
                  { k: "SatF", c: sat },
                  { k: "Na", c: na },
                  { k: "Prot", c: prot },
                  { k: "Fiber", c: fiber },
                ];
                return (
                  <div className="mx-totals" key={`tot-${d.toISOString()}`}>
                    {rows.map((r) => (
                      <div className="mx-tot-row" key={r.k}>
                        <span className="mx-tot-key">{r.k}</span>
                        <span
                          className={`mx-tot-val${r.c.over ? " over" : r.c.met ? " met" : ""}${r.c.empty ? " empty" : ""}`}
                        >
                          {r.c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Picker portal ─────────────────────────────────────── */}
      {picker && pickerPosition && typeof window !== "undefined" &&
        createPortal(
          <>
            <div className="mx-picker-backdrop" onClick={closePicker} aria-hidden="true" />
            <div
              className="mx-picker"
              style={{ top: pickerPosition.top, left: pickerPosition.left }}
              role="dialog"
              aria-label={`Pick a ${SLOT_LABELS[picker.slot]} for ${picker.date.toDateString()}`}
            >
              {(() => {
                const cellKey = `${picker.date.toDateString()}|${picker.slot}`;
                const currentLogs = cellMap.get(cellKey) ?? [];
                const recipeLogsById = new Map<number, MealLog>();
                const ingredientLogsById = new Map<number, MealLog>();
                for (const l of currentLogs) {
                  if (l.recipeId != null) recipeLogsById.set(l.recipeId, l);
                  if (l.ingredientId != null) ingredientLogsById.set(l.ingredientId, l);
                }
                const hasAny = pickerOptions.length > 0 || pantryOptions.length > 0;
                return (
                  <>
                    <div className="mx-picker-head">
                      <span>§ {SLOT_LABELS[picker.slot].toUpperCase()}</span>
                      <span>
                        {currentLogs.length > 0
                          ? `${currentLogs.length} picked`
                          : `${pickerOptions.length + pantryOptions.length}`}
                      </span>
                    </div>

                    <div className="mx-picker-list">
                      {!hasAny && (
                        <div className="mx-picker-empty">
                          No favorited {SLOT_LABELS[picker.slot].toLowerCase()} recipes or pantry items yet.
                        </div>
                      )}

                      {pickerOptions.length > 0 && (
                        <>
                          <div className="mx-picker-section-head">★ Recipes</div>
                          {pickerOptions.map((r) => {
                            const log = recipeLogsById.get(r.id);
                            const isCurrent = !!log;
                            const kcal = getRecipeKcal(r);
                            const servings = log?.servings ?? 1;
                            return (
                              <button
                                key={`r-${r.id}`}
                                type="button"
                                className="mx-picker-opt"
                                aria-current={isCurrent ? "true" : undefined}
                                onClick={() => toggleRecipeInCell(r.id)}
                              >
                                <span className="mx-picker-name">{r.name}</span>
                                {isCurrent && log ? (
                                  <span className="mx-picker-step" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="mx-picker-step-btn"
                                      onClick={(e) => { e.stopPropagation(); bumpAmount(log, -1); }}
                                      aria-label="Decrease servings"
                                    >−</button>
                                    <span className="mx-picker-step-val">{servings}</span>
                                    <button
                                      type="button"
                                      className="mx-picker-step-btn"
                                      onClick={(e) => { e.stopPropagation(); bumpAmount(log, 1); }}
                                      aria-label="Increase servings"
                                    >+</button>
                                  </span>
                                ) : (
                                  <span className="mx-picker-kcal">{kcal != null ? kcal : "—"}</span>
                                )}
                              </button>
                            );
                          })}
                        </>
                      )}

                      {pantryOptions.length > 0 && (
                        <>
                          <div className="mx-picker-section-head">★ Pantry</div>
                          {pantryOptions.map((i) => {
                            const log = ingredientLogsById.get(i.id);
                            const isCurrent = !!log;
                            const qty = log?.quantity ?? 1;
                            const unit = log?.unit ?? i.defaultUnit;
                            return (
                              <button
                                key={`i-${i.id}`}
                                type="button"
                                className="mx-picker-opt"
                                aria-current={isCurrent ? "true" : undefined}
                                onClick={() => toggleIngredientInCell(i.id)}
                              >
                                <span className="mx-picker-name">{i.name}</span>
                                {isCurrent && log ? (
                                  <span className="mx-picker-step" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="mx-picker-step-btn"
                                      onClick={(e) => { e.stopPropagation(); bumpAmount(log, -1); }}
                                      aria-label="Decrease quantity"
                                    >−</button>
                                    <span className="mx-picker-step-val">{qty}{unit ? ` ${unit}` : ""}</span>
                                    <button
                                      type="button"
                                      className="mx-picker-step-btn"
                                      onClick={(e) => { e.stopPropagation(); bumpAmount(log, 1); }}
                                      aria-label="Increase quantity"
                                    >+</button>
                                  </span>
                                ) : (
                                  <span className="mx-picker-kcal">{i.defaultUnit}</span>
                                )}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mx-picker-foot"
                      onClick={openBrowse}
                    >
                      <span>Browse all {SLOT_LABELS[picker.slot].toLowerCase()} recipes</span>
                      <span>→</span>
                    </button>
                    {currentLogs.length > 0 && (
                      <button
                        type="button"
                        className="mx-picker-done"
                        onClick={closePicker}
                      >
                        Done
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </>,
          document.body
        )}

      {/* ── Browse-all sheet ─────────────────────────────────── */}
      {browse && typeof window !== "undefined" &&
        createPortal(
          <BrowseSheet
            browse={browse}
            recipes={recipes}
            filtered={browseFiltered}
            tab={browseTab}
            setTab={setBrowseTab}
            search={browseSearch}
            setSearch={setBrowseSearch}
            currentRecipeId={
              (cellMap.get(`${browse.date.toDateString()}|${browse.slot}`) ?? [])[0]?.recipeId ?? null
            }
            getKcal={getRecipeKcal}
            onClose={closeBrowse}
            onPick={async (recipeId) => {
              // Set picker context so toggleRecipeInCell can read it
              setPicker({
                slot: browse.slot,
                date: browse.date,
                rect: { top: 0, left: 0, bottom: 0, right: 0 },
              });
              await Promise.resolve();
              await toggleRecipeInCell(recipeId);
              // Keep browse sheet open so user can add multiple, but clear the bogus picker rect
              setPicker(null);
            }}
            onToggleFavorite={toggleRecipeFavorite}
          />,
          document.body
        )}
    </div>
  );
}

type BrowseFiltered = { favorites: RecipeSlim[]; rest: RecipeSlim[] };

function BrowseSheet({
  browse,
  recipes,
  filtered,
  tab,
  setTab,
  search,
  setSearch,
  currentRecipeId,
  getKcal,
  onClose,
  onPick,
  onToggleFavorite,
}: {
  browse: BrowseState;
  recipes: RecipeSlim[];
  filtered: BrowseFiltered;
  tab: BrowseTab;
  setTab: (t: BrowseTab) => void;
  search: string;
  setSearch: (s: string) => void;
  currentRecipeId: number | null;
  getKcal: (r: RecipeSlim) => number | null;
  onClose: () => void;
  onPick: (recipeId: number) => void | Promise<void>;
  onToggleFavorite: (recipeId: number, next: boolean) => void | Promise<void>;
}) {
  const slotLabel = SLOT_LABELS[browse.slot];
  const dateLabel = browse.date.toLocaleString("default", { weekday: "short" }) + " " + slotLabel.toLowerCase();
  const totalCount = filtered.favorites.length + filtered.rest.length;

  const showFavorites = tab === "favorites" || tab === "all";
  const showRest = tab === "all";

  // Defensive: if user has zero matching recipes whatsoever (even before search), fall back to All.
  const _ = recipes; // silence unused

  return (
    <>
      <div className="mx-browse-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="mx-browse-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Browse ${slotLabel} recipes`}
      >
        <div className="mx-browse-head">
          <div className="mx-browse-eyebrow">
            <span>§ ALL {slotLabel.toUpperCase()} RECIPES</span>
            <button className="mx-browse-x" onClick={onClose} aria-label="Close">
              ✕ CLOSE
            </button>
          </div>
          <div className="mx-browse-title">For {dateLabel}.</div>
          <input
            className="mx-browse-search"
            type="search"
            placeholder={`Search ${slotLabel.toLowerCase()} recipes…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="mx-browse-toolbar">
            <button
              className={`mx-browse-chip${tab === "all" ? " is-active" : ""}`}
              onClick={() => setTab("all")}
              aria-pressed={tab === "all"}
            >All</button>
            <button
              className={`mx-browse-chip${tab === "favorites" ? " is-active" : ""}`}
              onClick={() => setTab("favorites")}
              aria-pressed={tab === "favorites"}
            >★ Favorites</button>
            <span className="mx-browse-count">{totalCount} {totalCount === 1 ? "recipe" : "recipes"}</span>
          </div>
        </div>

        <div className="mx-browse-list">
          {totalCount === 0 && (
            <div className="mx-browse-empty">
              {search ? "No matches." : `No ${slotLabel.toLowerCase()} recipes yet.`}
            </div>
          )}

          {showFavorites && filtered.favorites.length > 0 && (
            <>
              <div className="mx-browse-section-head">★ Favorites · {filtered.favorites.length}</div>
              {filtered.favorites.map((r) => (
                <BrowseRow
                  key={r.id}
                  r={r}
                  isCurrent={r.id === currentRecipeId}
                  kcal={getKcal(r)}
                  onPick={onPick}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </>
          )}

          {showRest && filtered.rest.length > 0 && (
            <>
              <div className="mx-browse-section-head">All · {filtered.rest.length}</div>
              {filtered.rest.map((r) => (
                <BrowseRow
                  key={r.id}
                  r={r}
                  isCurrent={r.id === currentRecipeId}
                  kcal={getKcal(r)}
                  onPick={onPick}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function BrowseRow({
  r,
  isCurrent,
  kcal,
  onPick,
  onToggleFavorite,
}: {
  r: RecipeSlim;
  isCurrent: boolean;
  kcal: number | null;
  onPick: (recipeId: number) => void | Promise<void>;
  onToggleFavorite: (recipeId: number, next: boolean) => void | Promise<void>;
}) {
  const initials = r.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const proteinTotal = r.totals?.find((t) => t.displayName.toLowerCase().includes("protein"));
  const fiberTotal = r.totals?.find((t) => t.displayName.toLowerCase().includes("fiber"));
  const meta = [
    kcal != null ? `${kcal}` : null,
    proteinTotal ? `${Math.round(proteinTotal.value)}g P` : null,
    fiberTotal ? `${Math.round(fiberTotal.value)}g fiber` : null,
  ].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      className="mx-browse-item"
      aria-current={isCurrent ? "true" : undefined}
      onClick={() => onPick(r.id)}
    >
      <div className="mx-browse-thumb">
        {r.image ? <img src={r.image} alt="" /> : <span className="mx-browse-initials">{initials}</span>}
      </div>
      <div className="mx-browse-info">
        <div className="mx-browse-name">{r.name}</div>
        <div className="mx-browse-meta">{meta || "—"}</div>
      </div>
      <button
        type="button"
        className={`mx-browse-fav${r.isFavorited ? " on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(r.id, !r.isFavorited);
        }}
        aria-label={r.isFavorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={!!r.isFavorited}
      >
        {r.isFavorited ? "★" : "☆"}
      </button>
    </button>
  );
}
