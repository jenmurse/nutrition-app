"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
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
  externalLabel?: string | null;
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
    unknown?: boolean;
  }>;
};

type MealPlanDetails = {
  id: number;
  weekStartDate: string | Date;
  personId: number | null;
  slotOrder?: string;
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
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  isMealItem?: boolean;
  isFavorited?: boolean;
  category?: string | null;
};

function ingredientDisplayUnit(ing: { defaultUnit: string; customUnitName?: string | null }): string {
  if (ing.defaultUnit === "other" && ing.customUnitName) return ing.customUnitName;
  return ing.defaultUnit;
}

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

type DayTemplate = {
  id: number;
  name: string;
  personId: number | null;
  createdAt: string;
  person: { id: number; name: string; color: string } | null;
  items: Array<{
    id: number;
    mealType: string;
    position: number;
    recipeId: number | null;
    servings: number | null;
    ingredientId: number | null;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
  }>;
};

type DayMenuState = {
  date: Date;
  rect: { top: number; left: number; bottom: number; right: number };
};

type SaveTemplateState = {
  date: Date;
  itemCount: number;
};

type ApplyConfirmState = {
  template: DayTemplate;
  date: Date;
  existingCount: number;
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
  const { persons, selectedPersonId } = usePersonContext();

  const [plans, setPlans] = useState<MealPlanSummary[]>([]);
  const [plan, setPlan] = useState<MealPlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeSlim[]>([]);
  const [ingredients, setIngredients] = useState<IngredientSlim[]>([]);
  const [picker, setPicker] = useState<PickerState | null>(null);
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
  const [otherPersonPlans, setOtherPersonPlans] = useState<Array<{ personId: number; planId: number; name: string; color: string }>>([]);
  const [alsoForPlans, setAlsoForPlans] = useState<Set<number>>(new Set());
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  // ── Day template state ──────────────────────────────────────
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  const [dayMenu, setDayMenu] = useState<DayMenuState | null>(null);
  const [saveTplOpen, setSaveTplOpen] = useState<SaveTemplateState | null>(null);
  const [applyTpl, setApplyTpl] = useState<ApplyConfirmState | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [showNutrition, setShowNutrition] = useState<boolean>(true);
  const [showMonthStrip, setShowMonthStrip] = useState<boolean>(true);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  type StripDay = { dateKey: string; planId: number | null; count: number; slots: number };
  const [stripDays, setStripDays] = useState<StripDay[]>([]);
  // Eating-out inline input within the picker (open + draft label).
  const [eatingOutOpen, setEatingOutOpen] = useState(false);
  const [eatingOutLabel, setEatingOutLabel] = useState("");

  // ── View options (persisted per device) ──────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const n = window.localStorage.getItem("gm.planner.showNutrition");
      if (n === "false") setShowNutrition(false);
      const m = window.localStorage.getItem("gm.planner.showMonthStrip");
      if (m === "false") setShowMonthStrip(false);
    } catch {}
  }, []);
  function toggleNutrition() {
    setShowNutrition((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("gm.planner.showNutrition", next ? "true" : "false"); } catch {}
      return next;
    });
  }
  function toggleMonthStrip() {
    setShowMonthStrip((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("gm.planner.showMonthStrip", next ? "true" : "false"); } catch {}
      return next;
    });
  }

  // ── Mobile detection ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Slot order persists on MealPlan.slotOrder (server-side, syncs across devices) ──
  // One-time migration: read any legacy localStorage value and clear it on first load
  // per plan, so users coming from the localStorage era don't lose their order.
  useEffect(() => {
    if (!plan) return;
    const fromServer = typeof plan.slotOrder === "string" && plan.slotOrder.length > 0
      ? plan.slotOrder.split(",").filter((s): s is SlotType => ALL_SLOTS.includes(s as SlotType))
      : [];

    if (fromServer.length > 0) {
      setSlotOrder(fromServer);
      return;
    }

    // No server value — check legacy localStorage and upgrade silently
    if (typeof window === "undefined") {
      setSlotOrder([]);
      return;
    }
    const legacyKey = `gm-matrix-slot-order-${plan.id}`;
    try {
      const stored = window.localStorage.getItem(legacyKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      const migrated = Array.isArray(parsed)
        ? (parsed.filter((s): s is SlotType => ALL_SLOTS.includes(s as SlotType)) as SlotType[])
        : [];
      setSlotOrder(migrated);
      if (migrated.length > 0) {
        // Push to server, then clear the legacy key on success
        fetch(`/api/meal-plans/${plan.id}/slot-order`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotOrder: migrated }),
        })
          .then((r) => {
            if (r.ok) window.localStorage.removeItem(legacyKey);
          })
          .catch(() => {});
      }
    } catch {
      setSlotOrder([]);
    }
  }, [plan]);

  function persistSlotOrder(next: SlotType[]) {
    setSlotOrder(next); // optimistic
    if (!plan) return;
    fetch(`/api/meal-plans/${plan.id}/slot-order`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotOrder: next }),
    }).catch(() => {
      // network errors are silent — local state is still updated for this session
    });
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

  // ── Day templates: load list ─────────────────────────────────
  useEffect(() => {
    const cached = clientCache.get<DayTemplate[]>("/api/day-templates");
    if (cached) setTemplates(cached);
    fetch("/api/day-templates")
      .then((r) => r.json())
      .then((data: DayTemplate[]) => {
        if (Array.isArray(data)) {
          clientCache.set("/api/day-templates", data);
          setTemplates(data);
        }
      })
      .catch(() => {});
  }, []);

  async function refreshTemplates() {
    try {
      const r = await fetch("/api/day-templates");
      if (!r.ok) return;
      const data: DayTemplate[] = await r.json();
      if (Array.isArray(data)) {
        clientCache.set("/api/day-templates", data);
        setTemplates(data);
      }
    } catch {}
  }

  // ── Day overflow menu ────────────────────────────────────────
  function openDayMenu(date: Date, e: React.MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setDayMenu({
      date,
      rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right },
    });
  }
  function closeDayMenu() { setDayMenu(null); }

  useEffect(() => {
    if (!dayMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDayMenu(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dayMenu]);

  // ── Save template flow ──────────────────────────────────────
  function openSaveTemplate(date: Date) {
    if (!plan) return;
    const itemCount = plan.mealLogs.filter(
      (l) => parseUTCDate(l.date).toDateString() === date.toDateString()
    ).length;
    if (itemCount === 0) {
      toast.error("Add meals first");
      return;
    }
    closeDayMenu();
    setSaveTplOpen({ date, itemCount });
  }

  // Defensive cleanup — iOS Safari caches the page colour it samples for the
  // chrome (status bar, address bar). When a dimmed backdrop closes, the
  // chrome holds the dim until something forces a re-sample. This function
  // throws multiple cues at iOS to make it repaint the chrome regions.
  function scrubOverlays() {
    if (typeof document === "undefined") return;

    // 1. Remove orphaned backdrop / dialog elements at document.body
    document
      .querySelectorAll(".mx-newplan-backdrop, .mx-day-menu-backdrop, .mx-day-menu, .mx-newplan-dialog")
      .forEach((el) => {
        if (el.parentElement === document.body) el.remove();
      });

    // 2. Cycle the meta theme-color tag — forces iOS to re-evaluate chrome
    const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (themeMeta) {
      const orig = themeMeta.getAttribute("content") ?? "#FFFFFF";
      themeMeta.setAttribute("content", "#FFFFFE");
      requestAnimationFrame(() => themeMeta.setAttribute("content", orig));
    }

    // 3. The nuclear option — drop opaque white panels at the top and bottom
    //    of the viewport for ~80ms. iOS Safari samples those areas to colour
    //    its status bar and address bar; the white panels force a clean
    //    sample, after which the page underneath (already white) sustains it.
    const top = document.createElement("div");
    top.style.cssText =
      "position:fixed;top:0;left:0;right:0;height:calc(env(safe-area-inset-top,0px) + 60px);background:#FFFFFF;z-index:99999;pointer-events:none;";
    const bottom = document.createElement("div");
    bottom.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;height:calc(env(safe-area-inset-bottom,0px) + 80px);background:#FFFFFF;z-index:99999;pointer-events:none;";
    document.body.appendChild(top);
    document.body.appendChild(bottom);

    // Trigger a 1px scroll then back — iOS recomputes chrome on scroll change
    try {
      window.scrollBy(0, 1);
      requestAnimationFrame(() => window.scrollBy(0, -1));
    } catch {}

    window.setTimeout(() => {
      top.remove();
      bottom.remove();
    }, 100);
  }

  async function submitSaveTemplate(payload: { name: string } | { overwriteId: number; overwriteName: string }) {
    if (!saveTplOpen || !plan) return;
    const dateISO = `${saveTplOpen.date.getFullYear()}-${String(saveTplOpen.date.getMonth() + 1).padStart(2, "0")}-${String(saveTplOpen.date.getDate()).padStart(2, "0")}`;
    const planId = plan.id;
    // flushSync forces React to commit + render synchronously, so the dialog's
    // backdrop element is removed from the DOM before any async work.
    flushSync(() => { setSaveTplOpen(null); });
    // Defensive scrub — iOS Safari sometimes holds the dimmed-chrome state.
    scrubOverlays();
    try {
      if ("overwriteId" in payload) {
        const r = await fetch(`/api/day-templates/${payload.overwriteId}/snapshot`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, date: dateISO }),
        });
        if (!r.ok) throw new Error("Failed");
        toast.success(`Updated "${payload.overwriteName}"`);
        await refreshTemplates();
        return;
      }
      const r = await fetch("/api/day-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          date: dateISO,
          name: payload.name,
          personId: selectedPersonId,
        }),
      });
      if (r.status === 409) {
        toast.error("A template with that name already exists");
        return;
      }
      if (!r.ok) throw new Error("Failed");
      toast.success(`Saved "${payload.name}"`);
      await refreshTemplates();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save template");
    }
  }

  // ── Apply template flow ─────────────────────────────────────
  function startApplyTemplate(template: DayTemplate, date: Date) {
    if (!plan) return;
    const existingCount = plan.mealLogs.filter(
      (l) => parseUTCDate(l.date).toDateString() === date.toDateString()
    ).length;
    closeDayMenu();
    if (existingCount > 0) {
      setApplyTpl({ template, date, existingCount });
    } else {
      // No existing meals → just apply directly (replace mode is fine, deletes 0)
      doApplyTemplate(template, date, "replace");
    }
  }
  async function doApplyTemplate(template: DayTemplate, date: Date, mode: "replace" | "append") {
    if (!plan) return;
    // flushSync — force React to commit + render synchronously so the dialog +
    // menu backdrops are removed from DOM before any async work.
    flushSync(() => {
      setApplyTpl(null);
      setDayMenu(null);
    });
    scrubOverlays();
    const planId = plan.id;
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const r = await fetch(`/api/day-templates/${template.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, date: dateISO, mode }),
      });
      if (!r.ok) throw new Error("Failed");
      const result: {
        applied: number;
        created?: number;
        merged?: number;
        skipped: number;
        templateName: string;
      } = await r.json();
      const parts: string[] = [`Applied "${result.templateName}"`];
      if ((result.merged ?? 0) > 0) {
        parts.push(`${result.merged} merged into existing`);
      }
      if (result.skipped > 0) {
        parts.push(`${result.skipped} skipped (deleted recipe)`);
      }
      const msg = parts.length === 1 ? parts[0] : `${parts[0]} — ${parts.slice(1).join(", ")}`;
      toast.success(msg);
      await refreshPlan();
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply template");
    }
  }

  // ── Template rename / delete ────────────────────────────────
  async function renameTemplate(id: number, name: string): Promise<boolean> {
    try {
      const r = await fetch(`/api/day-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (r.status === 409) {
        toast.error("A template with that name already exists");
        return false;
      }
      if (!r.ok) throw new Error("Failed");
      await refreshTemplates();
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Failed to rename");
      return false;
    }
  }
  async function deleteTemplate(template: DayTemplate) {
    const ok = await dialog.confirm({
      title: `Delete "${template.name}"?`,
      body: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await fetch(`/api/day-templates/${template.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      toast.success("Deleted");
      await refreshTemplates();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
    }
  }

  async function reorderTemplates(nextOrder: number[]) {
    // Optimistic — reorder local state immediately, revert on failure
    const idToTpl = new Map(templates.map((t) => [t.id, t]));
    const reordered = nextOrder
      .map((id) => idToTpl.get(id))
      .filter((t): t is DayTemplate => !!t);
    const prev = templates;
    setTemplates(reordered);
    try {
      const r = await fetch("/api/day-templates/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: nextOrder }),
      });
      if (!r.ok) throw new Error("Failed");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reorder");
      setTemplates(prev);
    }
  }

  // ── Load other household members' plans for the same week ────
  useEffect(() => {
    if (!plan || persons.length < 2 || !selectedPersonId) {
      setOtherPersonPlans([]);
      return;
    }
    let cancelled = false;
    const wsd = parseUTCDate(plan.weekStartDate);
    const weekStartTime = wsd.getTime();
    Promise.all(
      persons
        .filter((p) => p.id !== selectedPersonId)
        .map(async (p) => {
          try {
            const r = await fetch(`/api/meal-plans?personId=${p.id}`);
            if (!r.ok) return null;
            const list: Array<{ id: number; weekStartDate: string }> = await r.json();
            const match = list.find(
              (pl) => parseUTCDate(pl.weekStartDate).getTime() === weekStartTime
            );
            if (match) return { personId: p.id, planId: match.id, name: p.name, color: p.color };
          } catch {}
          return null;
        })
    ).then((results) => {
      if (cancelled) return;
      setOtherPersonPlans(
        results.filter((r): r is { personId: number; planId: number; name: string; color: string } => r !== null)
      );
    });
    return () => { cancelled = true; };
  }, [plan, persons, selectedPersonId]);

  // Reset "Also for" toggles when the active plan or person changes
  useEffect(() => {
    setAlsoForPlans(new Set());
  }, [plan?.id, selectedPersonId]);

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

  // ── Plan navigation helpers ──────────────────────────────────
  function nextSundayAfter(list: MealPlanSummary[]): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - today.getDay());
    if (list.length === 0) return thisSunday;
    const latest = list.reduce<Date>((acc, p) => {
      const d = parseUTCDate(p.weekStartDate);
      return d > acc ? d : acc;
    }, parseUTCDate(list[0].weekStartDate));
    if (latest >= thisSunday) {
      const next = new Date(latest);
      next.setDate(next.getDate() + 7);
      return next;
    }
    return thisSunday;
  }

  // Strip-click handler — navigate to the plan covering this day (if any).
  function jumpToStripDay(planId: number | null) {
    if (planId == null) return;
    const idx = plans.findIndex((p) => p.id === planId);
    if (idx < 0) return;
    goToPlan(idx);
  }

  function goToPlan(idx: number) {
    if (idx < 0 || idx >= plans.length) return;
    const target = plans[idx];
    if (!target || target.id === plan?.id) return;
    // Update URL via history API directly — router.push to the same path
    // with a different searchParam was unreliable (no-op on some clicks).
    // This guarantees the address bar reflects the loaded plan for
    // share/back-button without triggering Next's full navigation.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("planId", String(target.id));
      window.history.replaceState(null, "", `/planner?${params.toString()}`);
    }
    loadPlanDetails(target.id);
  }

  function goToThisWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matches = plans.filter((p) => {
      const ws = parseUTCDate(p.weekStartDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return today >= ws && today <= we;
    });
    const pick = matches.find((p) => parseUTCDate(p.weekStartDate).getDay() === 0) ?? matches[0];
    if (!pick) {
      toast.error("No plan covers this week. Create a new one.");
      return;
    }
    const params = new URLSearchParams(searchParams?.toString());
    params.set("planId", String(pick.id));
    router.push(`/planner?${params.toString()}`);
  }

  function openNewPlanDialog() {
    setNewPlanOpen(true);
  }

  async function submitNewPlan({ weekStartDate, copyFromId }: { weekStartDate: string; copyFromId: number | null }) {
    if (selectedPersonId == null) return;
    try {
      let newPlanId: number;
      if (copyFromId) {
        // Duplicate endpoint will create a new plan and copy meals
        const r = await fetch(`/api/meal-plans/${copyFromId}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetWeekStartDate: weekStartDate, personId: selectedPersonId }),
        });
        if (!r.ok) throw new Error("Failed to copy plan");
        const result: { id?: number; planId?: number; mealPlan?: { id: number } } = await r.json();
        newPlanId = result.id ?? result.planId ?? result.mealPlan?.id ?? 0;
      } else {
        const r = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStartDate, personId: selectedPersonId }),
        });
        if (!r.ok) throw new Error("Failed to create plan");
        const result: { id: number } = await r.json();
        newPlanId = result.id;
      }
      // Bust cache, navigate
      clientCache.set(`/api/meal-plans?personId=${selectedPersonId}`, null as unknown as MealPlanSummary[]);
      const params = new URLSearchParams(searchParams?.toString());
      params.set("planId", String(newPlanId));
      router.push(`/planner?${params.toString()}`);
      toast.success(copyFromId ? "Plan copied" : "New plan created");
      setNewPlanOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create plan");
      throw err;
    }
  }

  // Track current index from the actually-loaded plan. The URL is best-
  // effort (router.push can be flaky on same-path searchParam changes in
  // App Router), but `plan.id` is always the truth of what's on screen.
  const currentPlanIdx = useMemo(() => {
    if (!plan) return -1;
    return plans.findIndex((p) => p.id === plan.id);
  }, [plans, plan]);

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

  // ── 30-day zoom-out strip ───────────────────────────────────
  // 5 weeks (35 days) centered on the current week. Start = Sunday two
  // weeks before today's week, end = Saturday two weeks after.
  const stripWindow = useMemo(() => {
    const sunday = new Date(today);
    sunday.setDate(sunday.getDate() - sunday.getDay()); // back to Sunday
    const start = new Date(sunday);
    start.setDate(start.getDate() - 14);
    const end = new Date(start);
    end.setDate(end.getDate() + 34);
    return { start, end };
  }, [today]);

  // Fetch fill data whenever the active person changes or the active
  // plan's meals change (refreshPlan bumps `plan`).
  useEffect(() => {
    if (selectedPersonId == null) { setStripDays([]); return; }
    if (!showMonthStrip) return; // skip when hidden
    let cancelled = false;
    const startISO = stripWindow.start.toISOString().slice(0, 10);
    const endISO = stripWindow.end.toISOString().slice(0, 10);
    const url = `/api/planner/strip?personId=${selectedPersonId}&start=${startISO}&end=${endISO}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data: { days: StripDay[] }) => { if (!cancelled) setStripDays(data.days ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedPersonId, plan, showMonthStrip, stripWindow.start, stripWindow.end]);

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
    // Eligible: base slots + any extra that has at least one meal logged.
    // Rows are derived from the actual MealLog data so the matrix is
    // consistent across devices.
    const eligible = new Set<SlotType>(BASE_SLOTS);
    for (const extra of ADD_SLOTS) {
      const hasAny = plan.mealLogs.some((l) => l.mealType === extra);
      if (hasAny) eligible.add(extra);
    }
    const ordered: SlotType[] = slotOrder.filter((s) => eligible.has(s));
    for (const s of ALL_SLOTS) {
      if (eligible.has(s) && !ordered.includes(s)) ordered.push(s);
    }
    return ordered;
  }, [plan, slotOrder]);

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
    fmt: (v: number) => string,
    opts?: { exact?: boolean }
  ) {
    if (!day) return { value: "—", over: false, met: false, hasGoal: false, empty: true, unknown: false };
    const match = day.nutrients.find((n) =>
      opts?.exact
        ? keys.some((k) => n.displayName.toLowerCase() === k)
        : keys.some((k) => n.displayName.toLowerCase().includes(k))
    );
    if (!match) return { value: "—", over: false, met: false, hasGoal: false, empty: true, unknown: false };
    if (match.unknown) return { value: "—", over: false, met: false, hasGoal: false, empty: false, unknown: true };
    if (match.value === 0) return { value: "—", over: false, met: false, hasGoal: false, empty: true, unknown: false };
    const over = match.highGoal != null && match.value > match.highGoal;
    const met = match.lowGoal != null && match.value >= match.lowGoal;
    return {
      value: fmt(match.value),
      over,
      met: met && !over,
      hasGoal: match.highGoal != null || match.lowGoal != null,
      empty: false,
      unknown: false,
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

  // Compact range for the mobile second toolbar — saves ~40px which we
  // need to fit VIEW + TODAY + ⋯ + + NEW alongside the arrows.
  const shortRangeLabel = useMemo(() => {
    if (!plan || days.length === 0) return "";
    const s = days[0];
    const e = days[6];
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  }, [plan, days]);

  // True when the currently-loaded plan covers today's date. Used to gate
  // visibility of the 'This Week' shortcut — there's no point showing it
  // when you're already on the current week.
  const isOnCurrentWeek = useMemo(() => {
    if (!plan) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ws = parseUTCDate(plan.weekStartDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    return today >= ws && today <= we;
  }, [plan]);

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
    setEatingOutOpen(false);
    setEatingOutLabel("");
  }

  // Recipes filtered for the active picker
  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    const slot = picker.slot;
    // Recipes currently in this cell — always show so user can toggle them off
    // even if they're not favorited (e.g., applied via a day template).
    const cellKey = `${picker.date.toDateString()}|${slot}`;
    const inCellRecipeIds = new Set(
      (cellMap.get(cellKey) ?? [])
        .map((l) => l.recipeId)
        .filter((id): id is number => id != null)
    );
    return recipes.filter((r) => {
      if (inCellRecipeIds.has(r.id)) return true;
      if (!r.isFavorited) return false;
      const tags = (r.tags ?? "").toLowerCase().split(",").map((t) => t.trim());
      return tags.includes(slot);
    });
  }, [picker, recipes, cellMap]);

  // Pantry items filtered for the picker — favorited meal-items, plus any
  // currently in the cell (so the user can always toggle them off).
  const pantryOptions = useMemo(() => {
    if (!picker) return [];
    const cellKey = `${picker.date.toDateString()}|${picker.slot}`;
    const inCellIngredientIds = new Set(
      (cellMap.get(cellKey) ?? [])
        .map((l) => l.ingredientId)
        .filter((id): id is number => id != null)
    );
    // Show ALL pantry items flagged as meal-items (not just favorited ones)
    // so users discover what they can drop into a slot without first having
    // to star it. Items already in this cell are also included so they can
    // be toggled off. Favorited items still surface first per the sort below.
    return ingredients.filter(
      (i) => inCellIngredientIds.has(i.id) || i.isMealItem
    );
  }, [picker, ingredients, cellMap]);

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
  // Add a recipe to a specific (slot, date). Used by both the picker (via
  // wrapper) and by the browse-all sheet (called directly so it doesn't
  // depend on the async picker-state update).
  async function addRecipeAt(recipeId: number, slot: SlotType, date: Date) {
    if (!plan) return;
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

    const body = { recipeId, date: dateISO, mealType: slot, servings: 1 };
    try {
      const postRes = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!postRes.ok) throw new Error("Failed");

      // Mirror to any "also add to" plans (best-effort; failures are toasted but don't fail the main add)
      if (alsoForPlans.size > 0) {
        await Promise.all(
          Array.from(alsoForPlans).map((otherPlanId) =>
            fetch(`/api/meal-plans/${otherPlanId}/meals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }).then((r) => { if (!r.ok) throw new Error(); }).catch(() => {
              toast.error("Couldn't mirror to another plan");
            })
          )
        );
      }
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add meal");
      await refreshPlan();
    }
  }

  async function pickRecipe(recipeId: number) {
    if (!picker) return;
    return addRecipeAt(recipeId, picker.slot, picker.date);
  }

  // Add an "Eating out" placeholder to a specific (slot, date). Optional
  // free-text label. No nutrition / shopping contribution; just a marker
  // so the day doesn't read as a gap.
  async function addEatingOutAt(slot: SlotType, date: Date, label: string) {
    if (!plan) return;
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const cellKey = `${date.toDateString()}|${slot}`;
    const optimisticLog: MealLog = {
      id: -Date.now(),
      date: dateISO,
      mealType: slot,
      externalLabel: label,
      position: (cellMap.get(cellKey)?.length ?? 0),
    };
    setPlan((prev) => prev ? { ...prev, mealLogs: [...prev.mealLogs, optimisticLog] } : prev);
    const body = { externalLabel: label, date: dateISO, mealType: slot };
    try {
      const r = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      // Mirror to "also add to" plans if selected
      if (alsoForPlans.size > 0) {
        await Promise.all(
          Array.from(alsoForPlans).map((otherPlanId) =>
            fetch(`/api/meal-plans/${otherPlanId}/meals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }).then((rr) => { if (!rr.ok) throw new Error(); }).catch(() => {
              toast.error("Couldn't mirror to another plan");
            })
          )
        );
      }
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add eating-out");
      await refreshPlan();
    }
  }

  // Toggle a recipe in/out of a specific cell — direct, no picker state dependency
  async function toggleRecipeAt(recipeId: number, slot: SlotType, date: Date) {
    if (!plan) return;
    const cellKey = `${date.toDateString()}|${slot}`;
    const logs = cellMap.get(cellKey) ?? [];
    const existing = logs.find((l) => l.recipeId === recipeId);
    if (existing) {
      await removeLogById(existing.id);
    } else {
      await addRecipeAt(recipeId, slot, date);
    }
  }

  // Picker-context wrapper
  async function toggleRecipeInCell(recipeId: number) {
    if (!picker) return;
    return toggleRecipeAt(recipeId, picker.slot, picker.date);
  }

  // Add a pantry ingredient to the active picker's cell
  async function pickIngredient(ingredientId: number) {
    if (!picker || !plan) return;
    const date = picker.date;
    const slot = picker.slot;
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    const sendUnit = ingredientDisplayUnit(ing);
    const cellKey = `${date.toDateString()}|${slot}`;
    const optimisticLog: MealLog = {
      id: -Date.now(),
      date: dateISO,
      mealType: slot,
      quantity: 1,
      unit: sendUnit,
      ingredientId,
      ingredient: { id: ing.id, name: ing.name, defaultUnit: ing.defaultUnit },
      position: (cellMap.get(cellKey)?.length ?? 0),
    };
    setPlan((prev) => prev ? { ...prev, mealLogs: [...prev.mealLogs, optimisticLog] } : prev);
    const body = { ingredientId, date: dateISO, mealType: slot, quantity: 1, unit: sendUnit };
    try {
      const r = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");

      if (alsoForPlans.size > 0) {
        await Promise.all(
          Array.from(alsoForPlans).map((otherPlanId) =>
            fetch(`/api/meal-plans/${otherPlanId}/meals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }).then((r) => { if (!r.ok) throw new Error(); }).catch(() => {
              toast.error("Couldn't mirror to another plan");
            })
          )
        );
      }
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

  // Set the exact servings (recipes) or quantity (ingredients) value
  async function setAmount(log: MealLog, value: number) {
    if (!plan) return;
    const isRecipe = log.recipeId != null;
    if (!Number.isFinite(value) || value <= 0) {
      await removeLogById(log.id);
      return;
    }
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        mealLogs: prev.mealLogs.map((l) =>
          l.id === log.id
            ? isRecipe
              ? { ...l, servings: value }
              : { ...l, quantity: value }
            : l
        ),
      };
    });
    try {
      const body = isRecipe ? { servings: value } : { quantity: value };
      const r = await fetch(`/api/meal-plans/${plan.id}/meals/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      await refreshPlan();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update");
      await refreshPlan();
    }
  }

  // Bump by a relative delta (+/- buttons). Smart steps for grams: ±10.
  async function bumpAmount(log: MealLog, delta: number) {
    const isRecipe = log.recipeId != null;
    const current = (isRecipe ? log.servings : log.quantity) ?? 1;
    const unit = (log.unit ?? "").toLowerCase();
    const stepSize = !isRecipe && (unit === "g" || unit === "ml") ? 10 : 1;
    await setAmount(log, current + delta * stepSize);
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
  function onSlotDragStart(slot: SlotType, e: React.DragEvent<HTMLElement>) {
    setDragKind("slot");
    setDraggingSlot(slot);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", `slot:${slot}`); } catch {}
  }
  function onSlotDragOver(slot: SlotType, e: React.DragEvent<HTMLElement>) {
    if (dragKind !== "slot" || !draggingSlot || draggingSlot === slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropBeforeSlot !== slot) setDropBeforeSlot(slot);
  }
  function onSlotDragLeave(slot: SlotType) {
    if (dropBeforeSlot === slot) setDropBeforeSlot(null);
  }
  function onSlotDrop(targetSlot: SlotType, e: React.DragEvent<HTMLElement>) {
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

  function onCellDragOver(date: Date, slot: SlotType, e: React.DragEvent<HTMLElement>) {
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

  async function onCellDrop(targetDate: Date, targetSlot: SlotType, e: React.DragEvent<HTMLElement>) {
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

  // Click a "+ Snack/Side/Dessert/Beverage" button → open picker for that
  // slot on today (or the first day of the week, or selectedDay on mobile).
  // Once the user picks something, the MealLog appears and the row shows
  // automatically on every device.
  function openAddSlotPicker(slot: SlotType, e: React.MouseEvent<HTMLElement>) {
    if (days.length === 0) return;
    const todayKey = today.toDateString();
    const target =
      (isMobile && selectedDay)
        ? selectedDay
        : (days.find((d) => d.toDateString() === todayKey) ?? days[0]);
    const r = e.currentTarget.getBoundingClientRect();
    setPicker({
      slot,
      date: target,
      rect: { top: r.top, left: r.left, bottom: r.bottom, right: r.right },
    });
  }

  async function removeSlotRow(slot: SlotType) {
    if (!plan) return;
    if (BASE_SLOTS.includes(slot as (typeof BASE_SLOTS)[number])) return;
    const mealsInRow = plan.mealLogs.filter((l) => l.mealType === slot);
    if (mealsInRow.length === 0) return;
    const ok = await dialog.confirm({
      title: `Remove all ${SLOT_LABELS[slot].toLowerCase()} meals?`,
      body: `${mealsInRow.length} ${SLOT_LABELS[slot].toLowerCase()} meal${mealsInRow.length === 1 ? "" : "s"} on this week will be deleted.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
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

  // Derived strip data: each day in the 35-day window with its fill ratio.
  // Falls back to walking the window if the API hasn't returned yet.
  const stripCells = useMemo(() => {
    type Cell = { date: Date; dateKey: string; ratio: number; planId: number | null; isToday: boolean; inCurrentWeek: boolean };
    const cells: Cell[] = [];
    // Build current week bounds (Sun-Sat).
    const sunday = new Date(today);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const weekStart = sunday;
    const weekEnd = new Date(sunday);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const byKey = new Map(stripDays.map((d) => [d.dateKey, d] as const));
    for (let i = 0; i < 35; i++) {
      const d = new Date(stripWindow.start);
      d.setDate(d.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const data = byKey.get(dateKey);
      const ratio = data && data.slots > 0 ? Math.min(1, data.count / data.slots) : 0;
      cells.push({
        date: d,
        dateKey,
        ratio,
        planId: data?.planId ?? null,
        isToday: d.toDateString() === today.toDateString(),
        inCurrentWeek: d >= weekStart && d <= weekEnd,
      });
    }
    return cells;
  }, [stripDays, stripWindow.start, today]);

  // Month-label groups for the band above the day cells: each contiguous
  // run of the same month → one label spanning N grid columns.
  const stripMonthGroups = useMemo(() => {
    if (stripCells.length === 0) return [];
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const groups: Array<{ label: string; start: number; span: number }> = [];
    let curr: { label: string; start: number; span: number } | null = null;
    stripCells.forEach((c, i) => {
      const m = c.date.getMonth();
      if (!curr || curr.label !== MONTH_NAMES[m]) {
        curr = { label: MONTH_NAMES[m], start: i + 1, span: 1 };
        groups.push(curr);
      } else {
        curr.span += 1;
      }
    });
    return groups;
  }, [stripCells]);

  // Render helper for the strip — same markup on desktop + mobile, sized by CSS.
  function renderStrip(variant: "desktop" | "mobile") {
    if (!showMonthStrip) return null;
    if (stripCells.length === 0) return null;
    const className = variant === "desktop" ? "pl-strip pl-strip-desktop" : "pl-strip pl-strip-mobile";
    return (
      <div className={className}>
        <div className="pl-strip-scroll">
          <div
            className="pl-strip-grid"
            style={{ gridTemplateColumns: `repeat(${stripCells.length}, auto)` }}
          >
            {stripMonthGroups.map((g, idx) => (
              <div
                key={`m-${idx}`}
                className="pl-strip-month"
                style={{ gridColumn: `${g.start} / ${g.start + g.span}` }}
              >{g.label}</div>
            ))}
            {stripCells.map((c, i) => {
              const classes = ["pl-strip-day"];
              if (c.isToday) classes.push("is-today");
              if (c.inCurrentWeek) classes.push("in-week");
              if (c.ratio === 0) classes.push("is-empty");
              if (c.planId == null) classes.push("is-unplanned");
              return (
                <button
                  type="button"
                  key={c.dateKey}
                  className={classes.join(" ")}
                  style={{ gridColumn: i + 1 }}
                  onClick={() => jumpToStripDay(c.planId)}
                  disabled={c.planId == null}
                  aria-label={`${c.date.toDateString()}${c.planId ? "" : " (no plan)"}`}
                >
                  <span className="pl-strip-fill">
                    <span className="pl-strip-fill-bar" style={{ height: `${Math.round(c.ratio * 100)}%` }} />
                  </span>
                  <span className="pl-strip-num">{c.date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="pl-toolbar">
        <span className="pl-range">{rangeLabel || "Planner"}</span>

        {plans.length > 1 && plan && (
          <>
            <button
              className="ed-btn-text"
              disabled={currentPlanIdx < 0 || currentPlanIdx >= plans.length - 1}
              onClick={() => goToPlan(currentPlanIdx + 1)}
              aria-label="Previous week"
            >‹ PREV</button>
            <button
              className="ed-btn-text"
              disabled={currentPlanIdx <= 0}
              onClick={() => goToPlan(currentPlanIdx - 1)}
              aria-label="Next week"
            >NEXT ›</button>
            {!isOnCurrentWeek && (
              <button
                className="ed-btn-text"
                onClick={goToThisWeek}
                aria-label="Go to this week"
              >This Week</button>
            )}
          </>
        )}

        <div className="flex-1" />

        {plan && (
          <div className="pl-view-anchor">
            <button
              type="button"
              className={`ed-btn-text${viewMenuOpen ? " is-active" : ""}`}
              onClick={(e) => { e.stopPropagation(); setViewMenuOpen((v) => !v); }}
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
              aria-label="View options"
            >VIEW <span style={{ fontSize: 8 }}>▾</span></button>
            {viewMenuOpen && (
              <>
                <div
                  className="pl-view-backdrop"
                  onClick={() => setViewMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="pl-view-menu" role="menu">
                  <div className="pl-view-menu-head">View options</div>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={showNutrition}
                    className={`pl-view-item${showNutrition ? " is-on" : ""}`}
                    onClick={toggleNutrition}
                  >
                    <span>Nutrition totals</span>
                    <span className="pl-view-toggle" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={showMonthStrip}
                    className={`pl-view-item${showMonthStrip ? " is-on" : ""}`}
                    onClick={toggleMonthStrip}
                  >
                    <span>Month strip</span>
                    <span className="pl-view-toggle" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {plan && (
          <Link
            href={`/shopping?week=${plan.weekStartDate}`}
            className="pl-cart-btn"
            aria-label="View shopping list"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </Link>
        )}

        <button
          className="ed-btn-primary"
          onClick={openNewPlanDialog}
          aria-label="Create new plan"
        >+ NEW PLAN</button>
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
                onCta={openNewPlanDialog}
              />
            </div>
          )}

          {plan && isMobile && selectedDay && (
            <>
              {/* Mobile second toolbar — abbreviated range + arrows + TODAY + VIEW + ⋯ + NEW */}
              <div className="mx-mob-tb">
                <span className="mx-mob-week">{shortRangeLabel}</span>
                <div className="flex-1" />
                <div className="mx-mob-arrows">
                  <button
                    className="mx-mob-arrow"
                    disabled={currentPlanIdx < 0 || currentPlanIdx >= plans.length - 1}
                    onClick={() => goToPlan(currentPlanIdx + 1)}
                    aria-label="Previous week"
                  >‹</button>
                  <button
                    className="mx-mob-arrow"
                    disabled={currentPlanIdx <= 0}
                    onClick={() => goToPlan(currentPlanIdx - 1)}
                    aria-label="Next week"
                  >›</button>
                </div>
                {!isOnCurrentWeek && (
                  <button
                    type="button"
                    className="mx-mob-tbbtn"
                    onClick={goToThisWeek}
                    aria-label="Go to this week"
                  >Today</button>
                )}
                <button
                  type="button"
                  className={`mx-mob-tbbtn${viewMenuOpen ? " is-active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setViewMenuOpen((v) => !v); }}
                  aria-label="View options"
                  aria-haspopup="menu"
                  aria-expanded={viewMenuOpen}
                >View</button>
                <button
                  type="button"
                  className="mx-mob-overflow"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedDay) openDayMenu(selectedDay, e);
                  }}
                  aria-label={selectedDay ? `Day options for ${DAY_NAMES[selectedDay.getDay()]} ${selectedDay.getDate()}` : "Day options"}
                  aria-haspopup="menu"
                  aria-expanded={!!dayMenu}
                  disabled={!selectedDay}
                >⋯</button>
                <button
                  className="ed-btn-primary mx-mob-new"
                  onClick={openNewPlanDialog}
                  aria-label="Create new plan"
                >+ NEW</button>
              </div>
              {viewMenuOpen && (
                <>
                  <div
                    className="pl-view-backdrop"
                    onClick={() => setViewMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="pl-view-menu pl-view-menu-mobile" role="menu">
                    <div className="pl-view-menu-head">View options</div>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showNutrition}
                      className={`pl-view-item${showNutrition ? " is-on" : ""}`}
                      onClick={toggleNutrition}
                    >
                      <span>Nutrition totals</span>
                      <span className="pl-view-toggle" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={showMonthStrip}
                      className={`pl-view-item${showMonthStrip ? " is-on" : ""}`}
                      onClick={toggleMonthStrip}
                    >
                      <span>Month strip</span>
                      <span className="pl-view-toggle" aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}

              {renderStrip("mobile")}

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
                      logs.map((log, idx) => {
                        const isEatingOut = log.recipeId == null && log.ingredientId == null && log.externalLabel != null;
                        return (
                        <div key={log.id} style={idx > 0 ? { marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--rule)" } : undefined}>
                          <div className={`mx-mob-slot-name${isEatingOut ? " is-eatout" : ""}`}>
                            {isEatingOut
                              ? (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out")
                              : (log.recipe?.name ?? log.ingredient?.name ?? "Unnamed")}
                          </div>
                          {!isEatingOut && (
                            <div className="mx-mob-slot-meta">
                              {log.servings && log.servings !== 1
                                ? `${log.servings}× serving`
                                : log.recipe
                                ? "1 serving"
                                : log.quantity
                                ? `${log.quantity} ${log.unit ?? ""}`
                                : ""}
                            </div>
                          )}
                        </div>
                        );
                      })
                    ) : (
                      <div className="mx-mob-slot-name">+ add</div>
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
                      onClick={(e) => openAddSlotPicker(s, e)}
                      aria-label={`Add ${SLOT_LABELS[s]}`}
                    >+ {SLOT_LABELS[s]}</button>
                  ))}
                </div>
              )}

              {/* Day totals */}
              {showNutrition && (() => {
                const day = totalsForDay(selectedDay);
                const cal = nutrientCell(day, ["calorie", "energy"], (v) => `${Math.round(v)}`);
                const fat = nutrientCell(day, ["total fat", "fat"], (v) => `${Math.round(v)}g`);
                const sat = nutrientCell(day, ["saturated"], (v) => `${Math.round(v)}g`);
                const na = nutrientCell(day, ["sodium"], (v) => `${Math.round(v)}mg`);
                const carb = nutrientCell(day, ["carbohydrate", "carb"], (v) => `${Math.round(v)}g`);
                const sugar = nutrientCell(day, ["sugar"], (v) => `${Math.round(v)}g`, { exact: true });
                const addedSugar = nutrientCell(day, ["added sugar"], (v) => `${Math.round(v)}g`, { exact: true });
                const prot = nutrientCell(day, ["protein"], (v) => `${Math.round(v)}g`);
                const fiber = nutrientCell(day, ["fiber"], (v) => `${Math.round(v)}g`);
                const cells = [
                  { k: "Cal", c: cal },
                  { k: "Fat", c: fat },
                  { k: "Sat F", c: sat },
                  { k: "Na", c: na },
                  { k: "Carb", c: carb },
                  { k: "Sugar", c: sugar },
                  { k: "Add S", c: addedSugar },
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
                          <div className={`v${r.c.over ? " over" : r.c.met ? " met" : ""}${r.c.empty ? " empty" : ""}${r.c.unknown ? " unknown" : ""}`}>
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

          {plan && !isMobile && renderStrip("desktop")}

          {plan && !isMobile && (
            <div className="mx" key={plan.id}>
              <div className="mx-corner" />
              {days.map((d) => {
                const isToday = d.toDateString() === today.toDateString();
                const menuOpen = dayMenu?.date.toDateString() === d.toDateString();
                return (
                  <div className={`mx-day-head${isToday ? " is-today-col" : ""}`} key={d.toISOString()}>
                    <div className={`mx-day-name${isToday ? " is-today" : ""}`}>{DAY_NAMES[d.getDay()]}</div>
                    <div className={`mx-day-num${isToday ? " today" : ""}`}>{d.getDate()}</div>
                    <button
                      type="button"
                      className={`mx-day-overflow${menuOpen ? " is-open" : ""}`}
                      onClick={(e) => { e.stopPropagation(); openDayMenu(d, e); }}
                      aria-label={`Day options for ${DAY_NAMES[d.getDay()]} ${d.getDate()}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >⋯</button>
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
                    const isTodayCol = d.toDateString() === today.toDateString();
                    return (
                      <div
                        className={`mx-cell is-clickable${isOpen ? " is-target" : ""}${isDropTarget && dragKind === "slot" ? " is-drop-before" : ""}${isCellTarget ? " is-cell-target" : ""}${isCellDragging ? " is-cell-dragging" : ""}${isTodayCol ? " is-today-col" : ""}`}
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
                          logs.map((log) => {
                            const isEatingOut = log.recipeId == null && log.ingredientId == null && log.externalLabel != null;
                            return (
                            <div className="mx-cell-item" key={log.id}>
                              <div className={`mx-cell-name${isEatingOut ? " is-eatout" : ""}`}>
                                {isEatingOut
                                  ? (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out")
                                  : (log.recipe?.name ?? log.ingredient?.name ?? "Unnamed")}
                              </div>
                              {!isEatingOut && (
                                <div className="mx-cell-meta">
                                  {log.servings && log.servings !== 1
                                    ? `${log.servings}× serving`
                                    : log.recipe
                                    ? "1 serving"
                                    : log.quantity
                                    ? `${log.quantity} ${log.unit ?? ""}`
                                    : ""}
                                </div>
                              )}
                            </div>
                            );
                          })
                        ) : (
                          <div className="mx-cell-add">+ add</div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
                );
              })}

              {ADD_SLOTS.some((s) => !slotRows.includes(s)) && (
                <div className="mx-addslot">
                  <span className="mx-addslot-label">Need more?</span>
                  {ADD_SLOTS.filter((s) => !slotRows.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="mx-addslot-btn"
                      onClick={(e) => openAddSlotPicker(s, e)}
                      aria-label={`Add ${SLOT_LABELS[s]}`}
                    >
                      + {SLOT_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}

              {showNutrition && <div className="mx-totals-label">Daily totals</div>}
              {showNutrition && days.map((d) => {
                const day = totalsForDay(d);
                const cal = nutrientCell(day, ["calorie", "energy"], (v) => `${Math.round(v)}`);
                const fat = nutrientCell(day, ["total fat", "fat"], (v) => `${Math.round(v)}g`);
                const sat = nutrientCell(day, ["saturated"], (v) => `${Math.round(v)}g`);
                const na = nutrientCell(day, ["sodium"], (v) => `${Math.round(v)}mg`);
                const carb = nutrientCell(day, ["carbohydrate", "carb"], (v) => `${Math.round(v)}g`);
                const sugar = nutrientCell(day, ["sugar"], (v) => `${Math.round(v)}g`, { exact: true });
                const addedSugar = nutrientCell(day, ["added sugar"], (v) => `${Math.round(v)}g`, { exact: true });
                const prot = nutrientCell(day, ["protein"], (v) => `${Math.round(v)}g`);
                const fiber = nutrientCell(day, ["fiber"], (v) => `${Math.round(v)}g`);
                const rows = [
                  { k: "Calories", c: cal },
                  { k: "Fat", c: fat },
                  { k: "Sat Fat", c: sat },
                  { k: "Sodium", c: na },
                  { k: "Carbs", c: carb },
                  { k: "Sugar", c: sugar },
                  { k: "Added Sug", c: addedSugar },
                  { k: "Protein", c: prot },
                  { k: "Fiber", c: fiber },
                ];
                const isTodayCol = d.toDateString() === today.toDateString();
                return (
                  <div className={`mx-totals${isTodayCol ? " is-today-col" : ""}`} key={`tot-${d.toISOString()}`}>
                    {rows.map((r) => (
                      <div className="mx-tot-row" key={r.k}>
                        <span className="mx-tot-key">{r.k}</span>
                        <span
                          className={`mx-tot-val${r.c.over ? " over" : r.c.met ? " met" : ""}${r.c.empty ? " empty" : ""}${r.c.unknown ? " unknown" : ""}`}
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
                            const servings = log?.servings ?? 1;
                            return (
                              <div
                                key={`r-${r.id}`}
                                role="button"
                                tabIndex={0}
                                className="mx-picker-opt"
                                aria-current={isCurrent ? "true" : undefined}
                                onClick={() => toggleRecipeInCell(r.id)}
                                onKeyDown={(e) => {
                                  if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                                    e.preventDefault();
                                    toggleRecipeInCell(r.id);
                                  }
                                }}
                              >
                                <span className="mx-picker-name">{r.name}</span>
                                {isCurrent && log && (
                                  <PickerStepper
                                    value={servings}
                                    onCommit={(next) => setAmount(log, next)}
                                    onBump={(delta) => bumpAmount(log, delta)}
                                  />
                                )}
                              </div>
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
                            const displayUnit = ingredientDisplayUnit(i);
                            return (
                              <div
                                key={`i-${i.id}`}
                                role="button"
                                tabIndex={0}
                                className="mx-picker-opt"
                                aria-current={isCurrent ? "true" : undefined}
                                onClick={() => toggleIngredientInCell(i.id)}
                                onKeyDown={(e) => {
                                  if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                                    e.preventDefault();
                                    toggleIngredientInCell(i.id);
                                  }
                                }}
                              >
                                <span className="mx-picker-name">{i.name}</span>
                                {isCurrent && log ? (
                                  <PickerStepper
                                    value={qty}
                                    unit={log.unit || displayUnit}
                                    onCommit={(next) => setAmount(log, next)}
                                    onBump={(delta) => bumpAmount(log, delta)}
                                  />
                                ) : (
                                  <span className="mx-picker-kcal">{displayUnit}</span>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>

                    {otherPersonPlans.length > 0 && (
                      <AlsoAddToRow
                        people={otherPersonPlans}
                        selected={alsoForPlans}
                        onToggle={(planId) => {
                          setAlsoForPlans((prev) => {
                            const next = new Set(prev);
                            if (next.has(planId)) next.delete(planId);
                            else next.add(planId);
                            return next;
                          });
                        }}
                      />
                    )}

                    {/* Eating-out section — same "§ HEAD + row" pattern as Recipes/Pantry */}
                    <div className="mx-picker-section-head">§ Other</div>
                    {!eatingOutOpen ? (
                      <div
                        role="button"
                        tabIndex={0}
                        className="mx-picker-opt is-eatout-row"
                        onClick={() => { setEatingOutOpen(true); setEatingOutLabel(""); }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                            e.preventDefault();
                            setEatingOutOpen(true);
                            setEatingOutLabel("");
                          }
                        }}
                      >
                        <span className="mx-picker-name">Eating out</span>
                        <span className="mx-picker-kcal">no nutrition</span>
                      </div>
                    ) : (
                      <div className="mx-picker-eatout-form">
                        <input
                          autoFocus
                          type="text"
                          value={eatingOutLabel}
                          maxLength={60}
                          placeholder="Label (optional) — e.g. lunch w/ team"
                          onChange={(e) => setEatingOutLabel(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const label = eatingOutLabel.trim();
                              setEatingOutOpen(false);
                              setEatingOutLabel("");
                              await addEatingOutAt(picker.slot, picker.date, label);
                            } else if (e.key === "Escape") {
                              setEatingOutOpen(false);
                              setEatingOutLabel("");
                            }
                          }}
                          aria-label="Eating-out label"
                        />
                        <button
                          type="button"
                          className="mx-picker-eatout-add"
                          onClick={async () => {
                            const label = eatingOutLabel.trim();
                            setEatingOutOpen(false);
                            setEatingOutLabel("");
                            await addEatingOutAt(picker.slot, picker.date, label);
                          }}
                        >Add</button>
                      </div>
                    )}

                    <button
                      type="button"
                      className="mx-picker-browse-foot"
                      onClick={openBrowse}
                    >
                      Browse all {SLOT_LABELS[picker.slot].toLowerCase()} recipes →
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
              await toggleRecipeAt(recipeId, browse.slot, browse.date);
            }}
            onToggleFavorite={toggleRecipeFavorite}
          />,
          document.body
        )}

      {/* ── New plan dialog ──────────────────────────────────── */}
      {newPlanOpen && typeof window !== "undefined" &&
        createPortal(
          <NewPlanDialog
            plans={plans}
            defaultDate={nextSundayAfter(plans)}
            onClose={() => setNewPlanOpen(false)}
            onSubmit={submitNewPlan}
          />,
          document.body
        )}

      {/* ── Day overflow menu ─────────────────────────────────── */}
      {dayMenu && typeof window !== "undefined" &&
        createPortal(
          <DayOverflowMenu
            menu={dayMenu}
            templates={templates}
            mealLogsOnDay={plan ? plan.mealLogs.filter((l) => parseUTCDate(l.date).toDateString() === dayMenu.date.toDateString()) : []}
            onClose={closeDayMenu}
            onSave={() => openSaveTemplate(dayMenu.date)}
            onApply={(t) => startApplyTemplate(t, dayMenu.date)}
            onOpenManage={() => { closeDayMenu(); setManageOpen(true); }}
          />,
          document.body
        )}

      {/* ── Save template dialog ──────────────────────────────── */}
      {saveTplOpen && typeof window !== "undefined" &&
        createPortal(
          <SaveTemplateDialog
            state={saveTplOpen}
            mealLogsOnDay={plan ? plan.mealLogs.filter((l) => parseUTCDate(l.date).toDateString() === saveTplOpen.date.toDateString()) : []}
            existingTemplates={templates}
            onClose={() => setSaveTplOpen(null)}
            onSubmit={submitSaveTemplate}
          />,
          document.body
        )}

      {/* ── Apply confirm dialog ──────────────────────────────── */}
      {applyTpl && typeof window !== "undefined" &&
        createPortal(
          <ApplyTemplateConfirm
            state={applyTpl}
            onClose={() => setApplyTpl(null)}
            onApply={(mode) => doApplyTemplate(applyTpl.template, applyTpl.date, mode)}
          />,
          document.body
        )}

      {/* ── Manage templates sheet ────────────────────────────── */}
      {manageOpen && typeof window !== "undefined" &&
        createPortal(
          <ManageTemplatesSheet
            templates={templates}
            onClose={() => setManageOpen(false)}
            onRename={renameTemplate}
            onDelete={deleteTemplate}
            onReorder={reorderTemplates}
          />,
          document.body
        )}
    </div>
  );
}

function PickerStepper({
  value,
  unit,
  onCommit,
  onBump,
}: {
  value: number;
  unit?: string | null;
  onCommit: (next: number) => void | Promise<void>;
  onBump: (delta: number) => void | Promise<void>;
}) {
  const [local, setLocal] = useState(String(value));
  const lastValue = useRef(value);
  useEffect(() => {
    if (value !== lastValue.current) {
      setLocal(String(value));
      lastValue.current = value;
    }
  }, [value]);
  const commit = () => {
    const n = parseFloat(local);
    if (!Number.isFinite(n)) {
      setLocal(String(value));
      return;
    }
    if (n === value) return;
    onCommit(n);
  };
  return (
    <span
      className="mx-picker-step"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="mx-picker-step-btn"
        onClick={(e) => { e.stopPropagation(); onBump(-1); }}
        aria-label="Decrease"
      >−</button>
      <input
        type="number"
        className="mx-picker-step-input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        min={0}
        step="any"
        inputMode="decimal"
      />
      {unit && <span className="mx-picker-step-unit">{unit}</span>}
      <button
        type="button"
        className="mx-picker-step-btn"
        onClick={(e) => { e.stopPropagation(); onBump(1); }}
        aria-label="Increase"
      >+</button>
    </span>
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
  const dateLabel = browse.date.toLocaleString("default", { weekday: "long" }) + " " + slotLabel.toLowerCase();
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

function NewPlanDialog({
  plans,
  defaultDate,
  onClose,
  onSubmit,
}: {
  plans: MealPlanSummary[];
  defaultDate: Date;
  onClose: () => void;
  onSubmit: (args: { weekStartDate: string; copyFromId: number | null }) => Promise<void>;
}) {
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [weekStartDate, setWeekStartDate] = useState(toIso(defaultDate));
  const [copyFromId, setCopyFromId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  // Sort plans newest first for the dropdown
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const da = parseUTCDate(a.weekStartDate).getTime();
      const db = parseUTCDate(b.weekStartDate).getTime();
      return db - da;
    });
  }, [plans]);

  function formatWeek(date: string | Date) {
    const s = parseUTCDate(date);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    const sm = s.toLocaleString("default", { month: "short" });
    const em = e.toLocaleString("default", { month: "short" });
    if (sm === em) return `${sm} ${s.getDate()}–${e.getDate()}`;
    return `${sm} ${s.getDate()} – ${em} ${e.getDate()}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        weekStartDate,
        copyFromId: copyFromId ? Number(copyFromId) : null,
      });
    } catch {
      setSubmitting(false);
    }
  };

  const hasPlans = sortedPlans.length > 0;

  return (
    <>
      <div className="mx-newplan-backdrop" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div className="mx-newplan-dialog" role="dialog" aria-modal="true" aria-label="New plan">
        <form onSubmit={handleSubmit}>
          <div className="mx-newplan-eyebrow">§ NEW PLAN</div>
          <h2 className="mx-newplan-title">A new week.</h2>

          <label className="mx-newplan-label" htmlFor="np-date">Week starts (Sunday)</label>
          <input
            id="np-date"
            type="date"
            className="mx-newplan-input"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            required
            autoFocus
          />

          {hasPlans && (
            <>
              <label className="mx-newplan-label" htmlFor="np-copy">Copy from a previous plan</label>
              <select
                id="np-copy"
                className="mx-newplan-select"
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
              >
                <option value="">None — start empty</option>
                {sortedPlans.map((p) => (
                  <option key={p.id} value={p.id}>{formatWeek(p.weekStartDate)}</option>
                ))}
              </select>
            </>
          )}

          <div className="mx-newplan-actions">
            <button
              type="button"
              className="ed-btn-text"
              onClick={onClose}
              disabled={submitting}
            >Cancel</button>
            <button
              type="submit"
              className="ed-btn-primary"
              disabled={submitting || !weekStartDate}
            >
              {submitting ? "Creating…" : copyFromId ? "Create + Copy" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function AlsoAddToRow({
  people,
  selected,
  onToggle,
}: {
  people: Array<{ personId: number; planId: number; name: string; color: string }>;
  selected: Set<number>;
  onToggle: (planId: number) => void;
}) {
  // Switch to pulldown when chips would crowd the picker (~3+ others)
  const useCompact = people.length > 3;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (useCompact) {
    const selectedCount = people.filter((p) => selected.has(p.planId)).length;
    return (
      <div className="mx-picker-also">
        <span className="mx-picker-also-label">Also add to</span>
        <div className="mx-picker-also-pulldown" ref={ref}>
          <button
            type="button"
            className={`mx-picker-also-trigger${selectedCount > 0 ? " on" : ""}`}
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {selectedCount === 0
              ? `${people.length} people`
              : `${selectedCount} of ${people.length}`}
            <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div className="mx-picker-also-menu" role="listbox" aria-label="Mirror picks to other plans">
              {people.map((p) => {
                const on = selected.has(p.planId);
                return (
                  <button
                    key={p.planId}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`mx-picker-also-mitem${on ? " on" : ""}`}
                    onClick={() => onToggle(p.planId)}
                  >
                    <span className="mx-picker-also-dot" style={{ background: p.color || "var(--accent)" }} aria-hidden="true" />
                    <span className="mx-picker-also-mname">{p.name}</span>
                    {on && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: chips
  return (
    <div className="mx-picker-also">
      <span className="mx-picker-also-label">Also add to</span>
      <div className="mx-picker-also-chips">
        {people.map((p) => {
          const on = selected.has(p.planId);
          return (
            <button
              key={p.planId}
              type="button"
              className={`mx-picker-also-chip${on ? " on" : ""}`}
              onClick={() => onToggle(p.planId)}
              aria-pressed={on}
            >
              <span className="mx-picker-also-dot" style={{ background: p.color || "var(--accent)" }} aria-hidden="true" />
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// DayOverflowMenu — the ⋯ menu on day-column headers (+ mobile toolbar)
// ──────────────────────────────────────────────────────────────
function DayOverflowMenu({
  menu,
  templates,
  mealLogsOnDay,
  onClose,
  onSave,
  onApply,
  onOpenManage,
}: {
  menu: DayMenuState;
  templates: DayTemplate[];
  mealLogsOnDay: MealLog[];
  onClose: () => void;
  onSave: () => void;
  onApply: (t: DayTemplate) => void;
  onOpenManage: () => void;
}) {
  const [search, setSearch] = useState("");
  const SHOW_SEARCH = templates.length > 6;
  const itemCount = mealLogsOnDay.length;
  const canSave = itemCount > 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, search]);

  // Position: anchored to ⋯ button bottom; flip up if it would clip
  const position = useMemo(() => {
    if (typeof window === "undefined") return { top: 0, left: 0 };
    const MENU_WIDTH = 280;
    const MENU_MAX_H = Math.min(window.innerHeight * 0.7, 460);
    const margin = 8;

    let top = menu.rect.bottom + 4;
    let left = menu.rect.right - MENU_WIDTH;

    if (top + MENU_MAX_H > window.innerHeight - margin) {
      top = Math.max(margin, menu.rect.top - MENU_MAX_H - 4);
    }
    if (left < margin) left = margin;
    if (left + MENU_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - MENU_WIDTH - margin);
    }
    return { top, left };
  }, [menu.rect]);

  return (
    <>
      <div className="mx-day-menu-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="mx-day-menu"
        style={{ top: position.top, left: position.left }}
        role="menu"
        aria-label="Day options"
      >
        <div className="mx-day-menu-scroll">
          <div className="mx-day-menu-section">
            <div className="mx-day-menu-head">Save</div>
            <button
              type="button"
              className="mx-day-menu-item"
              onClick={onSave}
              disabled={!canSave}
              title={canSave ? "Save this day's meals as a reusable template" : "Add meals first"}
            >
              <span>Save this day as template…</span>
            </button>
          </div>

          <div className="mx-day-menu-section">
            <div className="mx-day-menu-head">Apply template</div>
            {SHOW_SEARCH && (
              <div className="mx-day-menu-search">
                <input
                  type="search"
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {templates.length === 0 ? (
              <div className="mx-day-menu-empty">No templates yet. Save one to start.</div>
            ) : filtered.length === 0 ? (
              <div className="mx-day-menu-empty">No matches.</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="mx-day-menu-item is-template"
                  onClick={() => onApply(t)}
                >
                  <span>{t.name}</span>
                  <span className="mx-day-menu-item-meta">{t.items.length}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          className="mx-day-menu-foot"
          onClick={onOpenManage}
        >
          Manage templates →
        </button>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// SaveTemplateDialog
// ──────────────────────────────────────────────────────────────
function SaveTemplateDialog({
  state,
  mealLogsOnDay,
  existingTemplates,
  onClose,
  onSubmit,
}: {
  state: SaveTemplateState;
  mealLogsOnDay: MealLog[];
  existingTemplates: DayTemplate[];
  onClose: () => void;
  onSubmit: (payload: { name: string } | { overwriteId: number; overwriteName: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [overwriteId, setOverwriteId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const isOverwriting = overwriteId !== "";
  const overwriteTemplate = isOverwriting
    ? existingTemplates.find((t) => t.id === overwriteId)
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const dayName = state.date.toLocaleString("default", { weekday: "long" });

  // Summary by slot type
  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of mealLogsOnDay) {
      counts.set(log.mealType, (counts.get(log.mealType) ?? 0) + 1);
    }
    const parts: string[] = [];
    for (const [type, count] of counts.entries()) {
      parts.push(`${count} ${type}${count === 1 ? "" : "s"}`);
    }
    return parts.join(", ");
  }, [mealLogsOnDay]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isOverwriting && overwriteTemplate) {
        await onSubmit({ overwriteId: overwriteTemplate.id, overwriteName: overwriteTemplate.name });
      } else if (name.trim()) {
        await onSubmit({ name: name.trim() });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = isOverwriting ? !!overwriteTemplate : !!name.trim();

  return (
    <>
      <div className="mx-newplan-backdrop" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div className="mx-newplan-dialog" role="dialog" aria-modal="true" aria-label="Save template">
        <form onSubmit={handleSubmit}>
          <div className="mx-newplan-eyebrow">§ SAVE TEMPLATE</div>
          <h2 className="mx-newplan-title">
            {isOverwriting
              ? `Replace "${overwriteTemplate?.name ?? ""}".`
              : `Save ${dayName} as a template.`}
          </h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 20, fontSize: 13 }}>
            {isOverwriting
              ? `The existing items in this template will be replaced with ${dayName}'s meals.`
              : "Reusable on any future day. The current recipes, ingredients, servings, and quantities are captured."}
          </p>

          {!isOverwriting && (
            <>
              <label className="mx-newplan-label" htmlFor="tpl-name">Template name</label>
              <input
                id="tpl-name"
                type="text"
                className="mx-newplan-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Workout day, Travel day…"
                autoFocus
                maxLength={80}
              />
            </>
          )}

          {existingTemplates.length > 0 && (
            <div style={{ marginTop: isOverwriting ? 0 : 16 }}>
              <label className="mx-newplan-label" htmlFor="tpl-overwrite">
                {isOverwriting ? "Updating template" : "…or update an existing template"}
              </label>
              <select
                id="tpl-overwrite"
                className="mx-newplan-input"
                value={overwriteId}
                onChange={(e) => setOverwriteId(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={submitting}
              >
                <option value="">— New template —</option>
                {existingTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.person ? ` · ${t.person.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ borderLeft: "2px solid var(--rule)", padding: "6px 0 6px 14px", marginTop: 16, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            Capturing <strong style={{ color: "var(--fg)" }}>{state.itemCount} item{state.itemCount === 1 ? "" : "s"}</strong>{breakdown && `: ${breakdown}`}.
          </div>

          <div className="mx-newplan-actions">
            <button type="button" className="ed-btn-text" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="ed-btn-primary" disabled={submitting || !canSubmit}>
              {submitting ? "Saving…" : isOverwriting ? "Replace contents" : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// ApplyTemplateConfirm — three options: Cancel / Append / Replace
// ──────────────────────────────────────────────────────────────
function ApplyTemplateConfirm({
  state,
  onClose,
  onApply,
}: {
  state: ApplyConfirmState;
  onClose: () => void;
  onApply: (mode: "replace" | "append") => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dayName = state.date.toLocaleString("default", { weekday: "long" });

  return (
    <>
      <div className="mx-newplan-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="mx-newplan-dialog" style={{ width: 440 }} role="dialog" aria-modal="true" aria-label="Apply template">
        <div className="mx-newplan-eyebrow">§ APPLY TEMPLATE</div>
        <h2 className="mx-newplan-title">Replace {dayName}'s meals?</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 20, fontSize: 13 }}>
          {dayName} already has <strong style={{ color: "var(--fg)" }}>{state.existingCount} meal{state.existingCount === 1 ? "" : "s"}</strong>.
          Applying "{state.template.name}" ({state.template.items.length} items) will replace them. Or append to keep both.
        </p>

        <div className="mx-newplan-actions">
          <button type="button" className="ed-btn-text" onClick={onClose}>Cancel</button>
          <button type="button" className="ed-btn-text" style={{ color: "var(--fg)" }} onClick={() => onApply("append")}>Append instead</button>
          <button type="button" className="ed-btn-primary" onClick={() => onApply("replace")}>Replace</button>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// ManageTemplatesSheet — right-side sheet
// ──────────────────────────────────────────────────────────────
function ManageTemplatesSheet({
  templates,
  onClose,
  onRename,
  onDelete,
  onReorder,
}: {
  templates: DayTemplate[];
  onClose: () => void;
  onRename: (id: number, name: string) => Promise<boolean>;
  onDelete: (template: DayTemplate) => Promise<void>;
  onReorder: (nextOrder: number[]) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<{ id: number; value: string } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, search]);

  async function commitRename() {
    if (!renaming) return;
    const value = renaming.value.trim();
    if (!value) { setRenaming(null); return; }
    const ok = await onRename(renaming.id, value);
    if (ok) setRenaming(null);
  }

  // Reordering is disabled while a search filter is active — moving within the
  // filtered view would be ambiguous against the underlying full order.
  const isFiltered = search.trim().length > 0;
  const canReorder = !isFiltered && templates.length > 1;

  function onRowDragStart(id: number, e: React.DragEvent<HTMLElement>) {
    if (!canReorder) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", `tpl:${id}`); } catch {}
  }
  function onRowDragOver(targetId: number, e: React.DragEvent<HTMLElement>) {
    if (!canReorder || dragId == null || dragId === targetId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropBeforeId !== targetId) setDropBeforeId(targetId);
  }
  function onRowDragLeave(targetId: number) {
    if (dropBeforeId === targetId) setDropBeforeId(null);
  }
  function onRowDrop(targetId: number, e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    if (!canReorder || dragId == null || dragId === targetId) {
      setDragId(null);
      setDropBeforeId(null);
      return;
    }
    const next = templates.filter((t) => t.id !== dragId);
    const targetIdx = next.findIndex((t) => t.id === targetId);
    const moving = templates.find((t) => t.id === dragId);
    if (moving && targetIdx >= 0) next.splice(targetIdx, 0, moving);
    setDragId(null);
    setDropBeforeId(null);
    onReorder(next.map((t) => t.id));
  }
  function onRowDragEnd() {
    setDragId(null);
    setDropBeforeId(null);
  }

  return (
    <>
      <div className="mx-browse-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="mx-manage-sheet" role="dialog" aria-modal="true" aria-label="Manage day templates">
        <div className="mx-manage-head">
          <div className="mx-manage-eyebrow">
            <span>§ DAY TEMPLATES</span>
            <button className="mx-manage-x" onClick={onClose} aria-label="Close">✕ CLOSE</button>
          </div>
          <div className="mx-manage-title">Saved days.</div>
          <input
            className="mx-manage-search"
            type="search"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mx-manage-list">
          {templates.length === 0 ? (
            <div className="mx-manage-empty">
              No templates yet.<br />
              Save a day from the planner ⋯ menu.
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-manage-empty">No matches.</div>
          ) : (
            filtered.map((t) => {
              const isRenaming = renaming?.id === t.id;
              const dragEnabled = canReorder && !isRenaming;
              const isDragging = dragId === t.id;
              const isDropTarget = dropBeforeId === t.id && dragId != null && dragId !== t.id;
              return (
                <div
                  key={t.id}
                  className={`mx-manage-item${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-before" : ""}`}
                  onDragOver={dragEnabled ? (e) => onRowDragOver(t.id, e) : undefined}
                  onDragLeave={dragEnabled ? () => onRowDragLeave(t.id) : undefined}
                  onDrop={dragEnabled ? (e) => onRowDrop(t.id, e) : undefined}
                >
                  <span
                    className={`mx-manage-handle${dragEnabled ? "" : " is-disabled"}`}
                    draggable={dragEnabled}
                    onDragStart={dragEnabled ? (e) => onRowDragStart(t.id, e) : undefined}
                    onDragEnd={dragEnabled ? onRowDragEnd : undefined}
                    aria-hidden="true"
                    title={dragEnabled ? "Drag to reorder" : undefined}
                  >⋮⋮</span>
                  <div>
                    {isRenaming ? (
                      <div className="mx-manage-inline-rename">
                        <input
                          value={renaming.value}
                          onChange={(e) => setRenaming({ id: t.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                            else if (e.key === "Escape") setRenaming(null);
                          }}
                          autoFocus
                          maxLength={80}
                        />
                      </div>
                    ) : (
                      <div className="mx-manage-name">{t.name}</div>
                    )}
                    <div className="mx-manage-meta">
                      {t.person && (
                        <>
                          <span className="mx-manage-meta-attrib">
                            <span className="mx-manage-meta-attrib-dot" style={{ background: t.person.color || "var(--accent)" }} />
                            From {t.person.name}
                          </span>
                          <span>·</span>
                        </>
                      )}
                      <span>{t.items.length} item{t.items.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div className="mx-manage-actions">
                    {isRenaming ? (
                      <>
                        <button type="button" onClick={commitRename}>Save</button>
                        <button type="button" onClick={() => setRenaming(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setRenaming({ id: t.id, value: t.name })}>Rename</button>
                        <button type="button" className="danger" onClick={() => onDelete(t)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
