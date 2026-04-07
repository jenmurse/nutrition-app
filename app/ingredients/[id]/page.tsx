"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  category?: string;
  nutrientValues: NutrientValue[];
};

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
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

/* ── Categories ── */
const CATEGORIES = [
  { value: "", label: "Other" },
  { value: "Produce", label: "Produce" },
  { value: "Meat & Fish", label: "Meat & Fish" },
  { value: "Dairy & Eggs", label: "Dairy & Eggs" },
  { value: "Grains & Bread", label: "Grains & Bread" },
  { value: "Baking", label: "Baking" },
  { value: "Spices & Seasonings", label: "Spices & Seasonings" },
  { value: "Condiments & Sauces", label: "Condiments & Sauces" },
  { value: "Oils & Fats", label: "Oils & Fats" },
  { value: "Frozen", label: "Frozen" },
  { value: "Canned & Jarred", label: "Canned & Jarred" },
  { value: "Beverages", label: "Beverages" },
  { value: "Snacks", label: "Snacks" },
];

/* ── Jump Sections ── */

const EDIT_JUMP_SECTIONS = [
  { id: "pf-sec-lookup", n: "01", label: "Lookup" },
  { id: "pf-sec-details", n: "02", label: "Details" },
  { id: "pf-sec-nutrition", n: "03", label: "Nutrition" },
];

/* ── Page Component ── */

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ingredientId = Number(params.id);

  // Data
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const formInitialized = useRef(false);

  // Jump nav
  const [activeSection, setActiveSection] = useState(EDIT_JUMP_SECTIONS[0].id);
  const jumpNavLocked = useRef(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("g");
  const [editCustomUnitName, setEditCustomUnitName] = useState("");
  const [editCustomUnitAmount, setEditCustomUnitAmount] = useState("1");
  const [editCustomUnitGrams, setEditCustomUnitGrams] = useState("");
  const [editIsMealItem, setEditIsMealItem] = useState(false);
  const [editCategory, setEditCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
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

  /* ── Category dropdown outside click ── */
  useEffect(() => {
    if (!categoryOpen) return;
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [categoryOpen]);

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

  /* ── Initialize form when ingredient loads ── */
  useEffect(() => {
    if (ingredient && !formInitialized.current) {
      formInitialized.current = true;
      setEditName(ingredient.name);
      setEditUnit(ingredient.defaultUnit);
      setEditIsMealItem(Boolean(ingredient.isMealItem));
      setEditCategory(ingredient.category || "");
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
      setUsdaLookupQuery("");
    }
  }, [ingredient]);

  /* ── Scroll-position jump nav ── */
  useEffect(() => {
    const scrollEl = document.getElementById("pf-scroll-container");
    if (!scrollEl) return;
    const sectionIds = EDIT_JUMP_SECTIONS.map((s) => s.id);
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
  }, [ingredient]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("pf-scroll-container");
    if (el && container) {
      setActiveSection(id);
      jumpNavLocked.current = true;
      container.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
      setTimeout(() => { jumpNavLocked.current = false; }, 800);
    }
  };

  /* ── Reset form to saved values ── */
  const handleReset = () => {
    if (!ingredient) return;
    setEditName(ingredient.name);
    setEditUnit(ingredient.defaultUnit);
    setEditIsMealItem(Boolean(ingredient.isMealItem));
    setEditCategory(ingredient.category || "");
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
    setUsdaLookupQuery("");
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
  const executeUsdaSearch = async (query: string) => {
    if (!query.trim()) { setUsdaLookupResults([]); setUsdaLookupLoading(false); return; }
    setUsdaLookupLoading(true);
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
  };

  // Debounced search (for typing)
  const handleUsdaSearch = (query: string) => {
    setUsdaLookupQuery(query);
    if (usdaSearchTimerRef.current) clearTimeout(usdaSearchTimerRef.current);
    if (!query.trim()) { setUsdaLookupResults([]); setUsdaLookupLoading(false); return; }
    setUsdaLookupLoading(true);
    usdaSearchTimerRef.current = setTimeout(() => executeUsdaSearch(query), 500);
  };

  // Immediate search (for button click)
  const handleUsdaLookupClick = () => {
    if (usdaSearchTimerRef.current) clearTimeout(usdaSearchTimerRef.current);
    if (usdaLookupQuery.trim()) executeUsdaSearch(usdaLookupQuery);
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
        category: editCategory,
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
      const savedCount = updatedIng.nutrientValues?.length || 0;
      toast.success(
        `Ingredient saved${
          savedCount > 0 ? ` with ${savedCount} nutrient values` : ""
        }`
      );
      router.push("/ingredients");
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

  /* ═══════════════════════════════════════════
     EDIT FORM (only mode — no separate view)
     ═══════════════════════════════════════════ */
  const sections = EDIT_JUMP_SECTIONS;
  return (
    <div className="h-full relative">
      {/* ── Jump Nav (fixed left — outside animated wrapper to avoid transform containment) ── */}
      <nav
        className="detail-jump-nav fixed z-50 flex flex-col"
        style={{ left: "var(--pad)", top: "calc(var(--nav-h) + 48px)", width: 140 }}
        aria-label="Pantry form navigation"
      >
        {sections.map((s, i) => (
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
      <div id="pf-scroll-container" className="h-full overflow-y-auto animate-page-enter">
        <div className="detail-content max-w-[1100px] mx-auto" style={{ padding: "48px 64px 60px 196px" }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">Pantry / Edit</div>
            <h1 className="font-serif font-bold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(22px, 2.4vw, 32px)", textWrap: "balance" }}>Edit Pantry Item</h1>
          </div>

          {/* ── 01 Lookup ── */}
          <div id="pf-sec-lookup" style={{ marginTop: 64 }}>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-serif text-[12px] font-bold text-[var(--rule)]">01</span>
              <span className="font-serif font-semibold tracking-[-0.02em]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Lookup</span>
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
              <button className="ed-btn" onClick={handleUsdaLookupClick} aria-label="USDA Lookup">USDA Lookup</button>
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
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-serif text-[12px] font-bold text-[var(--rule)]">02</span>
              <span className="font-serif font-semibold tracking-[-0.02em]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Details</span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            <div className="ed-row" style={{ marginBottom: 20 }}>
              <div className="ed-field" style={{ flex: 2 }}>
                <label className="ed-label">Item Name</label>
                <input className="ed-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Cottage Cheese 2%" aria-label="Item name" />
              </div>
              <div className="ed-field" style={{ flex: 1 }}>
                <label className="ed-label">Category</label>
                <div ref={categoryRef} className="relative" style={{ display: 'flex', border: '1px solid var(--rule)', transition: 'border-color 0.2s' }}>
                  <button
                    type="button"
                    onClick={() => setCategoryOpen(o => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={categoryOpen}
                    aria-label="Category"
                    className="font-mono text-[8px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 py-[5px] pl-[9px] pr-[22px] cursor-pointer whitespace-nowrap relative w-full text-left"
                  >
                    {CATEGORIES.find(c => c.value === editCategory)?.label ?? "Other"}
                    <span className="absolute right-[7px] top-1/2 -translate-y-1/2 border-[3px] border-transparent border-t-[4px] border-t-[var(--muted)] mt-[2px]" />
                  </button>
                  {categoryOpen && (
                    <div
                      role="listbox"
                      aria-label="Category options"
                      className="absolute left-[-1px] top-[calc(100%+2px)] min-w-full bg-[var(--bg)] border border-[var(--rule)] z-[200] py-[3px] dropdown-enter"
                      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    >
                      {CATEGORIES.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={editCategory === opt.value}
                          onClick={() => { setEditCategory(opt.value); setCategoryOpen(false); }}
                          className={`block w-full text-left font-mono text-[8px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                            editCategory === opt.value
                              ? "text-[var(--fg)] bg-transparent"
                              : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                          }`}
                        >{opt.label}</button>
                      ))}
                    </div>
                  )}
                </div>
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
            <div className="ing-check-row flex items-center gap-[10px] py-[12px]" style={{ marginBottom: 20 }}>
              <input type="checkbox" checked={editIsMealItem} onChange={(e) => setEditIsMealItem(e.target.checked)} className="cursor-pointer" id="pf-meal-check" aria-label="Meal item" />
              <label htmlFor="pf-meal-check" className="cursor-pointer">
                <span className="text-[13px] text-[var(--fg)]">This is a standalone item</span>
                <span className="text-[13px] text-[var(--muted)]"> — something eaten directly (apple, glass of wine, granola bar), not a recipe ingredient (flour, salt, butter)</span>
              </label>
            </div>
          </div>

          {/* ── 03 Nutrition ── */}
          <div id="pf-sec-nutrition" style={{ marginTop: 64 }}>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-serif text-[12px] font-bold text-[var(--rule)]">03</span>
              <span className="font-serif font-semibold tracking-[-0.02em]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Nutrition</span>
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
              <div className="ing-nutr-grid grid grid-cols-2 gap-x-[40px]" style={{ marginBottom: 24 }}>
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
            <button className="ed-btn ghost" onClick={() => router.push("/ingredients")} disabled={saving} aria-label="Cancel editing">Cancel</button>
            <button className="ed-btn" onClick={handleReset} disabled={saving} aria-label="Reset form">Reset</button>
            <button className="ed-btn primary" onClick={handleSave} disabled={saving} aria-label="Save ingredient">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
