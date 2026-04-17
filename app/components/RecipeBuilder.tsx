"use client";

import { Dispatch, SetStateAction, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { convertToGrams, getIngredientDensity } from "../../lib/unitConversion";
import { USDA_BASE_GRAMS } from "@/lib/constants";
import { clientCache } from "@/lib/clientCache";
import CreateIngredientModal from "./CreateIngredientModal";
import { toast } from "@/lib/toast";
import ContextualTip from "./ContextualTip";
import { createClient } from "@/lib/supabase/client";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Nutrient, Goal } from "@/types";
type Ingredient = {
  id: number;
  name: string;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  nutrientValues: { id: number; value: number; nutrient: Nutrient }[]
};

type Row = { id: string; ingredientId?: number; quantity?: number; unit?: string; notes?: string; nameGuess?: string; section?: string | null };

type InitialRecipe = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions?: string;
  tags?: string | string[];
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  ingredients: Array<{
    id: string;
    ingredientId?: number | null;
    quantity?: number;
    unit?: string;
    notes?: string | null;
    nameGuess?: string;
    section?: string | null;
  }>;
  sourceApp?: string | null;
  isComplete?: boolean;
};

export type RecipeBuilderHandle = { save: () => void };

// ── Sortable ingredient row ──────────────────────────────────────────────────
type SortableIngredientRowProps = {
  row: Row; index: number; rows: Row[]; ingredients: Ingredient[];
  searchText: Record<string, string>; showDropdown: Record<string, boolean>;
  quantityText: Record<string, string>; editingSectionRowId: string | null;
  editingSectionText: string;
  setSearchText: Dispatch<SetStateAction<Record<string, string>>>;
  setShowDropdown: Dispatch<SetStateAction<Record<string, boolean>>>;
  setQuantityText: Dispatch<SetStateAction<Record<string, string>>>;
  setRows: Dispatch<SetStateAction<Row[]>>;
  setEditingSectionRowId: Dispatch<SetStateAction<string | null>>;
  setEditingSectionText: Dispatch<SetStateAction<string>>;
  updateRow: (id: string, patch: Partial<Row>) => void;
  commitSection: (rowId: string) => void;
  removeSectionFromRow: (rowId: string) => void;
  createIngredient: (name: string, rowId: string) => void;
};

function SortableIngredientRow({
  row, index, rows, ingredients,
  searchText, showDropdown, quantityText,
  editingSectionRowId, editingSectionText,
  setSearchText, setShowDropdown, setQuantityText,
  setRows, setEditingSectionRowId, setEditingSectionText,
  updateRow, commitSection, removeSectionFromRow, createIngredient,
}: SortableIngredientRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const prevSection = index > 0 ? rows[index - 1].section : null;
  const showSectionHeader = row.section && row.section !== prevSection;
  const selectedIngredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) : undefined;
  const defaultUnitForRow = selectedIngredient?.customUnitName || selectedIngredient?.defaultUnit || "g";
  const rawSearch = searchText[row.id] || "";
  const currentSearch = rawSearch
    .replace(/\(\([^)]*\)\)/g, "").replace(/\([^)]*note[^)]*\)/gi, "").replace(/\([^)]*\*[^)]*\)/g, "")
    .replace(/\s{2,}/g, " ").trim() || rawSearch;
  const filteredIngredients = currentSearch
    ? ingredients.filter((i) => i.name.toLowerCase().includes(currentSearch.toLowerCase()))
    : ingredients;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {editingSectionRowId === row.id && !showSectionHeader && (
        <div className="flex items-center gap-2" style={{ padding: "10px 0 6px", borderBottom: "1px solid var(--rule)" }}>
          <input autoFocus className="flex-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg)] bg-transparent border-0 px-0 py-0 focus:outline-none"
            placeholder="Section name..." value={editingSectionText}
            onChange={(e) => setEditingSectionText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitSection(row.id); if (e.key === "Escape") setEditingSectionRowId(null); }}
            onBlur={() => commitSection(row.id)} aria-label="Section name" />
        </div>
      )}
      {showSectionHeader && (
        <div className="flex items-center gap-2" style={{ padding: "10px 0 6px", borderBottom: "1px solid var(--rule)" }}>
          {editingSectionRowId === row.id ? (
            <input autoFocus className="flex-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg)] bg-transparent border-0 px-0 py-0 focus:outline-none"
              placeholder="Section name..." value={editingSectionText}
              onChange={(e) => setEditingSectionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSection(row.id); if (e.key === "Escape") setEditingSectionRowId(null); }}
              onBlur={() => commitSection(row.id)} aria-label="Edit section name" />
          ) : (
            <button type="button" className="flex-1 text-left font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] font-medium hover:text-[var(--fg)] cursor-pointer bg-transparent border-0 p-0"
              onClick={() => { setEditingSectionRowId(row.id); setEditingSectionText(row.section || ""); }}
              aria-label={`Edit section: ${row.section}`}>{row.section}</button>
          )}
          <button type="button" className="text-[16px] text-[var(--muted)] hover:text-[var(--err)] bg-transparent border-0 cursor-pointer flex items-center justify-center transition-colors"
            style={{ width: 28, height: 28, marginLeft: "auto" }}
            onClick={() => removeSectionFromRow(row.id)} aria-label="Remove section header">×</button>
        </div>
      )}
      <div className="flex items-start gap-[10px] transition" style={{ padding: "8px 0" }}>
        <div className="shrink-0 flex items-center cursor-grab active:cursor-grabbing text-[var(--rule)] hover:text-[var(--muted)] transition-colors"
          style={{ paddingTop: 8 }}
          role="button" tabIndex={0} aria-label="Drag to reorder ingredient" {...listeners}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </div>
        <div className="relative" style={{ flex: 1 }}>
          <input type="text"
            className={`ed-input ${!selectedIngredient && row.nameGuess && !currentSearch ? '!border-[var(--warn)] !text-[var(--warn)]' : ''}`}
            placeholder="Ingredient name"
            value={selectedIngredient ? selectedIngredient.name : rawSearch}
            onChange={(e) => {
              setSearchText((prev) => ({ ...prev, [row.id]: e.target.value }));
              setShowDropdown((prev) => ({ ...prev, [row.id]: true }));
              if (row.ingredientId) updateRow(row.id, { ingredientId: undefined });
            }}
            onFocus={() => setShowDropdown((prev) => ({ ...prev, [row.id]: true }))}
            onBlur={() => { setTimeout(() => { setShowDropdown((prev) => ({ ...prev, [row.id]: false })); }, 150); }}
            aria-label={`Ingredient ${index + 1} name`} />
          {showDropdown[row.id] && currentSearch && (
            <div className="absolute z-10 w-full mt-1 border border-[var(--rule)] bg-[var(--bg)] max-h-48 overflow-auto" style={{ boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
              {currentSearch && !ingredients.some((i) => i.name.toLowerCase() === currentSearch.toLowerCase()) && (
                <div className="px-3 py-2 hover:bg-[var(--bg-2)] cursor-pointer text-[13px] border-b border-[var(--rule)] text-[var(--fg)] font-medium"
                  onMouseDown={(e) => { e.preventDefault(); createIngredient(currentSearch, row.id); }}>
                  + Create new ingredient: &ldquo;{currentSearch}&rdquo;
                </div>
              )}
              {filteredIngredients.map((i) => (
                <div key={i.id} className="px-3 py-2 hover:bg-[var(--bg-2)] cursor-pointer text-[13px]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const defaultUnit = i.customUnitName || i.defaultUnit || "g";
                    updateRow(row.id, { ingredientId: i.id, unit: row.unit || defaultUnit });
                    setSearchText((prev) => ({ ...prev, [row.id]: "" }));
                    setShowDropdown((prev) => ({ ...prev, [row.id]: false }));
                  }}>
                  <div>{i.name}{i.customUnitName ? ` (${i.customUnitName})` : ""}</div>
                  {i.nutrientValues.length > 0 && (() => {
                    const kcalNv = i.nutrientValues.find((v) => v.nutrient.displayName.toLowerCase().includes("energy") || v.nutrient.displayName.toLowerCase().includes("calorie"));
                    return kcalNv ? <div className="font-mono text-[9px] text-[var(--muted)]">{Math.round(kcalNv.value)} kcal / 100g</div> : null;
                  })()}
                </div>
              ))}
              {filteredIngredients.length === 0 && ingredients.some((i) => i.name.toLowerCase() === currentSearch.toLowerCase()) && (
                <div className="px-3 py-2 text-[13px] text-[var(--muted)]">No matching ingredients</div>
              )}
            </div>
          )}
          {!selectedIngredient && row.nameGuess && (
            <div className="flex items-center gap-[6px]" style={{ padding: "2px 0" }}>
              <span className="font-mono text-[9px] text-[var(--warn)]">Not in library —</span>
              <button type="button" onClick={() => createIngredient(currentSearch || row.nameGuess!, row.id)}
                className="font-mono text-[9px] text-[var(--accent)] underline bg-transparent border-0 p-0 cursor-pointer">
                Add to library
              </button>
            </div>
          )}
          <input
            type="text"
            className="ed-input"
            style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}
            placeholder="Preparation (optional) — e.g. finely diced"
            value={row.notes ?? ""}
            onChange={(e) => updateRow(row.id, { notes: e.target.value || undefined })}
            aria-label={`Ingredient ${index + 1} preparation notes`}
          />
        </div>
        <input className="ed-input" style={{ width: 70 }} type="text" inputMode="decimal" placeholder="Qty"
          value={quantityText[row.id] ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setQuantityText((prev) => ({ ...prev, [row.id]: val }));
            if (val === "") { updateRow(row.id, { quantity: undefined }); }
            else { const numVal = parseFloat(val); if (!isNaN(numVal) && numVal >= 0) updateRow(row.id, { quantity: numVal }); }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val !== "") {
              const numVal = parseFloat(val);
              if (!isNaN(numVal) && numVal >= 0) setQuantityText((prev) => ({ ...prev, [row.id]: String(numVal) }));
              else { setQuantityText((prev) => ({ ...prev, [row.id]: "" })); updateRow(row.id, { quantity: undefined }); }
            }
          }}
          aria-label={`Ingredient ${index + 1} quantity`} />
        <select className="ed-select" style={{ width: 80 }} value={row.unit ?? defaultUnitForRow}
          onChange={(e) => updateRow(row.id, { unit: e.target.value })} aria-label={`Ingredient ${index + 1} unit`}>
          <optgroup label="Weight"><option value="g">g</option><option value="oz">oz</option><option value="lb">lb</option><option value="kg">kg</option></optgroup>
          <optgroup label="Volume"><option value="ml">ml</option><option value="l">l</option><option value="tsp">tsp</option><option value="tbsp">tbsp</option><option value="cup">cup</option><option value="fl-oz">fl oz</option></optgroup>
          {selectedIngredient?.customUnitName && (
            <optgroup label="Custom"><option value={selectedIngredient.customUnitName}>{selectedIngredient.customUnitName}</option></optgroup>
          )}
        </select>
        <button className="text-[16px] text-[var(--muted)] hover:text-[var(--err)] bg-transparent border-0 cursor-pointer flex items-center justify-center transition-colors"
          style={{ width: 28, height: 28, marginTop: 2 }}
          onClick={() => setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === row.id);
            const removedSection = prev[idx]?.section;
            const ps = idx > 0 ? prev[idx - 1]?.section : null;
            const isLeader = removedSection && removedSection !== ps;
            const next = prev.filter((r) => r.id !== row.id);
            if (isLeader && idx < next.length && (!next[idx].section || next[idx].section === removedSection)) {
              next[idx] = { ...next[idx], section: removedSection };
            }
            return next;
          })}
          aria-label="Remove ingredient">×</button>
      </div>
    </div>
  );
}

// ── Sortable step row ────────────────────────────────────────────────────────
function SortableStepRow({ id, idx, step, onChangeStep, onRemoveStep }: {
  id: string; idx: number; step: string;
  onChangeStep: (idx: number, value: string) => void;
  onRemoveStep: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={{ ...style, padding: "8px 0" }} className="flex items-start gap-[10px]" {...attributes}>
      <div className="shrink-0 flex items-center cursor-grab active:cursor-grabbing text-[var(--rule)] hover:text-[var(--muted)] transition-colors"
        style={{ paddingTop: 10 }} role="button" tabIndex={0} aria-label={`Drag to reorder step ${idx + 1}`} {...listeners}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      </div>
      <textarea className="flex-1 font-sans text-[13px] text-[var(--fg)] bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 outline-none resize-none transition-[border-color] duration-200 focus:border-[var(--accent)]"
        style={{ minHeight: 40 }} rows={2} placeholder={`Step ${idx + 1}…`} value={step}
        onChange={(e) => onChangeStep(idx, e.target.value)} aria-label={`Step ${idx + 1}`} />
      <button className="text-[16px] text-[var(--muted)] hover:text-[var(--err)] bg-transparent border-0 cursor-pointer flex items-center justify-center transition-colors shrink-0"
        style={{ width: 28, height: 28, paddingTop: 2 }}
        onClick={() => onRemoveStep(idx)} aria-label={`Remove step ${idx + 1}`}>×</button>
    </div>
  );
}

type Person = { id: number; name: string };

const RecipeBuilder = forwardRef<RecipeBuilderHandle, {
  initialRecipe?: InitialRecipe;
  onSaved?: () => void;
  onCancel?: () => void;
  hideFooterButtons?: boolean;
}>(function RecipeBuilder({
  initialRecipe,
  onSaved,
  onCancel,
  hideFooterButtons,
}, ref) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("servings");
  const [instructions, setInstructions] = useState("");
  const [steps, setSteps] = useState<string[]>(["", "", ""]);
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [sourceApp, setSourceApp] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [rows, setRows] = useState<Row[]>([{ id: "r1" }]);
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedPersonId, setGuidedPersonId] = useState<number | null>(null);
  const [guidedFocus, setGuidedFocus] = useState<number[]>([]);
  const [focusCaps, setFocusCaps] = useState<Record<number, string>>({});
  const [persons, setPersons] = useState<Person[]>([]);
  const [personGoals, setPersonGoals] = useState<Goal[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});
  const [quantityText, setQuantityText] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState<number | null>(null);
  const [sourceRowId, setSourceRowId] = useState<string | null>(null);
  const [editingSectionRowId, setEditingSectionRowId] = useState<string | null>(null);
  const [editingSectionText, setEditingSectionText] = useState("");

  const availableTags = ["breakfast", "lunch", "dinner", "side", "snack", "dessert", "beverage"];

  useEffect(() => {
    const cachedIngredients = clientCache.get<Ingredient[]>("/api/ingredients");
    if (cachedIngredients) setIngredients(cachedIngredients);
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((d) => { const list = Array.isArray(d) ? d : []; clientCache.set("/api/ingredients", list); setIngredients(list); })
      .catch((e) => { console.error(e); if (!cachedIngredients) setIngredients([]); });

    const cachedNutrients = clientCache.get<Nutrient[]>("/api/nutrients");
    if (cachedNutrients) setNutrients(cachedNutrients);
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => { const list = Array.isArray(d) ? d : []; clientCache.set("/api/nutrients", list); setNutrients(list); })
      .catch((e) => { console.error(e); if (!cachedNutrients) setNutrients([]); });
    fetch("/api/persons")
      .then((r) => r.json())
      .then((d) => setPersons(Array.isArray(d?.persons) ? d.persons : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!guidedPersonId) { setPersonGoals([]); setGuidedFocus([]); setFocusCaps({}); return; }
    fetch(`/api/persons/${guidedPersonId}/goals`)
      .then((r) => r.json())
      .then((d) => setPersonGoals(Array.isArray(d) ? d : []))
      .catch(() => setPersonGoals([]));
  }, [guidedPersonId]);

  useEffect(() => {
    if (!initialRecipe) return;

    setName(initialRecipe.name || "");
    setServings(Number(initialRecipe.servingSize) || 1);
    setServingUnit(initialRecipe.servingUnit || "servings");
    setInstructions(initialRecipe.instructions || "");
    const parsed = (initialRecipe.instructions || "").split("\n").filter((s) => s.trim());
    setSteps(parsed.length > 0 ? parsed : ["", "", ""]);
    setPrepTime(initialRecipe.prepTime != null ? String(initialRecipe.prepTime) : "");
    setCookTime(initialRecipe.cookTime != null ? String(initialRecipe.cookTime) : "");
    setSourceApp(initialRecipe.sourceApp ?? "");
    setImage(initialRecipe.image ?? "");

    const nextTags = Array.isArray(initialRecipe.tags)
      ? initialRecipe.tags
      : typeof initialRecipe.tags === "string"
        ? initialRecipe.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    setTags(nextTags);

    const nextRows = (initialRecipe.ingredients || []).map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId ?? undefined,
      quantity: item.quantity ?? undefined,
      unit: item.unit ?? undefined,
      notes: item.notes ?? undefined,
      nameGuess: item.nameGuess ?? undefined,
      section: item.section ?? null,
    }));

    setRows(nextRows.length > 0 ? nextRows : [{ id: "r1" }]);

    // Initialize quantity text values
    const nextQuantityText: Record<string, string> = {};
    nextRows.forEach((item) => {
      if (item.quantity !== undefined) {
        nextQuantityText[item.id] = String(parseFloat((item.quantity).toFixed(2)));
      }
    });
    setQuantityText(nextQuantityText);

    // Pre-fill search text for unmatched imported rows — clean footnote markers and leading qty/unit
    const cleanGuess = (s: string) => s
      .replace(/\(\([^)]*\)\)/g, "")
      .replace(/\([^)]*note[^)]*\)/gi, "")
      .replace(/\([^)]*\*[^)]*\)/g, "")
      // Strip leading quantity + unit, e.g. "1/4 cup ", "2 tbsp ", "1.5 oz "
      .replace(/^\d+(?:\/\d+)?(?:\.\d+)?\s+(?:cups?|tbsp?|tsp?|oz|ml|g|kg|lb|lbs|fl\.?\s*oz|pints?|quarts?|gallons?|pieces?|slices?|cans?|cloves?|stalks?|sprigs?|pinch|dash|handful)\s+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const nextSearchText: Record<string, string> = {};
    nextRows.forEach((item) => {
      if (item.nameGuess) {
        nextSearchText[item.id] = cleanGuess(item.nameGuess) || item.nameGuess;
      }
    });
    setSearchText(nextSearchText);
  }, [initialRecipe]);

  function addRow() {
    setRows((s) => [...s, { id: `r${Date.now()}` }]);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function commitSection(rowId: string) {
    const trimmed = editingSectionText.trim();
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;
      const updated = [...prev];
      if (trimmed) {
        // Set section on this row; subsequent rows with same old section follow
        const oldSection = updated[idx].section;
        for (let i = idx; i < updated.length; i++) {
          if (i === idx || updated[i].section === oldSection) {
            updated[i] = { ...updated[i], section: trimmed };
          } else break;
        }
      } else {
        // Empty = remove: merge into previous section
        const prevSection = idx > 0 ? updated[idx - 1].section : null;
        const oldSection = updated[idx].section;
        for (let i = idx; i < updated.length; i++) {
          if (i === idx || updated[i].section === oldSection) {
            updated[i] = { ...updated[i], section: prevSection };
          } else break;
        }
      }
      return updated;
    });
    setEditingSectionRowId(null);
    setEditingSectionText("");
  }

  function removeSectionFromRow(rowId: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;
      const prevSection = idx > 0 ? prev[idx - 1].section : null;
      const oldSection = prev[idx].section;
      const updated = [...prev];
      for (let i = idx; i < updated.length; i++) {
        if (i === idx || updated[i].section === oldSection) {
          updated[i] = { ...updated[i], section: prevSection };
        } else break;
      }
      return updated;
    });
    setEditingSectionRowId(null);
  }

  async function createIngredient(name: string, rowId: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check if ingredient already exists locally — if so, just open the modal
    const existing = ingredients.find((i) => i.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      updateRow(rowId, { ingredientId: existing.id, unit: existing.defaultUnit || "g" });
      setSearchText({ ...searchText, [rowId]: "" });
      setShowDropdown({ ...showDropdown, [rowId]: false });
      setNewIngredientId(existing.id);
      setSourceRowId(rowId);
      setShowCreateModal(true);
      return existing;
    }

    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, defaultUnit: "g" }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create ingredient");

      setIngredients((prev) => { const next = [...prev, resData]; clientCache.set("/api/ingredients", next); return next; });
      updateRow(rowId, { ingredientId: resData.id, unit: resData.defaultUnit || "g" });
      setSearchText({ ...searchText, [rowId]: "" });
      setShowDropdown({ ...showDropdown, [rowId]: false });
      setNewIngredientId(resData.id);
      setSourceRowId(rowId);
      setShowCreateModal(true);

      return resData;
    } catch (error) {
      console.error("createIngredient error:", error);
      toast.error(`Could not add ingredient: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const fromIdx = prev.findIndex((r) => r.id === active.id);
      const toIdx = prev.findIndex((r) => r.id === over.id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const newRows = arrayMove(prev, fromIdx, toIdx);
      const neighborSection = toIdx > 0 ? newRows[toIdx - 1].section : null;
      newRows[toIdx] = { ...newRows[toIdx], section: neighborSection };
      return newRows;
    });
  }

  function handleStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = parseInt((active.id as string).replace("step-", ""));
    const toIdx = parseInt((over.id as string).replace("step-", ""));
    setSteps((prev) => arrayMove(prev, fromIdx, toIdx));
  }

  function computeContributors(nutrientId: number): Array<{ name: string; value: number; pct: number }> {
    const results: Array<{ name: string; value: number; pct: number }> = [];
    for (const row of rows) {
      if (!row.ingredientId) continue;
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) continue;
      const density = getIngredientDensity(ingredient.name);
      const grams = convertToGrams(row.quantity || 0, row.unit || ingredient.defaultUnit || "g", density, ingredient);
      const iv = ingredient.nutrientValues.find((v) => v.nutrient.id === nutrientId);
      if (!iv || !iv.value) continue;
      const contrib = (iv.value * grams) / USDA_BASE_GRAMS / (servings || 1);
      if (contrib > 0.001) results.push({ name: ingredient.name, value: contrib, pct: 0 });
    }
    const total = results.reduce((sum, r) => sum + r.value, 0);
    return results
      .map((r) => ({ ...r, pct: total > 0 ? Math.round((r.value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }

  function computeTotals() {
    const totals: Record<number, number> = {};
    for (const row of rows) {
      if (!row.ingredientId) continue;
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) continue;
      const density = getIngredientDensity(ingredient.name);
      const grams = convertToGrams(row.quantity || 0, row.unit || ingredient.defaultUnit || "g", density, ingredient);
      for (const iv of ingredient.nutrientValues) {
        const nid = iv.nutrient.id;
        const per100 = iv.value || 0;
        const contrib = (per100 * grams) / USDA_BASE_GRAMS;
        totals[nid] = (totals[nid] || 0) + contrib;
      }
    }
    // Divide by serving size to get per-serving nutrition
    const servingSize = servings || 1;
    for (const nid in totals) {
      totals[nid] = totals[nid] / servingSize;
    }
    return totals;
  }

  const rowConversionGrams = useMemo(() => {
    const gramsByRow: Record<string, number | null> = {};
    for (const row of rows) {
      if (!row.ingredientId || !row.quantity || !row.unit) {
        gramsByRow[row.id] = null;
        continue;
      }
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) {
        gramsByRow[row.id] = null;
        continue;
      }
      const density = getIngredientDensity(ingredient.name);
      gramsByRow[row.id] = convertToGrams(row.quantity, row.unit, density, ingredient);
    }
    return gramsByRow;
  }, [ingredients, rows]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Recipe name is required");
      return;
    }

    // Filter only rows with ingredientId
    const validRows = rows.filter((r) => r.ingredientId && r.quantity && r.unit);
    if (validRows.length === 0) {
      toast.error("Add at least one ingredient with quantity and unit");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      servingSize: servings,
      servingUnit,
      instructions: steps.filter((s) => s.trim()).join("\n"),
      tags: tags.join(","),
      prepTime: prepTime !== "" ? Number(prepTime) : null,
      cookTime: cookTime !== "" ? Number(cookTime) : null,
      image: image.trim() || null,
      sourceApp: sourceApp.trim() || null,
      isComplete: initialRecipe?.isComplete ?? true,
      ingredients: validRows.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
        unit: r.unit,
        notes: r.notes,
        section: r.section ?? null,
        conversionGrams: rowConversionGrams[r.id] ?? null,
      })),
    };
    try {
      const isEdit = Boolean(initialRecipe?.id);
      const url = isEdit ? `/api/recipes/${initialRecipe?.id}` : "/api/recipes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? "Recipe updated" : "Recipe saved");
        if (!isEdit) {
          setName("");
          setTags([]);
          setRows([{ id: "r1" }]);
          setInstructions("");
          setSteps(["", "", ""]);
        }
        onSaved?.();
      } else {
        toast.error(`Failed to save recipe: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const totals = computeTotals();

  const MACRO_KEYS: { match: string[]; label: string; exact?: boolean }[] = [
    { match: ["energy", "calorie"], label: "Calories" },
    { match: ["protein"], label: "Protein" },
    { match: ["carbohydrate", "carb"], label: "Carbs" },
    { match: ["fat"], label: "Fat", exact: true },
    { match: ["saturated"], label: "Sat Fat" },
    { match: ["sodium"], label: "Sodium" },
    { match: ["sugar"], label: "Sugar" },
    { match: ["fiber"], label: "Fiber" },
  ];

  function getMacroValue(label: string) {
    const key = MACRO_KEYS.find((k) => k.label === label);
    if (!key) return { value: 0, unit: "" };
    for (const nid in totals) {
      const n = nutrients.find((nn) => nn.id === Number(nid));
      if (!n) continue;
      const name = n.displayName.toLowerCase();
      const match = key.exact ? key.match.some((k) => name === k) : key.match.some((k) => name.includes(k));
      if (match) return { value: totals[Number(nid)] || 0, unit: n.unit };
    }
    return { value: 0, unit: "" };
  }

  return (
    <>
    <div>
      {/* ═══ 01 Basics ═══ */}
      <div id="rf-sec-basics" style={{ marginTop: 0 }}>
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-serif text-[13px] font-bold text-[var(--rule)]">01</span>
          <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Basics</span>
          <span className="flex-1 h-px bg-[var(--rule)]" />
        </div>

        <div className="ed-field">
          <label className="ed-label">Recipe Name</label>
          <input
            className="ed-input"
            placeholder="e.g. Overnight Oats PB Chocolate"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Recipe name"
          />
        </div>

        <div className="ed-row">
          <div className="ed-field">
            <label className="ed-label">Servings</label>
            <input
              className="ed-input"
              type="text"
              inputMode="decimal"
              value={servings === 0 ? "" : servings}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") { setServings(0); } else { const numVal = parseFloat(val); if (!isNaN(numVal)) setServings(numVal); }
              }}
              aria-label="Servings"
            />
          </div>
          <div className="ed-field">
            <label className="ed-label">Serving Unit</label>
            <select className="ed-select" value={servingUnit} onChange={(e) => setServingUnit(e.target.value)} aria-label="Serving unit">
              <option value="servings">servings</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </div>

        <div className="ed-row">
          <div className="ed-field">
            <label className="ed-label">Prep Time (min)</label>
            <input className="ed-input" type="number" min={0} step={1} placeholder="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} aria-label="Prep time in minutes" />
          </div>
          <div className="ed-field">
            <label className="ed-label">Cook Time (min)</label>
            <input className="ed-input" type="number" min={0} step={1} placeholder="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} aria-label="Cook time in minutes" />
          </div>
          <div className="ed-field">
            <label className="ed-label">Total Time</label>
            <div className="font-mono text-[13px] text-[var(--muted)]" style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
              {(prepTime !== "" || cookTime !== "") ? `${(Number(prepTime) || 0) + (Number(cookTime) || 0)}` : "—"}
            </div>
          </div>
        </div>

        <div className="ed-field">
          <label className="ed-label">Tags</label>
          <div className="flex flex-wrap gap-3" style={{ padding: "4px 0" }}>
            {availableTags.map((tag) => (
              <label key={tag} className="flex items-center gap-[5px] cursor-pointer text-[13px]">
                <input type="checkbox" checked={tags.includes(tag)} onChange={(e) => { if (e.target.checked) setTags([...tags, tag]); else setTags(tags.filter((t) => t !== tag)); }} className="cursor-pointer" />
                <span className="capitalize">{tag}</span>
              </label>
            ))}
          </div>
        </div>

        {initialRecipe?.id && (
          <div className="ed-field">
            <label className="ed-label">Source URL</label>
            <input className="ed-input" type="url" placeholder="https://..." value={sourceApp} onChange={(e) => setSourceApp(e.target.value)} aria-label="Source URL" />
          </div>
        )}
      </div>

      {/* ═══ 02 Photo ═══ */}
      <div id="rf-sec-photo" style={{ marginTop: 64 }}>
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-serif text-[13px] font-bold text-[var(--rule)]">02</span>
          <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Photo</span>
          <span className="flex-1 h-px bg-[var(--rule)]" />
        </div>

        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload image file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              const img = new window.Image();
              img.onload = async () => {
                // Resize client-side first
                const MAX = 1200;
                const sc = Math.min(1, MAX / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * sc);
                canvas.height = Math.round(img.height * sc);
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Upload to Supabase Storage
                setImageUploading(true);
                try {
                  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.82));
                  const filename = `${crypto.randomUUID()}.jpg`;
                  const supabase = createClient();
                  const { error } = await supabase.storage.from("recipe-images").upload(filename, blob, { contentType: "image/jpeg" });
                  if (error) throw error;
                  const { data: { publicUrl } } = supabase.storage.from("recipe-images").getPublicUrl(filename);
                  setImage(publicUrl);
                } catch (err) {
                  console.error("Image upload failed:", err);
                  toast.error("Image upload failed — try again");
                } finally {
                  setImageUploading(false);
                }
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
          }}
        />

        <div className="flex items-stretch gap-4 mb-6">
          {!image ? (
            <>
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                disabled={imageUploading}
                className="flex flex-col items-center justify-center gap-1 shrink-0 bg-[var(--bg-2)] border border-dashed border-[var(--rule)] cursor-pointer transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-3)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: 120, aspectRatio: "4/3" }}
                aria-label="Upload recipe image"
              >
                {imageUploading ? (
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] animate-pulse">Uploading…</span>
                ) : (
                  <>
                    <span className="text-[24px] text-[var(--rule)]">+</span>
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">Photo</span>
                  </>
                )}
              </button>
              <div className="ed-field flex-1" style={{ marginBottom: 0, alignSelf: "center" }}>
                <label className="ed-label">Image URL</label>
                <input className="ed-input" style={{ fontSize: 12 }} placeholder="Paste image URL…" onChange={(e) => setImage(e.target.value)} aria-label="Image URL" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <div className="shrink-0 overflow-hidden border border-[var(--rule)]" style={{ width: 120, aspectRatio: "4/3" }}>
                <img src={image} alt="Recipe preview" className="w-full h-full object-cover block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-[var(--muted)] truncate mb-1">
                  {image.startsWith("data:") ? "Uploaded image (legacy)" : image}
                </div>
                <button
                  type="button"
                  onClick={() => { setImage(""); if (imageFileRef.current) imageFileRef.current.value = ""; }}
                  className="ed-btn danger"
                  style={{ padding: "4px 12px", fontSize: 8 }}
                  aria-label="Remove image"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 03 Ingredients ═══ */}
      <div id="rf-sec-ingredients" style={{ marginTop: 64 }}>
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-serif text-[13px] font-bold text-[var(--rule)]">03</span>
          <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Ingredients</span>
          <span className="flex-1 h-px bg-[var(--rule)]" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <DndContext sensors={sensors} onDragEnd={handleIngredientDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {rows.map((row, index) => (
                <SortableIngredientRow
                  key={row.id}
                  row={row} index={index} rows={rows} ingredients={ingredients}
                  searchText={searchText} showDropdown={showDropdown} quantityText={quantityText}
                  editingSectionRowId={editingSectionRowId} editingSectionText={editingSectionText}
                  setSearchText={setSearchText} setShowDropdown={setShowDropdown} setQuantityText={setQuantityText}
                  setRows={setRows} setEditingSectionRowId={setEditingSectionRowId} setEditingSectionText={setEditingSectionText}
                  updateRow={updateRow} commitSection={commitSection}
                  removeSectionFromRow={removeSectionFromRow} createIngredient={createIngredient}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex gap-3" style={{ padding: "8px 0" }}>
          <button className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] bg-transparent border-0 cursor-pointer p-0 hover:text-[var(--fg)] transition-colors active:scale-[0.97]" onClick={addRow} aria-label="Add ingredient row">+ Add Ingredient</button>
          <button className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] bg-transparent border-0 cursor-pointer p-0 hover:text-[var(--fg)] transition-colors active:scale-[0.97]"
            onClick={() => { const newId = `r${Date.now()}`; setRows((s) => [...s, { id: newId }]); setEditingSectionRowId(newId); setEditingSectionText(""); }}
            aria-label="Add section header">+ Section Header</button>
        </div>
      </div>

      {/* ═══ 04 Method ═══ */}
      <div id="rf-sec-method" style={{ marginTop: 64 }}>
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-serif text-[13px] font-bold text-[var(--rule)]">04</span>
          <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Method</span>
          <span className="flex-1 h-px bg-[var(--rule)]" />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleStepDragEnd}>
          <SortableContext items={steps.map((_, i) => `step-${i}`)} strategy={verticalListSortingStrategy}>
            {steps.map((step, idx) => (
              <SortableStepRow
                key={`step-${idx}`}
                id={`step-${idx}`}
                idx={idx}
                step={step}
                onChangeStep={(i, val) => { const next = [...steps]; next[i] = val; setSteps(next); }}
                onRemoveStep={(i) => setSteps((prev) => prev.filter((_, si) => si !== i))}
              />
            ))}
          </SortableContext>
        </DndContext>
        <div style={{ padding: "8px 0" }}>
          <button
            className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] bg-transparent border-0 cursor-pointer p-0 hover:text-[var(--fg)] transition-colors active:scale-[0.97]"
            onClick={() => setSteps((prev) => [...prev, ""])}
            aria-label="Add step"
          >+ Add Step</button>
        </div>
      </div>

      {/* ═══ 05 Nutrition ═══ */}
      <div id="rf-sec-nutrition" style={{ marginTop: 64 }}>
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-serif text-[13px] font-bold text-[var(--rule)]">05</span>
          <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Nutrition</span>
          <span className="flex-1 h-px bg-[var(--rule)]" />
        </div>

        {/* Macro grid */}
        <div style={{ margin: "24px 0" }}>
          <div className="rf-macro-grid grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
            {MACRO_KEYS.map(({ label }, idx) => {
              const { value, unit } = getMacroValue(label);
              const display = value > 0 ? `${Math.round(value * 10) / 10}${unit !== "kcal" ? unit : ""}` : "—";
              return (
                <div key={label} className="flex justify-between items-baseline" style={{ padding: `8px ${(idx + 1) % 3 === 0 ? "0" : "16px"} 8px 0` }}>
                  <span className="font-mono text-[11px] text-[var(--muted)]">{label}</span>
                  <span className="font-mono text-[13px] font-medium tabular-nums">{display}</span>
                </div>
              );
            })}
          </div>
        </div>

        <ContextualTip tipId="nutrition-guidance" label="Nutrition Guidance">
          Toggle the guidance panel below to see how this recipe fits your daily nutrition goals in real time as you add ingredients.
        </ContextualTip>

        {/* Guided mode toggle */}
        <label className="flex items-center gap-[6px] cursor-pointer mt-4" style={{ marginBottom: guidedMode ? 8 : 0 }}>
          <input
            type="checkbox"
            checked={guidedMode}
            onChange={(e) => { setGuidedMode(e.target.checked); if (!e.target.checked) { setGuidedPersonId(null); setGuidedFocus([]); setFocusCaps({}); } }}
            style={{ accentColor: "var(--accent)", width: 13, height: 13, cursor: "pointer" }}
          />
          <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)]">Show nutrition guidance</span>
        </label>

        {/* Guidance inline panel */}
        {guidedMode && (
          <div className="border-t border-[var(--rule)]" style={{ padding: "24px 0", marginTop: 8 }}>
            <div className="font-sans text-[11px] text-[var(--muted)] leading-[1.5] tracking-[0.02em]" style={{ marginBottom: 16 }}>
              Add ingredients, then select a person and focus nutrients to see how this recipe fits your daily goals.
            </div>
            <div className="rf-guidance-grid grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px 40px" }}>
              {/* Left: person + focus */}
              <div>
                {persons.length > 0 && (
                  <>
                    <div className="ed-label" style={{ marginBottom: 8 }}>For</div>
                    <div className="flex flex-wrap gap-[6px]" style={{ marginBottom: 16 }}>
                      {persons.map((p) => (
                        <button key={p.id} onClick={() => setGuidedPersonId(p.id === guidedPersonId ? null : p.id)}
                          className={`font-mono text-[9px] tracking-[0.08em] uppercase py-[5px] px-3 border rounded-pill cursor-pointer transition-colors active:scale-[0.97] ${
                            guidedPersonId === p.id
                              ? "bg-[var(--accent-btn)] border-[var(--accent-btn)] text-[var(--accent-fg)]"
                              : "bg-transparent border-[var(--rule)] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                          }`}>{p.name}</button>
                      ))}
                    </div>
                  </>
                )}
                {guidedPersonId && personGoals.length > 0 && (
                  <>
                    <div className="ed-label" style={{ marginBottom: 8 }}>Focus</div>
                    <div className="flex flex-wrap gap-[6px]" style={{ marginBottom: 16 }}>
                      {personGoals.filter((g) => (g.highGoal ?? g.lowGoal ?? 0) > 0).map((g) => (
                        <button key={g.nutrientId}
                          onClick={() => {
                            setGuidedFocus((prev) => prev.includes(g.nutrientId) ? prev.filter((x) => x !== g.nutrientId) : [...prev, g.nutrientId]);
                            if (guidedFocus.includes(g.nutrientId)) setFocusCaps((prev) => { const next = { ...prev }; delete next[g.nutrientId]; return next; });
                          }}
                          className={`font-mono text-[9px] tracking-[0.08em] uppercase py-[5px] px-3 border rounded-pill cursor-pointer transition-colors active:scale-[0.97] ${
                            guidedFocus.includes(g.nutrientId)
                              ? "bg-[var(--accent-btn)] border-[var(--accent-btn)] text-[var(--accent-fg)]"
                              : "bg-transparent border-[var(--rule)] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                          }`}>{g.nutrient.displayName}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Right: nutrition bars */}
              <div>
                {guidedPersonId && personGoals.length > 0 && personGoals
                  .filter((g) => (g.highGoal ?? g.lowGoal ?? 0) > 0)
                  .map((g) => {
                    const baseGoal = g.highGoal ?? g.lowGoal ?? 0;
                    const capVal = focusCaps[g.nutrientId] ? parseFloat(focusCaps[g.nutrientId]) : null;
                    const goal = (capVal && capVal > 0) ? capVal : baseGoal;
                    const current = totals[g.nutrientId] ?? 0;
                    const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
                    const isFocused = guidedFocus.length === 0 || guidedFocus.includes(g.nutrientId);
                    const isOver = goal > 0 && current > goal * 1.05;
                    const fillCls = isOver ? "bg-[var(--err)]" : "bg-[var(--ok)]";
                    return (
                      <div key={g.nutrientId} style={{ marginBottom: 12, opacity: isFocused ? 1 : 0.4 }}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-2)]">{g.nutrient.displayName}</span>
                          <span className="font-mono text-[9px] text-[var(--fg)] tabular-nums">
                            {Math.round(current * 10) / 10}{g.nutrient.unit} / {Math.round(goal)}{g.nutrient.unit}
                          </span>
                        </div>
                        <div className="h-[3px] bg-[var(--rule)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${fillCls}`} style={{ width: `${pct}%` }} />
                        </div>
                        {isFocused && guidedFocus.includes(g.nutrientId) && (
                          <div className="flex items-center gap-[6px] mt-[5px]">
                            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">Cap</span>
                            <input type="number" min="0" value={focusCaps[g.nutrientId] ?? ""}
                              onChange={(e) => setFocusCaps((prev) => ({ ...prev, [g.nutrientId]: e.target.value }))}
                              placeholder={String(Math.round(baseGoal))}
                              className="w-14 font-mono text-[9px] border border-[var(--rule)] bg-transparent px-[6px] py-[2px] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]" />
                            <span className="font-mono text-[9px] text-[var(--muted)]">{g.nutrient.unit}</span>
                            {focusCaps[g.nutrientId] && (
                              <button type="button" onClick={() => setFocusCaps((prev) => { const next = { ...prev }; delete next[g.nutrientId]; return next; })}
                                className="font-mono text-[9px] text-[var(--muted)] hover:text-[var(--fg)] ml-auto bg-transparent border-0 cursor-pointer">clear</button>
                            )}
                          </div>
                        )}
                        {isOver && (() => {
                          const contributors = computeContributors(g.nutrientId);
                          if (contributors.length === 0) return null;
                          return (
                            <div className="font-mono text-[9px] text-[var(--muted)] mt-1 leading-[1.6]">
                              Top contributors:<br />
                              {contributors.map((c) => <span key={c.name}>· {c.name}<br /></span>)}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                {guidedPersonId && personGoals.length === 0 && (
                  <p className="font-sans text-[11px] text-[var(--muted)]">No goals set for this person.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Footer Buttons ═══ */}
      {!hideFooterButtons && (
        <div className="flex justify-end gap-[10px]" style={{ marginTop: 64 }}>
          <button className="ed-btn ghost" onClick={onCancel} disabled={saving} aria-label="Cancel">Cancel</button>
          <button className="ed-btn primary" onClick={handleSave} disabled={saving} aria-label={initialRecipe ? "Save recipe" : "Create recipe"}>
            {saving ? (initialRecipe ? "Saving…" : "Creating…") : (initialRecipe ? "Save" : "Create")}
          </button>
        </div>
      )}
    </div>

    {/* Modal rendered outside all content divs to avoid stacking context issues */}
    {showCreateModal && newIngredientId && (
      <CreateIngredientModal
        ingredientName={ingredients.find((i) => i.id === newIngredientId)?.name || "New ingredient"}
        ingredientId={newIngredientId}
        onClose={() => {
          setShowCreateModal(false);
          setNewIngredientId(null);
          setSourceRowId(null);
        }}
        onNutritionAdded={() => {
          const sourceNameGuess = rows.find((r) => r.id === sourceRowId)?.nameGuess?.toLowerCase();
          const savedIngredientId = newIngredientId;
          fetch("/api/ingredients")
            .then((r) => r.json())
            .then((d) => {
              const fresh = Array.isArray(d) ? d : [];
              clientCache.set("/api/ingredients", fresh);
              setIngredients(fresh);
              if (savedIngredientId && sourceNameGuess) {
                const saved = fresh.find((i) => i.id === savedIngredientId);
                if (saved) {
                  setRows((prev) => prev.map((row) => {
                    if (row.ingredientId || !row.nameGuess) return row;
                    if (row.nameGuess.toLowerCase() === sourceNameGuess) return { ...row, ingredientId: saved.id, unit: saved.defaultUnit || "g" };
                    return row;
                  }));
                }
              }
            })
            .catch((e) => console.error(e));
        }}
      />
    )}
    </>
  );
});

export default RecipeBuilder;
