"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import IngredientContextPanel from "../components/IngredientContextPanel";
import { usePersonContext } from "../components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
import { clientCache } from "@/lib/clientCache";


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
  if (unit === "ml") return parsed; // assume 1 ml = 1 g unless a custom gram mapping is set

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

export default function IngredientsPageWrapper() {
  return (
    <Suspense>
      <IngredientsPage />
    </Suspense>
  );
}

function IngredientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedPerson } = usePersonContext();
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => clientCache.get<Ingredient[]>('/api/ingredients?slim=true') ?? []);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const searchQuery = searchParams?.get("search") || "";
  const [loading, setLoading] = useState(() => !clientCache.get('/api/ingredients?slim=true'));
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);


  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/ingredients?${params.toString()}`);
  };
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("g");
  const [editCustomUnitName, setEditCustomUnitName] = useState("");
  const [editCustomUnitAmount, setEditCustomUnitAmount] = useState("1");
  const [editCustomUnitGrams, setEditCustomUnitGrams] = useState("");
  const [editIsMealItem, setEditIsMealItem] = useState(false);
  const [editSpecifiedAmount, setEditSpecifiedAmount] = useState("100");
  const [editSpecifiedUnit, setEditSpecifiedUnit] = useState("g");
  const [editValues, setEditValues] = useState<Record<number, number>>({});
  const [createName, setCreateName] = useState("");
  const [createUnit, setCreateUnit] = useState("g");
  const [createCustomUnitName, setCreateCustomUnitName] = useState("");
  const [createCustomUnitAmount, setCreateCustomUnitAmount] = useState("1");
  const [createCustomUnitGrams, setCreateCustomUnitGrams] = useState("");
  const [createSpecifiedAmount, setCreateSpecifiedAmount] = useState("100");
  const [createSpecifiedUnit, setCreateSpecifiedUnit] = useState("g");
  const [createIsMealItem, setCreateIsMealItem] = useState(false);
  const [createValues, setCreateValues] = useState<Record<number, number>>({});
  const [usdaLookupQuery, setUsdaLookupQuery] = useState("");
  const [usdaLookupResults, setUsdaLookupResults] = useState<any[]>([]);
  const [usdaLookupLoading, setUsdaLookupLoading] = useState(false);
  const usdaSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [usdaSelectedFood, setUsdaSelectedFood] = useState<any | null>(null);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [saving, setSaving] = useState(false);

  const createBaseUnit = "g";
  const editBaseUnit = "g";
  const createVolumeNote = getVolumeUnitNote(
    createSpecifiedUnit,
    !!createCustomUnitGrams && createCustomUnitName === createSpecifiedUnit
  );
  const editVolumeNote = getVolumeUnitNote(
    editSpecifiedUnit,
    !!editCustomUnitGrams && editCustomUnitName === editSpecifiedUnit
  );

  useEffect(() => {
    const loadIngredients = async () => {
      const cachedIngs = clientCache.get<Ingredient[]>('/api/ingredients?slim=true');
      const cachedNutrients = clientCache.get<unknown[]>('/api/nutrients');

      if (cachedIngs && cachedIngs.length > 0) {
        // Instant render from cache
        setIngredients(cachedIngs);
        if (cachedNutrients) setNutrients(cachedNutrients as never[]);
        const cachedDetail = clientCache.get<Ingredient>(`/api/ingredients/${cachedIngs[0].id}`);
        if (cachedDetail) {
          setSelectedIngredient(cachedDetail);
        } else {
          // Detail not cached — fetch it so we don't land on empty state
          refreshSelectedIngredient(cachedIngs[0].id);
        }
        setLoading(false);
        // Background revalidate list only (nutrients are static — skip)
        fetch("/api/ingredients?slim=true").then(r => r.json()).then((data) => {
          const fresh: Ingredient[] = Array.isArray(data) ? data : [];
          clientCache.set('/api/ingredients?slim=true', fresh);
          setIngredients(fresh);
        }).catch(console.error);
        return;
      }

      // Cache miss — normal loading flow
      try {
        const [data, nutrData] = await Promise.all([
          fetch("/api/ingredients?slim=true").then((r) => r.json()),
          cachedNutrients
            ? Promise.resolve(cachedNutrients)
            : fetch("/api/nutrients").then((r) => r.json()),
        ]);
        const ings: Ingredient[] = Array.isArray(data) ? data : [];
        clientCache.set('/api/ingredients?slim=true', ings);
        if (!cachedNutrients) clientCache.set('/api/nutrients', nutrData);
        setIngredients(ings);
        setNutrients(Array.isArray(nutrData) ? nutrData : []);
        // Auto-select first ingredient before clearing loading — prevents empty-state flash
        if (ings.length > 0) {
          await refreshSelectedIngredient(ings[0].id);
        }
      } catch (e) {
        console.error(e);
        setIngredients([]);
        setNutrients([]);
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!await dialog.confirm(`Delete "${name}"?`, { confirmLabel: "Delete", danger: true })) return;
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      clientCache.delete(`/api/ingredients/${id}`);
      const updated = ingredients.filter(ing => ing.id !== id);
      clientCache.set('/api/ingredients?slim=true', updated);
      if (selectedIngredient?.id === id) {
        setSelectedIngredient(null);
        setEditMode(false);
      }
      setIngredients(updated);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

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

  const handleUsdaSelect = async (food: any) => {
    try {
      // Set the selected food and name
      setUsdaSelectedFood(food);
      setCreateName(food.description);

      // Fetch full food details with nutrients
      const res = await fetch(`/api/usda/fetch/${food.fdcId}`);
      if (res.ok) {
        const foodData = await res.json();

        // Extract nutrient data from USDA
        const nutrientMap: Record<string, number> = {};
        if (foodData.foodNutrients && Array.isArray(foodData.foodNutrients)) {
          foodData.foodNutrients.forEach((fn: any) => {
            const nutrientName = fn.nutrient?.name || "";
            const value = fn.amount; // USDA uses 'amount', not 'value'

            // Map USDA nutrient names to our field names (case-insensitive, flexible matching)
            const lowerName = nutrientName.toLowerCase();
            if (lowerName.includes("energy")) {
              nutrientMap["calories"] = Math.round(value);
            } else if (lowerName.includes("total lipid") || lowerName.includes("total fat")) {
              nutrientMap["fat"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("saturated")) {
              nutrientMap["satFat"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("sodium")) {
              nutrientMap["sodium"] = Math.round(value);
            } else if (lowerName.includes("carbohydrate")) {
              nutrientMap["carbs"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("sugar")) {
              nutrientMap["sugar"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("protein")) {
              nutrientMap["protein"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("fiber")) {
              nutrientMap["fiber"] = Math.round(value * 10) / 10;
            }
          });
        }

        // Ensure we have nutrients loaded, if not fetch them
        let nutrientsList = nutrients;
        if (!nutrientsList || nutrientsList.length === 0) {
          const nutrRes = await fetch("/api/nutrients");
          if (nutrRes.ok) {
            nutrientsList = await nutrRes.json();
          }
        }

        // Map nutrient names to IDs and set values
        const newValues: Record<number, number> = {};
        nutrientsList.forEach((n: any) => {
          if (nutrientMap[n.name] !== undefined) {
            newValues[n.id] = nutrientMap[n.name];
          }
        });
        setCreateValues(newValues);
        console.log("State updated, checking createValues:", newValues);
        setUsdaLookupQuery("");
        setUsdaLookupResults([]);
      }
    } catch (err) {
      console.error("USDA fetch error:", err);
    }
  };

  const handleEditClick = (ing: Ingredient) => {
    setSelectedIngredient(ing);
    setEditMode(true);
    setEditName(ing.name);
    setEditUnit(ing.defaultUnit);
    setEditIsMealItem(Boolean(ing.isMealItem));
    setEditCustomUnitName(
      ing.customUnitName ?? ("tsp" === ing.defaultUnit || "tbsp" === ing.defaultUnit || "cup" === ing.defaultUnit
        ? ing.defaultUnit
        : "")
    );
    setEditCustomUnitAmount(ing.customUnitAmount != null ? String(ing.customUnitAmount) : "1");
    setEditCustomUnitGrams(ing.customUnitGrams != null ? String(ing.customUnitGrams) : "");
    setEditSpecifiedAmount("100");
    setEditSpecifiedUnit(ing.defaultUnit === "ml" ? "ml" : "g");
    const vals: Record<number, number> = {};
    ing.nutrientValues.forEach((nv) => {
      vals[nv.nutrient.id] = nv.value;
    });
    setEditValues(vals);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!selectedIngredient) return;

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
      const normalizedValues = Object.entries(editValues).map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: (Number(value) || 0) * (100 / specAmount),
      }));

      const body: any = {
        name: editName,
        defaultUnit: editUnit,
        isMealItem: editIsMealItem,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName = editUnit === "other" ? editCustomUnitName.trim() : editUnit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(editCustomUnitAmount) || 1;
        body.customUnitGrams = editCustomUnitGrams ? Number(editCustomUnitGrams) : null;
      }

      const res = await fetch(`/api/ingredients/${selectedIngredient.id}`, {
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
      const updatedList = ingredients.map(ing => ing.id === updatedIng.id ? updatedIng : ing);
      clientCache.set('/api/ingredients?slim=true', updatedList);
      setIngredients(updatedList);
      setSelectedIngredient(updatedIng);
      setEditMode(false);
      const savedCount = updatedIng.nutrientValues?.length || 0;
      toast.success(`Ingredient saved${savedCount > 0 ? ` with ${savedCount} nutrient values` : ""}`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSave = async () => {
    if (!createName.trim()) {
      toast.error("Name is required");
      return;
    }

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(createUnit);
    if (isCustomUnit && createUnit === "other" && !createCustomUnitName.trim()) {
      toast.error("Please enter a custom unit name (e.g., 'banana')");
      return;
    }

    setSaving(true);
    try {
      const specAmount = getAmountInGrams(
        createSpecifiedAmount,
        createSpecifiedUnit,
        createCustomUnitName,
        createCustomUnitAmount,
        createCustomUnitGrams
      );
      const normalizedValues = Object.entries(createValues).map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: (Number(value) || 0) * (100 / specAmount),
      }));

      const body: any = {
        name: createName,
        defaultUnit: createUnit,
        isMealItem: createIsMealItem,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName = createUnit === "other" ? createCustomUnitName.trim() : createUnit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(createCustomUnitAmount) || 1;
        body.customUnitGrams = createCustomUnitGrams ? Number(createCustomUnitGrams) : null;
      }

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }

      const newIng = await res.json();
      clientCache.set(`/api/ingredients/${newIng.id}`, newIng);
      const updatedList = [...ingredients, newIng].sort((a, b) => a.name.localeCompare(b.name));
      clientCache.set('/api/ingredients?slim=true', updatedList);
      setIngredients(updatedList);
      setSelectedIngredient(newIng);
      setCreateMode(false);
      setCreateName("");
      setCreateUnit("g");
      setCreateCustomUnitName("");
      setCreateCustomUnitAmount("1");
      setCreateCustomUnitGrams("");
      setCreateSpecifiedAmount("100");
      setCreateSpecifiedUnit("g");
      setCreateIsMealItem(false);
      setCreateValues({});
      toast.success(`${newIng.name} added`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to create: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredIngredients = ingredients.filter((ing) =>
    searchQuery ? ing.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const refreshSelectedIngredient = async (id: number) => {
    // Instant render from cache if available
    const cached = clientCache.get<Ingredient>(`/api/ingredients/${id}`);
    if (cached) { setSelectedIngredient(cached); return; }
    try {
      const res = await fetch(`/api/ingredients/${id}`);
      if (res.ok) {
        const updated = await res.json();
        clientCache.set(`/api/ingredients/${id}`, updated);
        setSelectedIngredient(updated);
      }
    } catch (err) {
      console.error("Failed to refresh ingredient:", err);
    }
  };

  /* ── Shared input/select style for forms ── */
  const inputBase =
    "bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--rule-strong)] transition-colors";
  const inputClass = inputBase + " w-full";
  const inputNarrow = inputBase + " w-[120px]";
  const selectClass =
    "bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--rule-strong)] appearance-none transition-colors w-full";
  const labelClass = "block text-[9px] font-mono tracking-[0.1em] uppercase text-[var(--muted)] mb-[6px]";
  const sectionLabelClass =
    "font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mt-4 mb-[10px]";

  /* ── Helper: unit select dropdown SVG ── */
  const selectBgStyle = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 0px center",
    backgroundSize: "12px",
  };

  /* ── Unified Form JSX ── */
  const renderForm = (mode: 'create' | 'edit') => {
    const isCreate = mode === 'create';
    const name = isCreate ? createName : editName;
    const setName = isCreate ? setCreateName : setEditName;
    const unit = isCreate ? createUnit : editUnit;
    const setUnit = isCreate ? setCreateUnit : setEditUnit;
    const customUnitName = isCreate ? createCustomUnitName : editCustomUnitName;
    const setCustomUnitName = isCreate ? setCreateCustomUnitName : setEditCustomUnitName;
    const customUnitAmount = isCreate ? createCustomUnitAmount : editCustomUnitAmount;
    const setCustomUnitAmount = isCreate ? setCreateCustomUnitAmount : setEditCustomUnitAmount;
    const customUnitGrams = isCreate ? createCustomUnitGrams : editCustomUnitGrams;
    const setCustomUnitGrams = isCreate ? setCreateCustomUnitGrams : setEditCustomUnitGrams;
    const isMealItem = isCreate ? createIsMealItem : editIsMealItem;
    const setIsMealItem = isCreate ? setCreateIsMealItem : setEditIsMealItem;
    const specifiedAmount = isCreate ? createSpecifiedAmount : editSpecifiedAmount;
    const setSpecifiedAmount = isCreate ? setCreateSpecifiedAmount : setEditSpecifiedAmount;
    const specifiedUnit = isCreate ? createSpecifiedUnit : editSpecifiedUnit;
    const setSpecifiedUnit = isCreate ? setCreateSpecifiedUnit : setEditSpecifiedUnit;
    const values = isCreate ? createValues : editValues;
    const setValues = isCreate ? setCreateValues : setEditValues;
    const baseUnit = isCreate ? createBaseUnit : editBaseUnit;
    const volumeNote = isCreate ? createVolumeNote : editVolumeNote;
    const onSave = isCreate ? handleCreateSave : handleSave;
    const onCancel = isCreate ? () => setCreateMode(false) : () => setEditMode(false);
    const title = isCreate ? "New Ingredient" : "Edit Ingredient";
    const subtitle = "";
    const saveLabel = isCreate ? "Create" : "Save";
    const savingLabel = isCreate ? "Creating..." : "Saving...";

    const handleUsdaSelectForMode = async (food: any) => {
      try {
        setUsdaSelectedFood(food);
        setName(food.description);

        const res = await fetch(`/api/usda/fetch/${food.fdcId}`);
        if (res.ok) {
          const foodData = await res.json();

          const nutrientMap: Record<string, number> = {};
          if (foodData.foodNutrients && Array.isArray(foodData.foodNutrients)) {
            foodData.foodNutrients.forEach((fn: any) => {
              const nutrientName = fn.nutrient?.name || "";
              const value = fn.amount;
              const lowerName = nutrientName.toLowerCase();
              if (lowerName.includes("energy")) {
                nutrientMap["calories"] = Math.round(value);
              } else if (lowerName.includes("total lipid") || lowerName.includes("total fat")) {
                nutrientMap["fat"] = Math.round(value * 10) / 10;
              } else if (lowerName.includes("saturated")) {
                nutrientMap["satFat"] = Math.round(value * 10) / 10;
              } else if (lowerName.includes("sodium")) {
                nutrientMap["sodium"] = Math.round(value);
              } else if (lowerName.includes("carbohydrate")) {
                nutrientMap["carbs"] = Math.round(value * 10) / 10;
              } else if (lowerName.includes("sugar")) {
                nutrientMap["sugar"] = Math.round(value * 10) / 10;
              } else if (lowerName.includes("protein")) {
                nutrientMap["protein"] = Math.round(value * 10) / 10;
              } else if (lowerName.includes("fiber")) {
                nutrientMap["fiber"] = Math.round(value * 10) / 10;
              }
            });
          }

          let nutrientsList = nutrients;
          if (!nutrientsList || nutrientsList.length === 0) {
            const nutrRes = await fetch("/api/nutrients");
            if (nutrRes.ok) {
              nutrientsList = await nutrRes.json();
            }
          }

          const newValues: Record<number, number> = {};
          nutrientsList.forEach((n: any) => {
            if (nutrientMap[n.name] !== undefined) {
              newValues[n.id] = nutrientMap[n.name];
            }
          });
          setValues(newValues);
          setUsdaLookupQuery("");
          setUsdaLookupResults([]);
        }
      } catch (err) {
        console.error("USDA fetch error:", err);
      }
    };

    return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Sticky header with title + actions */}
      <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0 flex items-start justify-between">
        <h1 className="font-serif text-[20px] text-[var(--fg)] leading-tight">{title}</h1>
        <div className="flex items-center gap-3">
          <button
            className="bg-[var(--accent)] text-[var(--accent-text)] py-[6px] px-4 text-[9px] font-mono tracking-[0.1em] uppercase border-0 cursor-pointer disabled:opacity-50 hover:bg-[var(--accent-hover)] transition-colors"
            onClick={onSave}
            disabled={saving}
            aria-label={saveLabel}
          >
            {saving ? savingLabel : saveLabel}
          </button>
          <button
            className="bg-transparent text-[var(--muted)] py-[6px] px-0 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer disabled:opacity-50"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 px-7">

      <div className="space-y-5 max-w-[720px]">
        {/* USDA Lookup */}
        <div>
          <label className={labelClass}>Search USDA (Optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g., 'almonds raw' or 'banana'"
            value={usdaLookupQuery}
            onChange={(e) => handleUsdaSearch(e.target.value)}
          />
        </div>

        {/* USDA Results */}
        {usdaLookupLoading && (
          <p className="text-[11px] text-[var(--muted)]">Searching USDA...</p>
        )}
        {usdaLookupResults.length > 0 && (
          <div className="border border-[var(--rule)] rounded-[var(--radius-sm,4px)] max-h-48 overflow-y-auto">
            {usdaLookupResults.map((food: any) => (
              <button
                key={food.fdcId}
                onClick={() => handleUsdaSelectForMode(food)}
                className="block w-full text-left py-[8px] px-[12px] text-[11px] text-[var(--fg)] hover:bg-[var(--bg-subtle)] border-b border-[var(--rule)] last:border-b-0 cursor-pointer bg-transparent transition-colors"
              >
                <div className="font-sans text-[11px]">{food.description.slice(0, 60)}</div>
                <div className="text-[10px] text-[var(--muted)]">{food.dataType}</div>
              </button>
            ))}
          </div>
        )}

        {/* Selected USDA Food Indicator */}
        {usdaSelectedFood && (
          <p className="text-[11px] text-[var(--accent)]">Data imported from USDA FDC</p>
        )}

        {/* Name */}
        <div>
          <label className={labelClass}>Ingredient name</label>
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Default Unit */}
        <div>
          <label className={labelClass}>Default Unit</label>
          <select
            className={selectClass}
            style={selectBgStyle}
            value={unit}
            onChange={(e) => {
              const nextUnit = e.target.value;
              setUnit(nextUnit);
              if (
                nextUnit === "g" ||
                nextUnit === "ml" ||
                nextUnit === "tsp" ||
                nextUnit === "tbsp" ||
                nextUnit === "cup"
              ) {
                setSpecifiedUnit(nextUnit);
              }
              if (nextUnit === "tsp" || nextUnit === "tbsp" || nextUnit === "cup") {
                setCustomUnitName(nextUnit);
              }
            }}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="tsp">tsp (teaspoon)</option>
            <option value="tbsp">tbsp (tablespoon)</option>
            <option value="cup">cup</option>
            <option value="other">other (custom unit)</option>
          </select>
        </div>

        {/* Custom Unit Settings */}
        {["other", "tsp", "tbsp", "cup"].includes(unit) && (
          <div className="border border-[var(--rule)] rounded-md p-4 space-y-4">
            <div className={sectionLabelClass}>Custom Unit Settings</div>
            <div>
              <label className={labelClass}>Unit name</label>
              {unit === "other" ? (
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., banana, scoop, cup"
                  value={customUnitName}
                  onChange={(e) => setCustomUnitName(e.target.value)}
                />
              ) : (
                <div className="py-[6px] font-mono text-[12px] font-light text-[var(--fg)]">
                  {unit}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Amount per unit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  className={inputNarrow}
                  value={customUnitAmount}
                  onChange={(e) => setCustomUnitAmount(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">
                  {customUnitName || "unit"}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Grams per unit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  className={inputNarrow}
                  placeholder="e.g., 120 for an average banana"
                  value={customUnitGrams}
                  onChange={(e) => setCustomUnitGrams(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">g</span>
              </div>
            </div>
          </div>
        )}

        {/* Meal Item Checkbox */}
        <div className="border border-[var(--rule)] rounded-[var(--radius-sm,4px)] p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMealItem}
              onChange={(e) => setIsMealItem(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--fg)]">This is a meal item</span>
          </label>
          <p className="text-[10px] text-[var(--muted)] mt-1 ml-5">
            Check this for foods you eat directly (fish, apple, chicken) but not for recipe ingredients (flour, salt, butter)
          </p>
        </div>

        {/* Specified amount for nutrient entry */}
        <div>
          <div className={sectionLabelClass}>Nutrient Basis</div>
          <label className={labelClass}>What amount are these nutrients for?</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="any"
              className={inputNarrow}
              placeholder="100"
              value={specifiedAmount}
              onChange={(e) => setSpecifiedAmount(e.target.value)}
            />
            <select
              className={selectClass.replace('w-full', 'w-[140px]')}
              style={selectBgStyle}
              value={specifiedUnit}
              onChange={(e) => setSpecifiedUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="tsp">tsp (teaspoon)</option>
              <option value="tbsp">tbsp (tablespoon)</option>
              <option value="cup">cup</option>
            </select>
            <div className="text-[10px] text-[var(--muted)] whitespace-nowrap">
              {specifiedAmount && specifiedUnit && specifiedAmount !== "100"
                ? `Will convert to per 100${baseUnit}`
                : `Per 100${baseUnit}`}
              {volumeNote ? ` (${volumeNote})` : ""}
            </div>
          </div>
        </div>

        {/* Nutrient Values */}
        <div>
          <div className={sectionLabelClass}>
            Nutrient Values (per 100{baseUnit})
            <span className="ml-2 normal-case tracking-normal">
              {Object.keys(values).length} filled
            </span>
          </div>
          {nutrients.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">Loading nutrients...</p>
          ) : (
            <div className="space-y-4">
              {nutrients.map((n) => {
                const inputValue = values[n.id];
                return (
                  <div key={n.id}>
                    <label className={labelClass}>{n.displayName} ({n.unit})</label>
                    <input
                      type="number"
                      step="any"
                      className={inputClass}
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
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
    </div>
    );
  };

  /* ── Detail Panel JSX (right side of split) ── */
  const renderDetailPanel = () => {
    if (!selectedIngredient) return null;
    const ing = selectedIngredient;
    const unitDisplay = ing.customUnitName && ing.customUnitGrams
      ? `${ing.customUnitAmount || 1} ${ing.customUnitName} = ${ing.customUnitGrams}g`
      : ing.customUnitName && ing.customUnitAmount
      ? `${ing.customUnitAmount} ${ing.customUnitName}`
      : ing.defaultUnit;

    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Sticky header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight mb-1">{ing.name}</h2>
            <p className="font-mono text-[10px] text-[var(--muted)]">
              {unitDisplay}
              {ing.isMealItem ? " · Meal item" : ""}
            </p>
          </div>
          <div className="flex gap-[5px] shrink-0 ml-4 mt-1">
            <button
              onClick={() => handleEditClick(ing)}
              className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors rounded-sm"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(ing.id, ing.name)}
              className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-[var(--error-light)] text-[var(--error)] cursor-pointer hover:bg-[var(--error)] hover:text-white transition-colors rounded-sm"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
          <div className={sectionLabelClass}>Nutrition per 100g</div>
          {ing.nutrientValues.length > 0 ? (
            <div className="space-y-0">
              {ing.nutrientValues.map((nv, idx) => (
                <div key={nv.id} className={`flex justify-between items-baseline py-[7px] ${idx < ing.nutrientValues.length - 1 ? 'border-b border-[var(--rule)]' : ''}`}>
                  <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--muted)]">{nv.nutrient.displayName}</span>
                  <span className="font-mono text-[11px] text-[var(--fg)] tabular-nums">{formatNutrient(nv.value)} {nv.nutrient.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)]">No nutrient data</p>
          )}
        </div>
      </div>
    );
  };

  /* ── Main Return ── */

  // Edit mode: rendered inline in the detail panel below

  // List + optional detail split
  const hasSplit = !!selectedIngredient;

  return (
    <div className="flex h-full">
      {/* ── Left: List pane with integrated header ── */}
      <div className="w-[220px] min-w-[220px] flex flex-col border-r border-[var(--rule)]">
        {/* List header */}
        <div className="px-[14px] pt-3 pb-[10px] border-b border-[var(--rule)] shrink-0">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--fg)] leading-none">Ingredients</h1>
            <span className="font-mono text-[9px] text-[var(--muted)] bg-[var(--bg-subtle)] py-[2px] px-[6px] rounded-[var(--radius-xs,2px)]">{filteredIngredients.length}</span>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => updateSearchParam("search", e.target.value)}
            aria-label="Search ingredients"
            className="w-full bg-[var(--bg-subtle)] border border-[var(--rule)] rounded-[var(--radius-sm,4px)] py-[7px] px-[10px] text-[11px] font-sans text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-[11px] text-[var(--muted)]">Loading...</div>
          ) : filteredIngredients.length === 0 ? (
            <div className="py-8 px-4 text-center text-[11px] text-[var(--muted)]">
              {ingredients.length === 0 ? 'No ingredients yet' : 'No matches'}
            </div>
          ) : (
            filteredIngredients.map((ing) => {
              const isSelected = selectedIngredient?.id === ing.id;
              return (
                <div
                  key={ing.id}
                  className={`flex items-center justify-between py-[10px] px-[14px] border-b border-[var(--rule)] cursor-pointer transition-[background] duration-[80ms] ease-in-out ${
                    isSelected ? "bg-[var(--bg-selected)]" : "hover:bg-[var(--bg-subtle)]"
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedIngredient(null);
                    } else {
                      setEditMode(false);
                      refreshSelectedIngredient(ing.id);
                    }
                  }}
                >
                  <span className="text-[12px] font-medium text-[var(--fg)] truncate">
                    {ing.name}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* New ingredient button at bottom */}
        <button
          onClick={() => { setSelectedIngredient(null); setCreateMode(true); }}
          aria-label="Create new ingredient"
          className="shrink-0 w-full py-[10px] px-[14px] font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 border-t border-[var(--rule)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors text-left rounded-none"
        >
          + New Ingredient
        </button>
      </div>

      {/* ── Center + Right: Detail + Context ── */}
      {createMode ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderForm('create')}
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading ingredients...</div>
        </div>
      ) : !selectedIngredient ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-[280px]">
            <div className="font-serif text-[20px] text-[var(--fg)]">
              {ingredients.length === 0 ? 'No ingredients yet' : 'Select an ingredient'}
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {ingredients.length === 0
                ? 'Add your first ingredient manually or look it up from the USDA database.'
                : 'Click an ingredient from the list to view its details.'}
            </p>
            {ingredients.length === 0 && (
              <button
                onClick={() => { setSelectedIngredient(null); setCreateMode(true); }}
                className="bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors border-0 cursor-pointer"
                aria-label="Add first ingredient"
              >
                + New Ingredient
              </button>
            )}
          </div>
        </div>
      ) : (
        <>

          {/* Detail Panel or Edit Form (center pane) */}
          {editMode ? renderForm('edit') : renderDetailPanel()}

          {/* Context Panel — right pane with goals % bars */}
          {!editMode && (
            <div className="panel-slide-in w-[300px] min-w-[300px] h-full border-l border-[var(--rule)]">
              <IngredientContextPanel
                nutrientValues={selectedIngredient.nutrientValues}
                defaultUnit={selectedIngredient.defaultUnit}
                customUnitName={selectedIngredient.customUnitName}
                customUnitAmount={selectedIngredient.customUnitAmount}
                customUnitGrams={selectedIngredient.customUnitGrams}
                personId={selectedPerson?.id}
                personName={selectedPerson?.name}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
