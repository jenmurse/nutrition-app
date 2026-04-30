'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';
import { clientCache } from '@/lib/clientCache';
import { usePersonContext } from '@/app/components/PersonContext';

interface Recipe {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  tags?: string;
  isComplete?: boolean;
}

interface Ingredient {
  id: number;
  name: string;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  isMealItem?: boolean;
}

interface OtherPlan {
  personId: number;
  planId: number;
  name: string;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage'];
const ALL_RAIL_ITEMS = [...MEAL_TYPES, 'pantry-items'];

const RAIL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  side: 'Side',
  snack: 'Snack',
  dessert: 'Dessert',
  beverage: 'Beverage',
  'pantry-items': 'Pantry Items',
};

const HEADLINES: Record<string, string> = {
  breakfast: 'Add a breakfast.',
  lunch: 'Add a lunch.',
  dinner: 'Add a dinner.',
  side: 'Add a side.',
  snack: 'Add a snack.',
  dessert: 'Add a dessert.',
  beverage: 'Add a beverage.',
  'pantry-items': 'Add a pantry item.',
};

function AddMealInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { persons, selectedPersonId } = usePersonContext();

  const planId = params?.get('planId') ? Number(params.get('planId')) : null;
  const dateStr = params?.get('date') ?? '';
  const weekStart = params?.get('weekStart') ?? '';

  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

  const selectedDate = dateStr ? new Date(dateStr + 'T00:00:00') : null;

  // Rail / meal type selection
  const [activeMealType, setActiveMealType] = useState<string>('breakfast');
  const isPantryMode = activeMealType === 'pantry-items';

  // Fade transition state (desktop rail switches)
  const [contentVisible, setContentVisible] = useState(true);

  // Mobile two-step flow
  const [mobileStep, setMobileStep] = useState<'picker' | 'browse'>('picker');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [otherPersonPlans, setOtherPersonPlans] = useState<OtherPlan[]>([]);

  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [selectedServings, setSelectedServings] = useState('1');
  const [selectedQuantity, setSelectedQuantity] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);
  const [pendingIngredientId, setPendingIngredientId] = useState<number | null>(null);
  const [alsoAddToPlanIds, setAlsoAddToPlanIds] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      const cached = clientCache.get<Recipe[]>('/api/recipes');
      if (cached) { setRecipes(cached); return; }
      try {
        const res = await fetch('/api/recipes');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        clientCache.set('/api/recipes', list);
        setRecipes(list);
      } catch {}
    }
    async function loadIngredients() {
      const cached = clientCache.get<Ingredient[]>('/api/ingredients?slim=true');
      if (cached) { setIngredients(cached); return; }
      try {
        const res = await fetch('/api/ingredients?slim=true');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        clientCache.set('/api/ingredients?slim=true', list);
        setIngredients(list);
      } catch {}
    }
    loadRecipes();
    loadIngredients();
  }, []);

  useEffect(() => {
    if (!weekStart || persons.length < 2 || !selectedPersonId) return;
    const weekStartTime = new Date(weekStart + 'T00:00:00').getTime();
    async function loadOtherPlans() {
      try {
        const others = persons.filter(p => p.id !== selectedPersonId);
        const results: OtherPlan[] = [];
        await Promise.all(others.map(async (p) => {
          const res = await fetch(`/api/meal-plans?personId=${p.id}`);
          if (!res.ok) return;
          const plans = await res.json();
          const match = plans.find((pl: { weekStartDate: string; id: number }) => {
            const d = new Date(pl.weekStartDate);
            return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime() === weekStartTime;
          });
          if (match) results.push({ personId: p.id, planId: match.id, name: p.name });
        }));
        setOtherPersonPlans(results);
      } catch {}
    }
    loadOtherPlans();
  }, [weekStart, persons, selectedPersonId]);

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    if (recipeSearchTerm) {
      const term = recipeSearchTerm.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(term));
    }
    result = result.filter(r => {
      if (!r.tags) return false;
      const tags = r.tags.split(',').map(t => t.trim().toLowerCase());
      return tags.includes(activeMealType);
    });
    return result;
  }, [recipes, recipeSearchTerm, activeMealType]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing =>
      ing.isMealItem &&
      ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
    );
  }, [ingredients, ingredientSearchTerm]);

  // Desktop rail click — fade transition
  const handleRailClick = (type: string) => {
    if (type === activeMealType) return;
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setContentVisible(false);
    fadeTimer.current = setTimeout(() => {
      setActiveMealType(type);
      setRecipeSearchTerm('');
      setIngredientSearchTerm('');
      setPendingRecipeId(null);
      setPendingIngredientId(null);
      setContentVisible(true);
    }, 180);
  };

  // Mobile meal type row tap
  const handleMobileTypeSelect = (type: string) => {
    setActiveMealType(type);
    setRecipeSearchTerm('');
    setIngredientSearchTerm('');
    setPendingRecipeId(null);
    setPendingIngredientId(null);
    setMobileStep('browse');
  };

  const handleAdd = async () => {
    if (!planId || !selectedDate || !activeMealType) return;
    const dateISO = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    // Pantry items use 'snack' as mealType since it's not a DB enum value
    const apiMealType = isPantryMode ? 'snack' : activeMealType;
    setAdding(true);

    try {
      const addToPlans = [planId, ...(alsoAddToPlanIds.size > 0 ? Array.from(alsoAddToPlanIds) : [])];

      if (!isPantryMode && pendingRecipeId) {
        const parsedServings = parseFloat(selectedServings);
        if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
          toast.error('Please enter a valid number of servings');
          setAdding(false);
          return;
        }
        const body = { recipeId: pendingRecipeId, date: dateISO, mealType: apiMealType, servings: parsedServings };
        for (const pid of addToPlans) {
          const res = await fetch(`/api/meal-plans/${pid}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add meal'); }
        }
      } else if (isPantryMode && pendingIngredientId) {
        const qty = parseFloat(selectedQuantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error('Please enter a valid quantity');
          setAdding(false);
          return;
        }
        const body = { ingredientId: pendingIngredientId, quantity: qty, unit: selectedUnit, date: dateISO, mealType: apiMealType };
        for (const pid of addToPlans) {
          const res = await fetch(`/api/meal-plans/${pid}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add meal'); }
        }
      }

      if (planId) clientCache.delete(`/api/meal-plans/${planId}`);
      toast.success('Meal added successfully!');
      if (planId) router.push(`/meal-plans?planId=${planId}`);
      else router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add meal');
    } finally {
      setAdding(false);
    }
  };

  if (!planId || !selectedDate) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[11px] text-[var(--muted)]">Invalid parameters</span>
      </div>
    );
  }

  const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const canAdd = !isPantryMode ? !!pendingRecipeId : !!pendingIngredientId;

  return (
    <div className="h-full relative">

      {/* Desktop fixed left rail — outside animated wrapper so CSS transform doesn't break position:fixed */}
      <div className="am-rail" role="navigation" aria-label="Meal type">
        {ALL_RAIL_ITEMS.map(type => (
          <button
            key={type}
            type="button"
            className={`am-rail-item${activeMealType === type ? ' is-active' : ''}`}
            onClick={() => handleRailClick(type)}
            aria-current={activeMealType === type ? 'true' : undefined}
          >
            <span className="am-rail-label">{RAIL_LABELS[type]}</span>
          </button>
        ))}
      </div>

      <div className="h-full overflow-y-auto animate-page-enter">
      <div className="pl-add-body">

        {/* Mobile ← Back — absolute, sits above the eyebrow anchor (in the 48px reserved space) */}
        {mobileStep === 'browse' && (
          <button
            type="button"
            className="sm:hidden font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--fg)] bg-transparent border-0 p-0 cursor-pointer"
            style={{ position: 'absolute', top: 12, left: 24 }}
            onClick={() => setMobileStep('picker')}
          >← Back</button>
        )}

        {/* ── Mobile Screen 1: meal type picker ── */}
        {mobileStep === 'picker' && (
          <div className="sm:hidden">
            <div className="pl-add-eyebrow">§ {dateLabel.toUpperCase()}</div>
            <h1 className="pl-add-title">Add a meal.</h1>
            <ul className="pl-add-mtlist">
              {ALL_RAIL_ITEMS.map(type => (
                <li key={type}>
                  <button
                    type="button"
                    className="pl-add-mtrow"
                    onClick={() => handleMobileTypeSelect(type)}
                  >
                    <span className="pl-add-mtname">{RAIL_LABELS[type]}</span>
                    <span className="pl-add-mtarrow" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Right column: always on desktop, Screen 2 on mobile ── */}
        <div
          className={`am-content${mobileStep === 'picker' ? ' hidden sm:block' : ''}`}
          style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 180ms var(--ease-out)' }}
        >
          {/* Eyebrow + headline */}
          <div className="pl-add-eyebrow">§ {dateLabel.toUpperCase()}</div>
          <h1 className="pl-add-title">{HEADLINES[activeMealType]}</h1>

          {/* Search + Servings / Quantity row */}
          {!isPantryMode ? (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                <label className="pl-create-label" htmlFor="recipe-search">Search</label>
                <input
                  id="recipe-search"
                  type="text"
                  placeholder="Find recipe…"
                  className="pl-create-date"
                  style={{ flex: 1 }}
                  value={recipeSearchTerm}
                  onChange={e => setRecipeSearchTerm(e.target.value)}
                  aria-label="Search recipes"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="pl-create-label" htmlFor="meal-servings">Servings</label>
                <input
                  id="meal-servings"
                  type="number"
                  min={0.25}
                  step={0.25}
                  className="pl-create-date"
                  style={{ width: 60 }}
                  value={selectedServings}
                  onChange={e => setSelectedServings(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 min-w-max">
                <label className="pl-create-label" htmlFor="ingredient-search">Search</label>
                <input
                  id="ingredient-search"
                  type="text"
                  placeholder="Find item…"
                  className="pl-create-date"
                  style={{ flex: 1 }}
                  value={ingredientSearchTerm}
                  onChange={e => setIngredientSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="pl-create-label" htmlFor="ingredient-quantity">Quantity</label>
                <input
                  id="ingredient-quantity"
                  type="number"
                  min={0.01}
                  step={0.1}
                  className="pl-create-date"
                  style={{ width: 60 }}
                  value={selectedQuantity}
                  onChange={e => setSelectedQuantity(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="pl-create-label" htmlFor="ingredient-unit">Unit</label>
                <input
                  id="ingredient-unit"
                  type="text"
                  className="pl-create-date"
                  style={{ width: 60 }}
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  placeholder="g, ml, etc."
                />
              </div>
            </div>
          )}

          {/* Recipe grid / ingredient list */}
          <div className="pl-add-scroll">
            {!isPantryMode ? (
              <div className="grid gap-0 md:grid-cols-2">
                {filteredRecipes.length === 0 ? (
                  <div className="col-span-full py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                    No recipes match this meal type
                  </div>
                ) : (
                  filteredRecipes.map(recipe => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={`meal-chip text-left ${recipe.isComplete === false ? 'cursor-not-allowed opacity-50' : pendingRecipeId === recipe.id ? 'bg-[var(--bg-2)]' : ''}`}
                      onClick={recipe.isComplete === false || adding ? undefined : () => setPendingRecipeId(recipe.id)}
                      title={!recipe.isComplete ? 'Complete this recipe before adding to meal plan' : ''}
                      disabled={adding}
                      aria-label={recipe.name}
                    >
                      <span className="meal-chip-name">{recipe.name}</span>
                      <span className="meal-chip-kcal">
                        {recipe.servingSize} {recipe.servingUnit}
                        {!recipe.isComplete && ' · Incomplete'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="grid gap-0 md:grid-cols-2">
                {filteredIngredients.length === 0 ? (
                  <div className="col-span-full py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                    {ingredients.filter(ing => ing.isMealItem).length === 0 ? 'No items available' : 'No items match your search'}
                  </div>
                ) : (
                  filteredIngredients.map(ingredient => (
                    <button
                      key={ingredient.id}
                      type="button"
                      onClick={() => {
                        const unit = ingredient.customUnitName || ingredient.defaultUnit;
                        const qty = ingredient.customUnitName ? '1' : selectedQuantity;
                        setSelectedUnit(unit);
                        setSelectedQuantity(qty);
                        setPendingIngredientId(ingredient.id);
                      }}
                      disabled={adding}
                      className={`meal-chip text-left ${pendingIngredientId === ingredient.id ? 'bg-[var(--bg-2)]' : ''}`}
                      aria-label={ingredient.name}
                    >
                      <span className="meal-chip-name">{ingredient.name}</span>
                      <span className="meal-chip-kcal">
                        {ingredient.customUnitName
                          ? `${ingredient.customUnitAmount ?? 1} ${ingredient.customUnitName} = ${ingredient.customUnitGrams}g`
                          : `per ${ingredient.defaultUnit}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--rule-faint)] pt-4 pb-4 flex items-center gap-4">
            {otherPersonPlans.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <span className="pl-create-label">Also add to</span>
                {otherPersonPlans.map(op => (
                  <label key={op.planId} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoAddToPlanIds.has(op.planId)}
                      onChange={e => {
                        const next = new Set(alsoAddToPlanIds);
                        if (e.target.checked) next.add(op.planId); else next.delete(op.planId);
                        setAlsoAddToPlanIds(next);
                      }}
                      className="w-[14px] h-[14px]"
                      aria-label={`Also add to ${op.name}'s plan`}
                    />
                    <span className="font-mono text-[11px] text-[var(--muted)]">{op.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                className="pl-create-btn"
                disabled={adding || !canAdd}
                onClick={handleAdd}
                aria-label="Add to plan"
              >{adding ? 'Adding…' : 'Add to Plan'}</button>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}

export default function AddMealPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-[11px] text-[var(--muted)]">Loading…</span>
      </div>
    }>
      <AddMealInner />
    </Suspense>
  );
}
