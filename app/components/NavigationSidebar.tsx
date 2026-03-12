"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import BulkIngredientImport from "./BulkIngredientImport";

export default function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecipesPage = pathname?.startsWith("/recipes");
  const isIngredientsPage = pathname?.startsWith("/ingredients");
  const isMealPlansPage = pathname?.startsWith("/meal-plans");
  const isSettingsPage = pathname?.startsWith("/settings");
  const [recipesDrawerOpen, setRecipesDrawerOpen] = useState(isRecipesPage);
  const [ingredientsDrawerOpen, setIngredientsDrawerOpen] = useState(isIngredientsPage);
  const [mealPlansDrawerOpen, setMealPlansDrawerOpen] = useState(isMealPlansPage);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(isSettingsPage);
  const [mealPlans, setMealPlans] = useState<Array<{id: number; weekStartDate: string}>>([]);
  const [loadingMealPlans, setLoadingMealPlans] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    if (isMealPlansPage) {
      fetchMealPlans();
    }
  }, [isMealPlansPage]);

  useEffect(() => {
    setShowCreateForm(searchParams?.get("showForm") === "true");
  }, [searchParams]);

  const fetchMealPlans = async () => {
    try {
      setLoadingMealPlans(true);
      const response = await fetch('/api/meal-plans');
      if (!response.ok) throw new Error('Failed to fetch meal plans');
      const data = await response.json();
      setMealPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      setMealPlans([]);
    } finally {
      setLoadingMealPlans(false);
    }
  };

  const handleCreateMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekStartDate) {
      setFormMessage({ type: 'error', text: 'Please select a start date' });
      return;
    }

    try {
      setCreatingPlan(true);
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: newWeekStartDate }),
      });

      if (!response.ok) throw new Error('Failed to create meal plan');
      const newPlan = await response.json();

      setMealPlans([newPlan, ...mealPlans]);
      setFormMessage({ type: 'success', text: 'Meal plan created successfully!' });

      const params = new URLSearchParams(searchParams?.toString());
      params.set("planId", String(newPlan.id));
      params.delete("showForm");
      setNewWeekStartDate('');
      setTimeout(() => {
        router.push(`/meal-plans?${params.toString()}`);
        setFormMessage(null);
      }, 500);
    } catch (error) {
      console.error('Error creating meal plan:', error);
      setFormMessage({ type: 'error', text: 'Failed to create meal plan' });
    } finally {
      setCreatingPlan(false);
    }
  };

  useEffect(() => {
    setRecipesDrawerOpen(isRecipesPage);
    setIngredientsDrawerOpen(isIngredientsPage);
    setMealPlansDrawerOpen(isMealPlansPage);
    setSettingsDrawerOpen(isSettingsPage);
  }, [isRecipesPage, isIngredientsPage, isMealPlansPage, isSettingsPage]);

  const searchQuery = searchParams?.get("search") || "";
  const selectedTags = searchParams?.get("tags")?.split(",").filter(Boolean) || [];
  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

  const handleRecipesClick = (e: React.MouseEvent) => {
    if (isRecipesPage) { e.preventDefault(); setRecipesDrawerOpen(!recipesDrawerOpen); }
  };
  const handleIngredientsClick = (e: React.MouseEvent) => {
    if (isIngredientsPage) { e.preventDefault(); setIngredientsDrawerOpen(!ingredientsDrawerOpen); }
  };
  const handleMealPlansClick = (e: React.MouseEvent) => {
    if (isMealPlansPage) { e.preventDefault(); setMealPlansDrawerOpen(!mealPlansDrawerOpen); }
  };
  const handleSettingsClick = (e: React.MouseEvent) => {
    if (isSettingsPage) { e.preventDefault(); setSettingsDrawerOpen(!settingsDrawerOpen); }
  };

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) { params.set(key, value); } else { params.delete(key); }
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    updateSearchParam("tags", newTags.join(","));
  };

  /* ---- style constants matching mock ---- */
  const navLink = (active: boolean | null | undefined) =>
    `block py-2 px-4 font-mono text-[9px] font-normal tracking-[0.08em] uppercase cursor-pointer transition ${
      active ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
    }`;

  const drawerWrap = "py-[10px] px-4 pb-[14px] bg-[#fafafa] border-b border-[var(--rule)]";

  const drawerLabel = "block text-[9px] font-normal tracking-[0.12em] uppercase text-[var(--muted)] mb-[7px]";

  const drawerInput = "w-full bg-transparent border-0 border-b border-[var(--rule)] py-1 px-0 text-[11px] font-light text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none mb-[10px]";

  const btnPrimary = "w-full bg-[var(--fg)] text-[var(--bg)] py-[7px] px-3 text-[9px] font-normal tracking-[0.12em] uppercase border-0 cursor-pointer flex items-center justify-center gap-1";

  const btnGhost = "w-full bg-transparent text-[var(--muted)] py-[6px] px-0 text-[9px] font-normal tracking-[0.12em] uppercase border-0 cursor-pointer text-left hover:text-[var(--fg)] transition";

  return (
    <aside className="flex w-[200px] flex-col border-r border-[var(--rule)] bg-[var(--bg)] overflow-y-auto" style={{ minWidth: 200, flexShrink: 0 }}>
      {/* Brand */}
      <Link href="/" className="flex items-center h-[44px] px-4 border-b border-[var(--rule)] font-mono text-[9px] font-normal tracking-[0.12em] uppercase text-[var(--fg)] no-underline" style={{ flexShrink: 0 }}>
        Nutrition
      </Link>

      {/* Nav */}
      <nav className="flex-1">
        <Link href="/ingredients" onClick={handleIngredientsClick} className={navLink(isIngredientsPage)}>
          Ingredients
        </Link>

        {/* Ingredients Drawer */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isIngredientsPage && ingredientsDrawerOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={drawerWrap}>
            {/* Search */}
            <span className={drawerLabel}>Search</span>
            <input
              type="text"
              className={drawerInput}
              placeholder="ingredient name"
              value={searchQuery}
              onChange={(e) => updateSearchParam("search", e.target.value)}
            />

            {/* Mode Toggle */}
            <div className="flex border border-[var(--rule)] mb-[10px]">
              <button
                onClick={() => setShowBulkImport(false)}
                className={`flex-1 py-[5px] px-2 font-mono text-[9px] tracking-[0.08em] uppercase border-0 cursor-pointer transition ${
                  !showBulkImport ? 'bg-[var(--fg)] text-[var(--bg)]' : 'bg-transparent text-[var(--muted)]'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className={`flex-1 py-[5px] px-2 font-mono text-[9px] tracking-[0.08em] uppercase border-0 border-l border-[var(--rule)] cursor-pointer transition ${
                  showBulkImport ? 'bg-[var(--fg)] text-[var(--bg)]' : 'bg-transparent text-[var(--muted)]'
                }`}
              >
                Bulk
              </button>
            </div>

            {!showBulkImport ? (
              <button onClick={() => router.push("/ingredients/create")} className={btnPrimary}>
                + New
              </button>
            ) : (
              <>
                <div className="text-[10px] text-[var(--muted)] mb-2">
                  Upload multiple ingredients at once from CSV or TSV data
                </div>
                <BulkIngredientImport
                  onImportComplete={() => { setShowBulkImport(false); router.refresh(); }}
                />
              </>
            )}
          </div>
        </div>

        <Link href="/recipes" onClick={handleRecipesClick} className={navLink(isRecipesPage)}>
          Recipes
        </Link>

        {/* Recipes Drawer */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isRecipesPage && recipesDrawerOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={drawerWrap}>
            {/* Search */}
            <span className={drawerLabel}>Search</span>
            <input
              type="text"
              className={drawerInput}
              placeholder="recipe name"
              value={searchQuery}
              onChange={(e) => updateSearchParam("search", e.target.value)}
            />

            {/* + New */}
            <button onClick={() => router.push("/recipes/create")} className={`${btnPrimary} mb-[10px]`}>
              + New
            </button>

            {/* Filter */}
            <span className={drawerLabel}>Filter</span>
            <div className="flex flex-col gap-1">
              {availableTags.map((tag) => (
                <label key={tag} className="flex items-center gap-[6px] cursor-pointer text-[10px] text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="cursor-pointer"
                  />
                  <span className="capitalize">{tag}</span>
                </label>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => updateSearchParam("tags", "")}
                className={`${btnGhost} mt-2`}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <Link href="/meal-plans" onClick={handleMealPlansClick} className={navLink(isMealPlansPage)}>
          Meal Plans
        </Link>

        {/* Meal Plans Drawer */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isMealPlansPage && mealPlansDrawerOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={drawerWrap}>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString());
                params.set("showForm", "true");
                router.push(`/meal-plans?${params.toString()}`);
              }}
              className={btnPrimary}
            >
              + New Plan
            </button>

            {/* Create Form */}
            {showCreateForm && (
              <div className="mt-[10px] space-y-2">
                {formMessage && (
                  <div className={`py-1.5 text-[11px] ${
                    formMessage.type === 'success' ? 'text-[var(--fg)]' : 'text-[var(--error)]'
                  }`}>
                    {formMessage.text}
                  </div>
                )}
                <form onSubmit={handleCreateMealPlan} className="space-y-2">
                  <label className="flex flex-col gap-1">
                    <span className={drawerLabel}>Week start</span>
                    <input
                      type="date"
                      value={newWeekStartDate}
                      onChange={(e) => setNewWeekStartDate(e.target.value)}
                      required
                      className={drawerInput}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={creatingPlan} className={`flex-1 ${btnPrimary} disabled:opacity-50`}>
                      {creatingPlan ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams?.toString());
                        params.delete("showForm");
                        router.push(`/meal-plans?${params.toString()}`);
                        setNewWeekStartDate('');
                        setFormMessage(null);
                      }}
                      className={`flex-1 text-center ${btnGhost}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Plan List */}
            <div className="mt-[10px] max-h-[300px] overflow-y-auto">
              {loadingMealPlans ? (
                <div className="text-[11px] text-[var(--muted)]">Loading plans...</div>
              ) : mealPlans.length === 0 ? (
                <div className="text-[11px] text-[var(--muted)]">No meal plans yet</div>
              ) : (
                mealPlans.map((plan) => {
                  const selectedPlanId = searchParams?.get("planId");
                  const isSelected = selectedPlanId === String(plan.id);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set("planId", String(plan.id));
                        router.push(`/meal-plans?${params.toString()}`);
                      }}
                      className={`${btnGhost} flex items-center justify-between ${
                        isSelected ? 'text-[var(--fg)] bg-[#f5f5f5] px-[6px]' : ''
                      }`}
                    >
                      <span className="truncate">
                        Week of{' '}
                        {new Date(plan.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {isSelected && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this meal plan? All meals will be removed.')) {
                              fetch(`/api/meal-plans/${plan.id}`, { method: 'DELETE' })
                                .then(() => {
                                  setMealPlans(mealPlans.filter(p => p.id !== plan.id));
                                  const params = new URLSearchParams(searchParams?.toString());
                                  params.delete("planId");
                                  router.push(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
                                })
                                .catch(error => console.error('Error deleting plan:', error));
                            }
                          }}
                          className="text-[9px] text-[var(--muted)] hover:text-[var(--error)] transition"
                        >
                          Delete
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <Link href="/settings" onClick={handleSettingsClick} className={navLink(isSettingsPage)}>
          Settings
        </Link>

        {/* Settings Drawer */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isSettingsPage && settingsDrawerOpen ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={drawerWrap}>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString());
                const isEditing = params.get("editing") === "true";
                if (isEditing) { params.delete("editing"); } else { params.set("editing", "true"); }
                router.push(`/settings?${params.toString()}`);
              }}
              className={`${btnPrimary} mb-2`}
            >
              {searchParams?.get("editing") === "true" ? 'View Summary' : 'Edit Goals'}
            </button>
            <button
              onClick={() => {
                if (confirm("Reset all goals? This will clear every min/max value.")) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("reset", "true");
                  router.push(`/settings?${params.toString()}`);
                }
              }}
              className={btnGhost}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}
