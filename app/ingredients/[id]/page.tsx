"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePersonContext } from "../../components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
import { clientCache } from "@/lib/clientCache";
import ContextualTip from "../../components/ContextualTip";

/* ── Types ── */

type NutrientValue = {
  id: number;
  value: number;
  nutrient: { id: number; name: string; displayName: string; unit: string };
};

type Ingredient = {
  id: number;
  name: string;
  fdcId?: string | null;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  isMealItem?: boolean;
  nutrientValues: NutrientValue[];
};

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

type Goal = {
  nutrientId: number;
  lowGoal?: number | null;
  highGoal?: number | null;
  nutrient: { displayName: string; unit: string };
};

/* ── Utilities ── */

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

function getAmountInGrams(
  amount: string,
  unit: string,
  customUnitName: string,
  customUnitAmount: string,
  customUnitGrams: string
): number {
  const parsed = Number(amount);
  if (!parsed || parsed <= 0) return 100;
  if (unit === "g") return parsed;
  if (unit === "ml") return parsed;
  if (customUnitName && customUnitGrams && unit === customUnitName) {
    const customAmount = Number(customUnitAmount) || 1;
    return (parsed / customAmount) * Number(customUnitGrams);
  }
  const mlPerUnit = VOLUME_TO_ML[unit];
  return mlPerUnit ? parsed * mlPerUnit : parsed;
}

function getVolumeUnitNote(unit: string, hasCustomGrams: boolean): string {
  if (hasCustomGrams) return "";
  if (unit === "tsp") return "1 tsp = 5 ml";
  if (unit === "tbsp") return "1 tbsp = 15 ml";
  if (unit === "cup") return "1 cup = 240 ml";
  if (unit === "ml") return "1 ml = 1 g";
  return "";
}

function formatNutrient(num: number): string {
  if (num === 0) return "0";
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const fracPart = absNum - intPart;
  if (fracPart === 0) return String(num);
  const fracStr = fracPart.toString().split(".")[1] || "";
  let firstNonZeroIdx = fracStr.length;
  for (let i = 0; i < fracStr.length; i++) {
    if (fracStr[i] !== "0") {
      firstNonZeroIdx = i;
      break;
    }
  }
  const decimalPlaces = firstNonZeroIdx + 2;
  const factor = Math.pow(10, decimalPlaces);
  const truncated = Math.floor(absNum * factor) / factor;
  const result = isNegative ? -truncated : truncated;
  return result.toString();
}

/* ── Jump Sections ── */

const JUMP_SECTIONS = [
  { id: "ing-sec-details", n: "01", label: "Details" },
  { id: "ing-sec-nutrition", n: "02", label: "Nutrition" },
];

const EDIT_JUMP_SECTIONS = [
  { id: "pf-sec-lookup", n: "01", label: "Lookup" },
  { id: "pf-sec-details", n: "02", label: "Details" },
  { id: "pf-sec-nutrition", n: "03", label: "Nutrition" },
];

/* ── Page Component ── */

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedPerson } = usePersonContext();
  const ingredientId = Number(params.id);

  // Data
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Mode
  const [editMode, setEditMode] = useState(false);

  // Jump nav
  const [activeSection, setActiveSection] = useState(JUMP_SECTIONS[0].id);
  const jumpNavLocked = useRef(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("g");
  const [editCustomUnitName, setEditCustomUnitName] = useState("");
  const [editCustomUnitAmount, setEditCustomUnitAmount] = useState("1");
  const [editCustomUnitGrams, setEditCustomUnitGrams] = useState("");
  const [editIsMealItem, setEditIsMealItem] = useState(false);
  const [editSpecifiedAmount, setEditSpecifiedAmount] = useState("100");
  const [editSpecifiedUnit, setEditSpecifiedUnit] = useState("g");
  const [editValues, setEditValues] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  // USDA
  const [usdaLookupQuery, setUsdaLookupQuery] = useState("");
  const [usdaLookupResults, setUsdaLookupResults] = useState<any[]>([]);
  const [usdaLookupLoading, setUsdaLookupLoading] = useState(false);
  const [usdaSelectedFood, setUsdaSelectedFood] = useState<any | null>(null);
  const usdaSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editBaseUnit = "g";
  const editVolumeNote = getVolumeUnitNote(
    editSpecifiedUnit,
    !!editCustomUnitGrams && editCustomUnitName === editSpecifiedUnit
  );

  /* ── Fetch ingredient ── */
  useEffect(() => {
    const cached = clientCache.get<Ingredient>(`/api/ingredients/${ingredientId}`);
    if (cached) {
      setIngredient(cached);
      setLoading(false);
      // Background revalidate
      fetch(`/api/ingredients/${ingredientId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) {
            clientCache.set(`/api/ingredients/${ingredientId}`, data);
            setIngredient(data);
          }
        })
        .catch(console.error);
      return;
    }
    setLoading(true);
    fetch(`/api/ingredients/${ingredientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          clientCache.set(`/api/ingredients/${ingredientId}`, data);
          setIngredient(data);
        }
      })
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load ingredient");
      })
      .finally(() => setLoading(false));
  }, [ingredientId]);

  /* ── Fetch nutrients (for edit mode) ── */
  useEffect(() => {
    const cached = clientCache.get<Nutrient[]>("/api/nutrients");
    if (cached) {
      setNutrients(cached);
      return;
    }
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        clientCache.set("/api/nutrients", list);
        setNutrients(list);
      })
      .catch(console.error);
  }, []);

  /* ── Fetch goals ── */
  useEffect(() => {
    if (!selectedPerson?.id) return;
    const cacheKey = `/api/persons/${selectedPerson.id}/goals`;
    const cached = clientCache.get<Goal[]>(cacheKey);
    if (cached) {
      setGoals(cached);
      return;
    }
    fetch(cacheKey)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        clientCache.set(cacheKey, list);
        setGoals(list);
      })
      .catch(() => {});
  }, [selectedPerson?.id]);

  /* ── Scroll-position jump nav ── */
  useEffect(() => {
    const containerId = editMode ? "pf-scroll-container" : "ing-scroll-container";
    const scrollEl = document.getElementById(containerId);
    if (!scrollEl) return;
    const sections = editMode ? EDIT_JUMP_SECTIONS : JUMP_SECTIONS;
    const sectionIds = sections.map((s) => s.id);
    const update = () => {
      if (jumpNavLocked.current) return;
      const paneRect = scrollEl.getBoundingClientRect();
      let activeId = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - paneRect.top <= 100) activeId = id;
      }
      setActiveSection(activeId);
    };
    scrollEl.addEventListener("scroll", update, { passive: true });
    update();
    return () => scrollEl.removeEventListener("scroll", update);
  }, [ingredient, editMode]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const containerId = editMode ? "pf-scroll-container" : "ing-scroll-container";
    const container = document.getElementById(containerId);
    if (el && container) {
      setActiveSection(id);
      jumpNavLocked.current = true;
      container.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
      setTimeout(() => { jumpNavLocked.current = false; }, 800);
    }
  };

  /* ── Edit click ── */
  const handleEditClick = () => {
    if (!ingredient) return;
    setEditMode(true);
    setEditName(ingredient.name);
    setEditUnit(ingredient.defaultUnit);
    setEditIsMealItem(Boolean(ingredient.isMealItem));
    setEditCustomUnitName(
      ingredient.customUnitName ??
        (["tsp", "tbsp", "cup"].includes(ingredient.defaultUnit)
          ? ingredient.defaultUnit
          : "")
    );
    setEditCustomUnitAmount(
      ingredient.customUnitAmount != null ? String(ingredient.customUnitAmount) : "1"
    );
    setEditCustomUnitGrams(
      ingredient.customUnitGrams != null ? String(ingredient.customUnitGrams) : ""
    );
    setEditSpecifiedAmount("100");
    setEditSpecifiedUnit(ingredient.defaultUnit === "ml" ? "ml" : "g");
    const vals: Record<number, number> = {};
    ingredient.nutrientValues.forEach((nv) => {
      vals[nv.nutrient.id] = nv.value;
    });
    setEditValues(vals);
    setUsdaLookupQuery(ingredient.name);
    setUsdaLookupResults([]);
    setUsdaSelectedFood(null);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!ingredient) return;
    if (
      !(await dialog.confirm(`Delete "${ingredient.name}"?`, {
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      clientCache.delete(`/api/ingredients/${ingredient.id}`);
      const cached = clientCache.get<Ingredient[]>("/api/ingredients?slim=true");
      if (cached) {
        clientCache.set(
          "/api/ingredients?slim=true",
          cached.filter((i) => i.id !== ingredient.id)
        );
      }
      toast.success(`${ingredient.name} deleted`);
      router.push("/ingredients");
    } catch (err) {
      console.error(err);
      toast.error(
        `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  /* ── USDA Search ── */
  const handleUsdaSearch = (query: string) => {
    setUsdaLookupQuery(query);
    if (usdaSearchTimerRef.current) clearTimeout(usdaSearchTimerRef.current);
    if (!query.trim()) {
      setUsdaLookupResults([]);
      setUsdaLookupLoading(false);
      return;
    }
    setUsdaLookupLoading(true);
    usdaSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/usda/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setUsdaLookupResults(data.foods || []);
        } else {
          setUsdaLookupResults([]);
        }
      } catch (err) {
        console.error("USDA search error:", err);
        setUsdaLookupResults([]);
      } finally {
        setUsdaLookupLoading(false);
      }
    }, 500);
  };

  const applyUsdaFoodDataToForm = async (food: any) => {
    setUsdaSelectedFood(food);
    setEditName(food.description);

    // Check global ingredient cache first
    const globalRes = await fetch(`/api/global-ingredients?fdcId=${food.fdcId}`);
    const globalData = globalRes.ok ? await globalRes.json() : null;

    if (globalData) {
      let nutrientsList = nutrients;
      if (!nutrientsList || nutrientsList.length === 0) {
        const nutrRes = await fetch("/api/nutrients");
        if (nutrRes.ok) nutrientsList = await nutrRes.json();
      }
      const newValues: Record<number, number> = {};
      globalData.nutrients.forEach((gn: any) => {
        newValues[gn.nutrientId] = gn.value;
      });
      setEditValues(newValues);
      setUsdaLookupQuery("");
      setUsdaLookupResults([]);
      return;
    }

    // Fall back to USDA API
    const res = await fetch(`/api/usda/fetch/${food.fdcId}`);
    if (!res.ok) return;
    const foodData = await res.json();

    const nutrientMap: Record<string, number> = {};
    if (foodData.foodNutrients && Array.isArray(foodData.foodNutrients)) {
      foodData.foodNutrients.forEach((fn: any) => {
        const lowerName = (fn.nutrient?.name || "").toLowerCase();
        const value = fn.amount;
        if (lowerName.includes("energy")) nutrientMap["calories"] = Math.round(value);
        else if (lowerName.includes("total lipid") || lowerName.includes("total fat"))
          nutrientMap["fat"] = Math.round(value * 10) / 10;
        else if (lowerName.includes("saturated"))
          nutrientMap["satFat"] = Math.round(value * 10) / 10;
        else if (lowerName.includes("sodium"))
          nutrientMap["sodium"] = Math.round(value);
        else if (lowerName.includes("carbohydrate"))
          nutrientMap["carbs"] = Math.round(value * 10) / 10;
        else if (lowerName.includes("sugar"))
          nutrientMap["sugar"] = Math.round(value * 10) / 10;
        else if (lowerName.includes("protein"))
          nutrientMap["protein"] = Math.round(value * 10) / 10;
        else if (lowerName.includes("fiber"))
          nutrientMap["fiber"] = Math.round(value * 10) / 10;
      });
    }

    let nutrientsList = nutrients;
    if (!nutrientsList || nutrientsList.length === 0) {
      const nutrRes = await fetch("/api/nutrients");
      if (nutrRes.ok) nutrientsList = await nutrRes.json();
    }

    const newValues: Record<number, number> = {};
    nutrientsList.forEach((n: any) => {
      if (nutrientMap[n.name] !== undefined) newValues[n.id] = nutrientMap[n.name];
    });
    setEditValues(newValues);
    setUsdaLookupQuery("");
    setUsdaLookupResults([]);
  };

  const handleUsdaSelect = async (food: any) => {
    try {
      await applyUsdaFoodDataToForm(food);
    } catch (err) {
      console.error("USDA fetch error:", err);
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!ingredient) return;

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(editUnit);
    if (isCustomUnit && editUnit === "other" && !editCustomUnitName.trim()) {
      toast.error("Please enter a custom unit name (e.g., 'banana')");
      return;
    }

    setSaving(true);
    try {
      const specAmount = getAmountInGrams(
        editSpecifiedAmount,
        editSpecifiedUnit,
        editCustomUnitName,
        editCustomUnitAmount,
        editCustomUnitGrams
      );
      const normalizedValues = Object.entries(editValues).map(
        ([nutrientId, value]) => ({
          nutrientId: Number(nutrientId),
          value: (Number(value) || 0) * (100 / specAmount),
        })
      );

      const body: any = {
        name: editName,
        defaultUnit: editUnit,
        isMealItem: editIsMealItem,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName =
          editUnit === "other" ? editCustomUnitName.trim() : editUnit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(editCustomUnitAmount) || 1;
        body.customUnitGrams = editCustomUnitGrams
          ? Number(editCustomUnitGrams)
          : null;
      }

      const res = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }

      const updatedIng = await res.json();
      clientCache.set(`/api/ingredients/${updatedIng.id}`, updatedIng);
      const cachedList = clientCache.get<Ingredient[]>(
        "/api/ingredients?slim=true"
      );
      if (cachedList) {
        clientCache.set(
          "/api/ingredients?slim=true",
          cachedList.map((i) => (i.id === updatedIng.id ? updatedIng : i))
        );
      }
      setIngredient(updatedIng);
      setEditMode(false);
      const savedCount = updatedIng.nutrientValues?.length || 0;
      toast.success(
        `Ingredient saved${
          savedCount > 0 ? ` with ${savedCount} nutrient values` : ""
        }`
      );
    } catch (e) {
      console.error(e);
      toast.error(
        `Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">
          Loading ingredient...
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!ingredient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="font-serif text-[20px] text-[var(--fg)]">
            Ingredient not found
          </div>
          <Link
            href="/ingredients"
            className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--accent)] no-underline hover:text-[var(--fg)] transition-colors"
          >
            &larr; Back to pantry
          </Link>
        </div>
      </div>
    );
  }

  /* ── Unit display string ── */
  const unitDisplay =
    ingredient.customUnitName && ingredient.customUnitGrams
      ? `${ingredient.customUnitAmount || 1} ${ingredient.customUnitName} = ${ingredient.customUnitGrams}g`
      : ingredient.customUnitName && ingredient.customUnitAmount
        ? `${ingredient.customUnitAmount} ${ingredient.customUnitName}`
        : ingredient.defaultUnit;

  /* ── Goal bar helper ── */
  const formatGoalVal = (val: number) => {
    const rounded = Math.round(val);
    return rounded >= 1000 ? rounded.toLocaleString() : String(rounded);
  };

  /* ═══════════════════════════════════════════
     EDIT MODE
     ═══════════════════════════════════════════ */
  if (editMode) {
    const editSections = EDIT_JUMP_SECTIONS;
    return (
      <div className="h-full relative animate-page-enter">
        {/* ── Jump Nav (fixed left) ── */}
        <nav
          className="fixed z-50 flex flex-col"
          style={{ left: "var(--pad)", top: "calc(var(--nav-h) + 48px)", width: 140 }}
          aria-label="Pantry form navigation"
        >
          {editSections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={`flex items-baseline gap-[10px] font-mono text-[8px] tracking-[0.1em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left ${
                activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--accent)]"
              }`}
              style={i === 0 ? { paddingTop: 0 } : undefined}
              aria-label={`Jump to ${s.label}`}
            >
              <span className={`font-serif text-[9px] font-bold min-w-[16px] transition-colors ${
                activeSection === s.id ? "text-[var(--accent)]" : "text-[var(--rule)]"
              }`}>{s.n}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── Main Scroll ── */}
        <div id="pf-scroll-container" className="h-full overflow-y-auto">
          <div className="max-w-[1100px] mx-auto" style={{ padding: "48px 64px 60px 196px" }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">Pantry / Edit</div>
              <h1 className="font-serif font-bold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(22px, 2.4vw, 32px)", textWrap: "balance" }}>Edit Pantry Item</h1>
            </div>

            {/* ── 01 Lookup ── */}
            <div id="pf-sec-lookup" style={{ marginTop: 64 }}>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-serif text-[11px] font-bold text-[var(--rule)]">01</span>
                <span className="font-serif text-[20px] font-bold tracking-[-0.01em]">Lookup</span>
                <div className="flex-1 h-px bg-[var(--rule)]" />
              </div>

              <div className="flex gap-[10px] items-end" style={{ marginBottom: 10 }}>
                <div className="ed-field flex-1" style={{ marginBottom: 0 }}>
                  <input
                    className="ed-input"
                    placeholder="Search USDA database…"
                    value={usdaLookupQuery}
                    onChange={(e) => handleUsdaSearch(e.target.value)}
                    aria-label="USDA search"
                  />
                </div>
                <button className="ed-btn" onClick={() => { if (usdaLookupQuery.trim()) handleUsdaSearch(usdaLookupQuery); }} aria-label="USDA Lookup">USDA Lookup</button>
              </div>

              <ContextualTip tipId="usda-search" label="About the USDA database">
                Search 300,000+ foods from the USDA national database. Results include
                branded products and generic entries. Selecting one fills in the nutrition
                values automatically. You can always edit them at any time.
              </ContextualTip>

              {usdaLookupLoading && (
                <p className="text-[11px] text-[var(--muted)] mt-2">Searching USDA...</p>
              )}
              {usdaLookupResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto mt-[10px]">
                  {usdaLookupResults.map((food: any) => (
                    <button
                      key={food.fdcId}
                      onClick={() => handleUsdaSelect(food)}
                      className="block w-full text-left py-[10px] px-[12px] border-b border-[var(--rule)] cursor-pointer bg-transparent hover:bg-[var(--bg-3)] transition-colors"
                    >
                      <div className="font-sans text-[13px] font-medium">{food.description}</div>
                      <div className="font-mono text-[8px] text-[var(--muted)] mt-[2px]">{food.dataType}</div>
                    </button>
                  ))}
                </div>
              )}

              {usdaSelectedFood && (
                <p className="text-[11px] text-[var(--accent)] mt-2">Data imported from USDA FDC</p>
              )}
            </div>

            {/* ── 02 Details ── */}
            <div id="pf-sec-details" style={{ marginTop: 64 }}>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-serif text-[11px] font-bold text-[var(--rule)]">02</span>
                <span className="font-serif text-[20px] font-bold tracking-[-0.01em]">Details</span>
                <div className="flex-1 h-px bg-[var(--rule)]" />
              </div>

              <div className="ed-row" style={{ marginBottom: 20 }}>
                <div className="ed-field" style={{ flex: 2 }}>
                  <label className="ed-label">Item Name</label>
                  <input className="ed-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Cottage Cheese 2%" aria-label="Item name" />
                </div>
                <div className="ed-field" style={{ flex: 1 }}>
                  <label className="ed-label">Default Unit</label>
                  <select
                    className="ed-select"
                    value={editUnit}
                    onChange={(e) => {
                      const nextUnit = e.target.value;
                      setEditUnit(nextUnit);
                      if (["g", "ml", "tsp", "tbsp", "cup"].includes(nextUnit)) setEditSpecifiedUnit(nextUnit);
                      if (["tsp", "tbsp", "cup"].includes(nextUnit)) setEditCustomUnitName(nextUnit);
                    }}
                    aria-label="Default unit"
                  >
                    <option value="g">g (grams)</option>
                    <option value="ml">ml (milliliters)</option>
                    <option value="other">other (custom unit)</option>
                  </select>
                </div>
              </div>

              {/* Custom Unit Settings */}
              {["other", "tsp", "tbsp", "cup"].includes(editUnit) && (
                <div style={{ marginBottom: 20 }}>
                  <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px]">Custom Unit Settings</div>
                  <div className="ed-row">
                    <div className="ed-field">
                      <label className="ed-label">Unit Name</label>
                      {editUnit === "other" ? (
                        <input className="ed-input" placeholder="e.g. banana, scoop, cup" value={editCustomUnitName} onChange={(e) => setEditCustomUnitName(e.target.value)} aria-label="Custom unit name" />
                      ) : (
                        <div className="py-[6px] font-mono text-[12px] font-light text-[var(--fg)]">{editUnit}</div>
                      )}
                    </div>
                    <div className="ed-field">
                      <label className="ed-label">Amount Per Unit</label>
                      <input className="ed-input" type="number" step="any" value={editCustomUnitAmount} onChange={(e) => setEditCustomUnitAmount(e.target.value)} aria-label="Amount per unit" />
                    </div>
                    <div className="ed-field">
                      <label className="ed-label">Grams Per Unit</label>
                      <input className="ed-input" type="number" step="any" placeholder="e.g. 120" value={editCustomUnitGrams} onChange={(e) => setEditCustomUnitGrams(e.target.value)} aria-label="Grams per unit" />
                      <div className="font-mono text-[8px] text-[var(--muted)] mt-[4px]">e.g. 120 for an average banana</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Meal Item Checkbox */}
              <div className="flex items-center gap-[10px] py-[12px]" style={{ marginBottom: 20 }}>
                <input type="checkbox" checked={editIsMealItem} onChange={(e) => setEditIsMealItem(e.target.checked)} className="cursor-pointer" id="pf-meal-check" aria-label="Meal item" />
                <label htmlFor="pf-meal-check" className="cursor-pointer">
                  <span className="text-[13px] text-[var(--fg)]">This is a food item</span>
                  <span className="text-[13px] text-[var(--muted)]"> — something eaten directly such as an apple or a granola bar, not an ingredient such as flour or salt</span>
                </label>
              </div>
            </div>

            {/* ── 03 Nutrition ── */}
            <div id="pf-sec-nutrition" style={{ marginTop: 64 }}>
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-serif text-[11px] font-bold text-[var(--rule)]">03</span>
                <span className="font-serif text-[20px] font-bold tracking-[-0.01em]">Nutrition</span>
                <div className="flex-1 h-px bg-[var(--rule)]" />
              </div>

              {/* Basis row */}
              <div className="flex items-center gap-[10px]" style={{ marginBottom: 24 }}>
                <span className="font-mono text-[8px] text-[var(--muted)]">Values are per</span>
                <input
                  className="ed-input"
                  type="number"
                  step="any"
                  value={editSpecifiedAmount}
                  onChange={(e) => setEditSpecifiedAmount(e.target.value)}
                  style={{ width: 80 }}
                  aria-label="Reference amount"
                />
                <select
                  className="ed-select"
                  style={{ width: "auto" }}
                  value={editSpecifiedUnit}
                  onChange={(e) => setEditSpecifiedUnit(e.target.value)}
                  aria-label="Reference unit"
                >
                  <option value="g">g (grams)</option>
                  <option value="ml">ml (milliliters)</option>
                </select>
                {editVolumeNote && (
                  <span className="font-mono text-[8px] text-[var(--muted)]">({editVolumeNote})</span>
                )}
              </div>

              {/* Nutrient grid */}
              {nutrients.length === 0 ? (
                <p className="text-[11px] text-[var(--muted)]">Loading nutrients...</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-[40px]" style={{ marginBottom: 24 }}>
                  {nutrients.map((n) => {
                    const inputValue = editValues[n.id];
                    return (
                      <div key={n.id} className="flex items-center gap-[12px] py-[10px]">
                        <span className="text-[13px] w-[120px] shrink-0">{n.displayName}</span>
                        <input
                          className="ed-input flex-1 text-right"
                          type="number"
                          step="any"
                          placeholder="0"
                          value={inputValue != null ? String(inputValue) : ""}
                          onChange={(e) =>
                            setEditValues((prev) => {
                              if (e.target.value === "") {
                                const { [n.id]: _, ...rest } = prev;
                                return rest;
                              }
                              return { ...prev, [n.id]: Number(e.target.value) };
                            })
                          }
                          aria-label={n.displayName}
                        />
                        <span className="font-mono text-[9px] text-[var(--muted)] w-[32px] shrink-0">{n.unit}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Button Row ── */}
            <div className="flex justify-end gap-[10px]" style={{ marginTop: 64 }}>
              <button className="ed-btn ghost" onClick={() => setEditMode(false)} disabled={saving} aria-label="Cancel editing">Cancel</button>
              <button className="ed-btn" onClick={handleEditClick} disabled={saving} aria-label="Reset form">Reset</button>
              <button className="ed-btn primary" onClick={handleSave} disabled={saving} aria-label="Save ingredient">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW MODE
     ═══════════════════════════════════════════ */
  return (
    <div className="h-full relative animate-page-enter">
      {/* ── Jump Nav (fixed left) ── */}
      <nav
        className="fixed z-50 flex flex-col"
        style={{ left: "var(--pad)", top: "calc(var(--nav-h) + 48px)", width: 140 }}
        aria-label="Jump to section"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[8px] tracking-[0.1em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left ${
              activeSection === s.id
                ? "text-[var(--fg)]"
                : "text-[var(--muted)] hover:text-[var(--accent)]"
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span
              className={`font-serif text-[9px] font-bold min-w-[16px] transition-colors ${
                activeSection === s.id
                  ? "text-[var(--accent)]"
                  : "text-[var(--rule)]"
              }`}
            >
              {s.n}
            </span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ── Main Scroll ── */}
      <div id="ing-scroll-container" className="h-full overflow-y-auto">
        <div
          className="max-w-[1100px] mx-auto"
          style={{ padding: "0 64px 120px 196px" }}
        >
          {/* ── Hero ── */}
          <div style={{ padding: "48px 0 56px" }}>
            {/* Back link */}
            <Link
              href="/ingredients"
              className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--muted)] no-underline hover:text-[var(--accent)] transition-colors inline-block mb-6"
            >
              &larr; Back to pantry
            </Link>

            {/* Meta line */}
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-4 flex items-center gap-[10px]">
              <span>{unitDisplay}</span>
              {ingredient.isMealItem && (
                <span className="font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[10px] bg-[var(--bg-3)] text-[var(--muted)]">
                  Quick food
                </span>
              )}
            </div>

            {/* Name */}
            <h1
              className="font-serif font-bold tracking-[-0.03em] leading-[1.05] text-[var(--fg)] mb-8"
              style={{
                fontSize: "clamp(30px, 3.4vw, 48px)",
                textWrap: "balance",
              }}
            >
              {ingredient.name}
            </h1>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className="font-mono text-[8px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[6px] px-[14px] cursor-pointer transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.97]"
                aria-label="Edit ingredient"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="font-mono text-[8px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--err)] py-[6px] px-[14px] cursor-pointer transition-colors hover:border-[var(--err)] hover:bg-[var(--err-l)] active:scale-[0.97]"
                aria-label="Delete ingredient"
              >
                Delete
              </button>
            </div>
          </div>

          {/* ── Section 01: Details ── */}
          <section id="ing-sec-details">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-serif text-[9px] font-bold text-[var(--rule)]">
                01
              </span>
              <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Details
              </span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            <div className="space-y-4 mb-16">
              {/* Name */}
              <div className="flex items-baseline justify-between py-[7px] border-b border-[var(--rule)]">
                <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">
                  Name
                </span>
                <span className="font-sans text-[13px] text-[var(--fg)]">
                  {ingredient.name}
                </span>
              </div>

              {/* Default Unit */}
              <div className="flex items-baseline justify-between py-[7px] border-b border-[var(--rule)]">
                <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">
                  Default Unit
                </span>
                <span className="font-sans text-[13px] text-[var(--fg)]">
                  {ingredient.defaultUnit}
                </span>
              </div>

              {/* Custom unit info */}
              {ingredient.customUnitName && (
                <div className="flex items-baseline justify-between py-[7px] border-b border-[var(--rule)]">
                  <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">
                    Custom Unit
                  </span>
                  <span className="font-sans text-[13px] text-[var(--fg)]">
                    {ingredient.customUnitAmount || 1} {ingredient.customUnitName}
                    {ingredient.customUnitGrams
                      ? ` = ${ingredient.customUnitGrams}g`
                      : ""}
                  </span>
                </div>
              )}

              {/* Meal item */}
              <div className="flex items-baseline justify-between py-[7px] border-b border-[var(--rule)]">
                <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">
                  Quick Food
                </span>
                <span className="font-sans text-[13px] text-[var(--fg)]">
                  {ingredient.isMealItem ? "Yes" : "No"}
                </span>
              </div>

              {/* USDA source */}
              {ingredient.fdcId && (
                <div className="flex items-baseline justify-between py-[7px] border-b border-[var(--rule)]">
                  <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">
                    USDA FDC ID
                  </span>
                  <span className="font-mono text-[11px] text-[var(--muted)] tabular-nums">
                    {ingredient.fdcId}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ── Section 02: Nutrition ── */}
          <section id="ing-sec-nutrition">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-serif text-[9px] font-bold text-[var(--rule)]">
                02
              </span>
              <span className="font-mono text-[8px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Nutrition
              </span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-4">
              Per 100g
              {selectedPerson?.name && goals.length > 0 && (
                <span className="ml-3 normal-case tracking-normal text-[9px]">
                  Bars show % of {selectedPerson.name}&apos;s daily goal
                </span>
              )}
            </div>

            {ingredient.nutrientValues.length > 0 ? (
              <div className="space-y-0">
                {ingredient.nutrientValues.map((nv, idx) => {
                  // Find matching goal
                  const goal = goals.find((g) => g.nutrientId === nv.nutrient.id);
                  const target = goal
                    ? goal.highGoal || goal.lowGoal || 0
                    : 0;
                  const pct =
                    target > 0 ? Math.round((nv.value / target) * 100) : 0;
                  const isOver = pct > 100;
                  const isWarn = !isOver && pct > 80;

                  return (
                    <div
                      key={nv.id}
                      className={`py-[9px] ${
                        idx < ingredient.nutrientValues.length - 1
                          ? "border-b border-[var(--rule)]"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-baseline mb-[4px]">
                        <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--fg)]">
                          {nv.nutrient.displayName}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--fg)] tabular-nums">
                          {formatNutrient(nv.value)} {nv.nutrient.unit}
                          {goal && target > 0 && (
                            <span
                              className={`ml-2 text-[9px] ${
                                isOver
                                  ? "text-[var(--err)]"
                                  : isWarn
                                    ? "text-[var(--warn)]"
                                    : "text-[var(--muted)]"
                              }`}
                            >
                              {pct}%
                              {isOver && " over"}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Goal bar */}
                      {goal && target > 0 && (
                        <div className="h-[3px] bg-[var(--bg-3)] overflow-hidden mt-[2px]">
                          <div
                            className={`h-full transition-all ${
                              isOver
                                ? "bg-[var(--err)]"
                                : isWarn
                                  ? "bg-[var(--warn)]"
                                  : "bg-[var(--accent)]"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                No nutrient data. Click Edit to add nutrition values manually or
                look up this ingredient in the USDA database.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
