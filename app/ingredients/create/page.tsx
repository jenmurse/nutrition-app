"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { clientCache } from "@/lib/clientCache";
import ContextualTip from "../../components/ContextualTip";
import type { Nutrient } from "@/types";

/* ── Utilities ── */

const VOLUME_TO_ML: Record<string, number> = { tsp: 5, tbsp: 15, cup: 240 };

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
  { value: "Meat & Seafood", label: "Meat & Seafood" },
  { value: "Dairy & Eggs", label: "Dairy & Eggs" },
  { value: "Grains, Pasta & Bread", label: "Grains, Pasta & Bread" },
  { value: "Legumes", label: "Legumes" },
  { value: "Baking", label: "Baking" },
  { value: "Nuts & Seeds", label: "Nuts & Seeds" },
  { value: "Spices & Seasonings", label: "Spices & Seasonings" },
  { value: "Condiments & Sauces", label: "Condiments & Sauces" },
  { value: "Oils & Fats", label: "Oils & Fats" },
  { value: "Frozen", label: "Frozen" },
  { value: "Canned & Jarred", label: "Canned & Jarred" },
  { value: "Beverages", label: "Beverages" },
  { value: "Alcohol", label: "Alcohol" },
  { value: "Snacks", label: "Snacks" },
];

/* ── Jump Sections ── */

const JUMP_SECTIONS = [
  { id: "pf-sec-lookup", n: "01", label: "Lookup" },
  { id: "pf-sec-details", n: "02", label: "Details" },
  { id: "pf-sec-nutrition", n: "03", label: "Nutrition" },
];

/* ── Page ── */

export default function CreateIngredientPage() {
  const router = useRouter();

  // Jump nav
  const [activeSection, setActiveSection] = useState(JUMP_SECTIONS[0].id);
  const jumpNavLocked = useRef(false);

  // Form state
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [customUnitName, setCustomUnitName] = useState("");
  const [customUnitAmount, setCustomUnitAmount] = useState("1");
  const [customUnitGrams, setCustomUnitGrams] = useState("");
  const [isMealItem, setIsMealItem] = useState(false);
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [specifiedAmount, setSpecifiedAmount] = useState("100");
  const [specifiedUnit, setSpecifiedUnit] = useState("g");
  const [values, setValues] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  // Nutrients
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);

  // USDA
  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaResults, setUsdaResults] = useState<any[]>([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaSelected, setUsdaSelected] = useState<any | null>(null);
  const usdaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseUnit = "g";
  const volumeNote = getVolumeUnitNote(
    specifiedUnit,
    !!customUnitGrams && customUnitName === specifiedUnit
  );

  /* ── Fetch nutrients ── */
  useEffect(() => {
    const cached = clientCache.get<Nutrient[]>("/api/nutrients");
    if (cached) { setNutrients(cached); return; }
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        clientCache.set("/api/nutrients", list);
        setNutrients(list);
      })
      .catch(console.error);
  }, []);

  /* ── Category dropdown outside click ── */
  useEffect(() => {
    if (!categoryOpen) return;
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [categoryOpen]);

  /* ── Jump nav scroll tracking ── */
  useEffect(() => {
    const scrollEl = document.getElementById("pf-scroll-container");
    if (!scrollEl) return;
    const sectionIds = JUMP_SECTIONS.map((s) => s.id);
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
  }, []);

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

  /* ── USDA Search ── */
  const executeUsdaSearch = async (query: string) => {
    if (!query.trim()) { setUsdaResults([]); setUsdaLoading(false); return; }
    setUsdaLoading(true);
    try {
      const res = await fetch(`/api/usda/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setUsdaResults(data.foods || []);
      } else { setUsdaResults([]); }
    } catch { setUsdaResults([]); }
    finally { setUsdaLoading(false); }
  };

  const handleUsdaSearch = (query: string) => {
    setUsdaQuery(query);
    if (usdaTimerRef.current) clearTimeout(usdaTimerRef.current);
    if (!query.trim()) { setUsdaResults([]); setUsdaLoading(false); return; }
    setUsdaLoading(true);
    usdaTimerRef.current = setTimeout(() => executeUsdaSearch(query), 500);
  };

  const handleUsdaLookupClick = () => {
    if (usdaTimerRef.current) clearTimeout(usdaTimerRef.current);
    if (usdaQuery.trim()) executeUsdaSearch(usdaQuery);
  };

  const handleUsdaSelect = async (food: any) => {
    setUsdaSelected(food);
    setName(food.description);

    // Check global ingredient cache first
    const globalRes = await fetch(`/api/global-ingredients?fdcId=${food.fdcId}`);
    const globalData = globalRes.ok ? await globalRes.json() : null;

    let nutrientsList = nutrients;
    if (!nutrientsList.length) {
      const nutrRes = await fetch("/api/nutrients");
      if (nutrRes.ok) nutrientsList = await nutrRes.json();
    }

    if (globalData) {
      const newValues: Record<number, number> = {};
      globalData.nutrients.forEach((gn: any) => { newValues[gn.nutrientId] = gn.value; });
      setValues(newValues);
    } else {
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
          else if (lowerName.includes("total lipid") || lowerName.includes("total fat")) nutrientMap["fat"] = Math.round(value * 10) / 10;
          else if (lowerName.includes("saturated")) nutrientMap["satFat"] = Math.round(value * 10) / 10;
          else if (lowerName.includes("sodium")) nutrientMap["sodium"] = Math.round(value);
          else if (lowerName.includes("carbohydrate")) nutrientMap["carbs"] = Math.round(value * 10) / 10;
          else if (lowerName.includes("sugar")) nutrientMap["sugar"] = Math.round(value * 10) / 10;
          else if (lowerName.includes("protein")) nutrientMap["protein"] = Math.round(value * 10) / 10;
          else if (lowerName.includes("fiber")) nutrientMap["fiber"] = Math.round(value * 10) / 10;
        });
      }
      const newValues: Record<number, number> = {};
      nutrientsList.forEach((n: any) => {
        if (nutrientMap[n.name] !== undefined) newValues[n.id] = nutrientMap[n.name];
      });
      setValues(newValues);
    }
    setUsdaQuery("");
    setUsdaResults([]);
  };

  /* ── Save (Create) ── */
  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(unit);
    if (isCustomUnit && unit === "other" && !customUnitName.trim()) {
      toast.error("Please enter a custom unit name");
      return;
    }

    setSaving(true);
    try {
      const specAmount = getAmountInGrams(specifiedAmount, specifiedUnit, customUnitName, customUnitAmount, customUnitGrams);
      const normalizedValues = Object.entries(values).map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: (Number(value) || 0) * (100 / specAmount),
      }));

      const body: any = {
        name,
        defaultUnit: unit,
        isMealItem,
        category,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName = unit === "other" ? customUnitName.trim() : unit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(customUnitAmount) || 1;
        body.customUnitGrams = customUnitGrams ? Number(customUnitGrams) : null;
      }

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Create failed");
      }

      const created = await res.json();
      clientCache.set(`/api/ingredients/${created.id}`, created);
      clientCache.delete("/api/ingredients?slim=true");
      toast.success(`${created.name} created`);
      router.push("/ingredients");
    } catch (e) {
      console.error(e);
      toast.error(`Failed to create: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full relative">
      {/* ── Jump Nav (fixed left — outside animated wrapper to avoid transform containment) ── */}
      <nav
        className="detail-jump-nav fixed z-50 flex flex-col"
        style={{ left: "40px", top: "calc(var(--nav-h) + 48px)", width: 140 }}
        aria-label="Pantry form navigation"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.14em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left ${
              activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span className={`font-mono text-[9px] font-bold min-w-[16px] transition-colors ${
              activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--rule)]"
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
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">§ NEW</div>
            <h1 className="form-title">A new pantry item.</h1>
          </div>

          {/* ── 01 Lookup ── */}
          <div id="pf-sec-lookup" style={{ marginTop: 64 }}>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-mono text-[13px] font-semibold text-[var(--rule)]">01</span>
              <span className="section-label">Lookup</span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            <div className="flex gap-[10px] items-end" style={{ marginBottom: 10 }}>
              <div className="ed-field flex-1" style={{ marginBottom: 0 }}>
                <input
                  className="ed-input"
                  placeholder="Search USDA database…"
                  value={usdaQuery}
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

            {usdaLoading && (
              <p className="text-[11px] text-[var(--muted)] mt-2">Searching USDA...</p>
            )}
            {usdaResults.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto mt-[10px]">
                {usdaResults.map((food: any) => (
                  <button
                    key={food.fdcId}
                    onClick={() => handleUsdaSelect(food)}
                    className="block w-full text-left py-[10px] px-[12px] border-b border-[var(--rule)] cursor-pointer bg-transparent hover:bg-[var(--bg-3)] transition-colors"
                  >
                    <div className="font-sans text-[13px] font-medium">{food.description}</div>
                    <div className="font-mono text-[9px] text-[var(--muted)] mt-[2px]">{food.dataType}</div>
                  </button>
                ))}
              </div>
            )}

            {usdaSelected && (
              <p className="text-[11px] text-[var(--accent)] mt-2">Data imported from USDA FDC</p>
            )}
          </div>

          {/* ── 02 Details ── */}
          <div id="pf-sec-details" style={{ marginTop: 64 }}>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-mono text-[13px] font-semibold text-[var(--rule)]">02</span>
              <span className="section-label">Details</span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            <div className="ed-row" style={{ marginBottom: 20 }}>
              <div className="ed-field" style={{ flex: 2 }}>
                <label className="ed-label">Item Name</label>
                <input className="ed-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cottage Cheese 2%" aria-label="Item name" />
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
                    className="font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--fg)] bg-transparent border-0 py-[8px] pl-[9px] pr-[22px] cursor-pointer whitespace-nowrap relative w-full text-left"
                  >
                    {CATEGORIES.find(c => c.value === category)?.label ?? "Other"}
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
                          aria-selected={category === opt.value}
                          onClick={() => { setCategory(opt.value); setCategoryOpen(false); }}
                          className={`block w-full text-left font-mono text-[9px] tracking-[0.06em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                            category === opt.value
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
                  value={unit}
                  onChange={(e) => {
                    const nextUnit = e.target.value;
                    setUnit(nextUnit);
                    if (["g", "ml", "tsp", "tbsp", "cup"].includes(nextUnit)) setSpecifiedUnit(nextUnit);
                    if (["tsp", "tbsp", "cup"].includes(nextUnit)) setCustomUnitName(nextUnit);
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
            {["other", "tsp", "tbsp", "cup"].includes(unit) && (
              <div style={{ marginBottom: 20 }}>
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px]">Custom Unit Settings</div>
                <div className="ed-row">
                  <div className="ed-field">
                    <label className="ed-label">Unit Name</label>
                    {unit === "other" ? (
                      <input className="ed-input" placeholder="e.g. banana, scoop, cup" value={customUnitName} onChange={(e) => setCustomUnitName(e.target.value)} aria-label="Custom unit name" />
                    ) : (
                      <div className="py-[6px] font-mono text-[13px] font-light text-[var(--fg)]">{unit}</div>
                    )}
                  </div>
                  <div className="ed-field">
                    <label className="ed-label">Amount Per Unit</label>
                    <input className="ed-input" type="number" step="any" value={customUnitAmount} onChange={(e) => setCustomUnitAmount(e.target.value)} aria-label="Amount per unit" />
                  </div>
                  <div className="ed-field">
                    <label className="ed-label">Grams Per Unit</label>
                    <input className="ed-input" type="number" step="any" placeholder="e.g. 120" value={customUnitGrams} onChange={(e) => setCustomUnitGrams(e.target.value)} aria-label="Grams per unit" />
                    <div className="font-mono text-[9px] text-[var(--muted)] mt-[4px]">e.g. 120 for an average banana</div>
                  </div>
                </div>
              </div>
            )}

            {/* Meal Item Checkbox */}
            <div className="ing-check-row flex items-center gap-[10px] py-[12px]" style={{ marginBottom: 20 }}>
              <input type="checkbox" checked={isMealItem} onChange={(e) => setIsMealItem(e.target.checked)} className="cursor-pointer" id="pf-meal-check" aria-label="Meal item" />
              <label htmlFor="pf-meal-check" className="cursor-pointer">
                <span className="text-[13px] text-[var(--fg)]">This is a standalone item</span>
                <span className="text-[13px] text-[var(--muted)]"> — something eaten directly (apple, glass of wine, granola bar), not a recipe ingredient (flour, salt, butter)</span>
              </label>
            </div>
          </div>

          {/* ── 03 Nutrition ── */}
          <div id="pf-sec-nutrition" style={{ marginTop: 64 }}>
            <div className="flex items-baseline gap-3" style={{ marginBottom: 32 }}>
              <span className="font-mono text-[13px] font-semibold text-[var(--rule)]">03</span>
              <span className="section-label">Nutrition</span>
              <div className="flex-1 h-px bg-[var(--rule)]" />
            </div>

            {/* Basis row */}
            <div className="flex items-center gap-[10px]" style={{ marginBottom: 24 }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Values are per</span>
              <input
                className="ed-input"
                type="number"
                step="any"
                value={specifiedAmount}
                onChange={(e) => setSpecifiedAmount(e.target.value)}
                style={{ width: 80 }}
                aria-label="Reference amount"
              />
              <select
                className="ed-select"
                style={{ width: "auto" }}
                value={specifiedUnit}
                onChange={(e) => setSpecifiedUnit(e.target.value)}
                aria-label="Reference unit"
              >
                <option value="g">g (grams)</option>
                <option value="ml">ml (milliliters)</option>
              </select>
              {volumeNote && (
                <span className="font-mono text-[9px] text-[var(--muted)]">({volumeNote})</span>
              )}
            </div>

            {/* Nutrient grid */}
            {nutrients.length === 0 ? (
              <p className="text-[11px] text-[var(--muted)]">Loading nutrients...</p>
            ) : (
              <div className="ing-nutr-grid grid grid-cols-2 gap-x-[40px]" style={{ marginBottom: 24 }}>
                {nutrients.map((n) => {
                  const inputValue = values[n.id];
                  return (
                    <div key={n.id} className="flex items-center gap-[12px] py-[10px]">
                      <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] w-[120px] shrink-0">{n.displayName}</span>
                      <input
                        className="ed-input flex-1 text-right"
                        type="number"
                        step="any"
                        placeholder="0"
                        value={inputValue != null ? String(inputValue) : ""}
                        onChange={(e) =>
                          setValues((prev) => {
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
            <button className="ed-btn ghost" onClick={() => router.push("/ingredients")} disabled={saving} aria-label="Cancel">Cancel</button>
            <button className="ed-btn primary" onClick={handleCreate} disabled={saving} aria-label="Create ingredient">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
