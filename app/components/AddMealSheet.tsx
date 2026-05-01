'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/lib/toast';
import { clientCache } from '@/lib/clientCache';

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

const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage', 'pantry-items'];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', side: 'Side',
  snack: 'Snack', dessert: 'Dessert', beverage: 'Beverage', 'pantry-items': 'Pantry Items',
};
const HEADLINES: Record<string, string> = {
  breakfast: 'Add a breakfast.', lunch: 'Add a lunch.', dinner: 'Add a dinner.',
  side: 'Add a side.', snack: 'Add a snack.', dessert: 'Add a dessert.',
  beverage: 'Add a beverage.', 'pantry-items': 'Add a pantry item.',
};

interface AddMealSheetProps {
  planId: number;
  date: Date;
  weekStartDate: Date;
  onClose: () => void;
  onMealAdded: () => void;
}

export default function AddMealSheet({ planId, date, onClose, onMealAdded }: AddMealSheetProps) {
  const [step, setStep] = useState<'picker' | 'browse'>('picker');
  const [activeMealType, setActiveMealType] = useState<string>('breakfast');
  const isPantryMode = activeMealType === 'pantry-items';

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [selectedServings, setSelectedServings] = useState('1');
  const [selectedQuantity, setSelectedQuantity] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);
  const [pendingIngredientId, setPendingIngredientId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

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

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    if (recipeSearchTerm) {
      const term = recipeSearchTerm.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(term));
    }
    return result.filter(r => {
      if (!r.tags) return false;
      return r.tags.split(',').map(t => t.trim().toLowerCase()).includes(activeMealType);
    });
  }, [recipes, recipeSearchTerm, activeMealType]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing =>
      ing.isMealItem && ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
    );
  }, [ingredients, ingredientSearchTerm]);

  const handleTypeSelect = (type: string) => {
    setActiveMealType(type);
    setRecipeSearchTerm('');
    setIngredientSearchTerm('');
    setPendingRecipeId(null);
    setPendingIngredientId(null);
    setStep('browse');
  };

  const handleAdd = async () => {
    const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const apiMealType = isPantryMode ? 'snack' : activeMealType;
    setAdding(true);
    try {
      if (!isPantryMode && pendingRecipeId) {
        const servings = parseFloat(selectedServings);
        if (!Number.isFinite(servings) || servings <= 0) {
          toast.error('Please enter a valid number of servings');
          setAdding(false);
          return;
        }
        const res = await fetch(`/api/meal-plans/${planId}/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: pendingRecipeId, date: dateISO, mealType: apiMealType, servings }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add meal'); }
      } else if (isPantryMode && pendingIngredientId) {
        const qty = parseFloat(selectedQuantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          toast.error('Please enter a valid quantity');
          setAdding(false);
          return;
        }
        const res = await fetch(`/api/meal-plans/${planId}/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientId: pendingIngredientId, quantity: qty, unit: selectedUnit, date: dateISO, mealType: apiMealType }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to add meal'); }
      }
      clientCache.delete(`/api/meal-plans/${planId}`);
      toast.success('Meal added successfully!');
      onMealAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add meal');
    } finally {
      setAdding(false);
    }
  };

  // Drag-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - dragStartY.current;
    dragStartY.current = null;
    if (delta > 60) onClose();
  };

  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const canAdd = !isPantryMode ? !!pendingRecipeId : !!pendingIngredientId;

  const sheetStyle: React.CSSProperties = {
    maxHeight: step === 'picker' ? '75vh' : 'calc(100dvh - 60px)',
    transition: 'max-height 360ms var(--ease-out)',
  };

  return createPortal(
    <>
      <div
        className="mob-sheet-backdrop mob-sheet-backdrop--above-nav"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="mob-sheet add-meal-full-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add meal"
        style={sheetStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mob-sheet-handle" aria-hidden="true" />

        {step === 'picker' ? (
          <>
            <div className="add-meal-sheet-eyebrow">§ {dateLabel.toUpperCase()}</div>
            <div className="add-meal-type-rows" role="list">
              {ALL_MEAL_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  className="add-meal-type-row"
                  role="listitem"
                  onClick={() => handleTypeSelect(type)}
                >
                  <span>{MEAL_TYPE_LABELS[type]}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="add-meal-browse">
            <div className="add-meal-sheet-eyebrow">§ {dateLabel.toUpperCase()}</div>
            <h2 className="add-meal-browse-headline">{HEADLINES[activeMealType]}</h2>

            {!isPantryMode ? (
              <div className="add-meal-browse-controls">
                <div className="add-meal-browse-search-wrap">
                  <label className="pl-create-label" htmlFor="am-sheet-search">Search</label>
                  <input
                    id="am-sheet-search"
                    type="text"
                    placeholder="FIND RECIPE…"
                    className="pl-create-date am-search-input"
                    value={recipeSearchTerm}
                    onChange={e => setRecipeSearchTerm(e.target.value)}
                    aria-label="Search recipes"
                  />
                </div>
                <div className="add-meal-browse-servings-wrap">
                  <label className="pl-create-label" htmlFor="am-sheet-servings">Servings</label>
                  <input
                    id="am-sheet-servings"
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
              <div className="add-meal-browse-controls">
                <div className="add-meal-browse-search-wrap">
                  <label className="pl-create-label" htmlFor="am-sheet-ing-search">Search</label>
                  <input
                    id="am-sheet-ing-search"
                    type="text"
                    placeholder="FIND ITEM…"
                    className="pl-create-date am-search-input"
                    value={ingredientSearchTerm}
                    onChange={e => setIngredientSearchTerm(e.target.value)}
                  />
                </div>
                <div className="add-meal-browse-servings-wrap">
                  <label className="pl-create-label" htmlFor="am-sheet-qty">Quantity</label>
                  <input id="am-sheet-qty" type="number" min={0.01} step={0.1} className="pl-create-date" style={{ width: 60 }} value={selectedQuantity} onChange={e => setSelectedQuantity(e.target.value)} />
                </div>
                <div className="add-meal-browse-servings-wrap">
                  <label className="pl-create-label" htmlFor="am-sheet-unit">Unit</label>
                  <input id="am-sheet-unit" type="text" className="pl-create-date" style={{ width: 60 }} value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} placeholder="g, ml…" />
                </div>
              </div>
            )}

            <div className="add-meal-browse-list">
              {!isPantryMode ? (
                filteredRecipes.length === 0 ? (
                  <div className="add-meal-browse-empty">No recipes match this meal type</div>
                ) : (
                  filteredRecipes.map(recipe => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={`meal-chip text-left${recipe.isComplete === false ? ' cursor-not-allowed opacity-50' : pendingRecipeId === recipe.id ? ' bg-[var(--bg-2)]' : ''}`}
                      onClick={recipe.isComplete === false || adding ? undefined : () => setPendingRecipeId(recipe.id)}
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
                )
              ) : (
                filteredIngredients.length === 0 ? (
                  <div className="add-meal-browse-empty">
                    {ingredients.filter(i => i.isMealItem).length === 0 ? 'No items available' : 'No items match your search'}
                  </div>
                ) : (
                  filteredIngredients.map(ingredient => (
                    <button
                      key={ingredient.id}
                      type="button"
                      className={`meal-chip text-left${pendingIngredientId === ingredient.id ? ' bg-[var(--bg-2)]' : ''}`}
                      onClick={() => {
                        const unit = ingredient.customUnitName || ingredient.defaultUnit;
                        setSelectedUnit(unit);
                        if (ingredient.customUnitName) setSelectedQuantity('1');
                        setPendingIngredientId(ingredient.id);
                      }}
                      disabled={adding}
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
                )
              )}
            </div>

            <div className="add-meal-browse-footer">
              <button
                type="button"
                className="pl-create-btn"
                disabled={adding || !canAdd}
                onClick={handleAdd}
                aria-label="Add to plan"
              >{adding ? 'Adding…' : 'Add to Plan'}</button>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
