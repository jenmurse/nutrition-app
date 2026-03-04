"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  
  // Fetch meal plans when on meal plans page
  useEffect(() => {
    if (isMealPlansPage) {
      fetchMealPlans();
    }
  }, [isMealPlansPage]);

  // Sync form visibility with URL param
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
      
      // Navigate to the new plan and close form
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
  
  // Sync drawer state when route changes
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
    if (isRecipesPage) {
      // Already on recipes page, just toggle drawer
      e.preventDefault();
      setRecipesDrawerOpen(!recipesDrawerOpen);
    }
    // Otherwise let the Link navigate normally
  };

  const handleIngredientsClick = (e: React.MouseEvent) => {
    if (isIngredientsPage) {
      // Already on ingredients page, just toggle drawer
      e.preventDefault();
      setIngredientsDrawerOpen(!ingredientsDrawerOpen);
    }
    // Otherwise let the Link navigate normally
  };

  const handleMealPlansClick = (e: React.MouseEvent) => {
    if (isMealPlansPage) {
      // Already on meal plans page, just toggle drawer
      e.preventDefault();
      setMealPlansDrawerOpen(!mealPlansDrawerOpen);
    }
    // Otherwise let the Link navigate normally
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    if (isSettingsPage) {
      // Already on settings page, just toggle drawer
      e.preventDefault();
      setSettingsDrawerOpen(!settingsDrawerOpen);
    }
    // Otherwise let the Link navigate normally
  };

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    updateSearchParam("tags", newTags.join(","));
  };

  return (
    <aside className="flex w-80 flex-col border-r bg-muted/20">
      {/* Logo/Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Nutrition Tracker
        </Link>
      </div>
      
      {/* Navigation Links */}
      <nav className="space-y-1 p-3">
        <Link 
          href="/ingredients"
          onClick={handleIngredientsClick}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span className="text-base">🥕</span>
          Ingredients
        </Link>
        
        {/* Ingredients Drawer - shows when on ingredients page and drawer is open */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isIngredientsPage && ingredientsDrawerOpen 
            ? 'max-h-[700px] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="px-3 py-3 space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkImport(false)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border transition ${
                  !showBulkImport
                    ? 'bg-foreground text-background'
                    : 'bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border transition ${
                  showBulkImport
                    ? 'bg-foreground text-background'
                    : 'bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                Bulk
              </button>
            </div>

            {!showBulkImport ? (
              <>
                {/* Single Create Button */}
                <button
                  onClick={() => router.push("/ingredients/create")}
                  className="flex w-full items-center justify-center border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition"
                >
                  + Create Ingredient
                </button>

                {/* Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Search
                  </label>
                  <input
                    type="text"
                    className="w-full border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                    placeholder="Type ingredient name..."
                    value={searchQuery}
                    onChange={(e) => updateSearchParam("search", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-muted-foreground mb-2">
                  Upload multiple ingredients at once from CSV or TSV data
                </div>
                <BulkIngredientImport 
                  onImportComplete={() => {
                    setShowBulkImport(false);
                    // Trigger a refresh by navigating
                    router.refresh();
                  }}
                />
              </>
            )}
          </div>
        </div>
        
        
        <Link 
          href="/recipes" 
          onClick={handleRecipesClick}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span className="text-base">📝</span>
          Recipes
        </Link>
        
        {/* Recipes Drawer - shows when on recipes page and drawer is open */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isRecipesPage && recipesDrawerOpen 
            ? 'max-h-[500px] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="px-3 py-3 space-y-4">
            {/* Create Button */}
            <Link
              href="/recipes/create"
              className="flex w-full items-center justify-center border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition"
            >
              + Create Recipe
            </Link>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Search
              </label>
              <input
                type="text"
                className="w-full border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="Type recipe name..."
                value={searchQuery}
                onChange={(e) => updateSearchParam("search", e.target.value)}
              />
            </div>

            {/* Tag Filters */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Filter
              </label>
              <div className="space-y-1">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer text-xs hover:text-foreground transition">
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
                  className="text-[10px] text-muted-foreground hover:text-foreground transition"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
        
        <Link 
          href="/meal-plans" 
          onClick={handleMealPlansClick}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span className="text-base">📅</span>
          Meal Plans
        </Link>

        {/* Meal Plans Drawer - shows when on meal plans page and drawer is open */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isMealPlansPage && mealPlansDrawerOpen 
            ? 'max-h-[600px] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="px-3 py-3 space-y-3">
            {/* Create Button */}
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString());
                params.set("showForm", "true");
                router.push(`/meal-plans?${params.toString()}`);
              }}
              className="flex w-full items-center justify-center border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition"
            >
              + New Plan
            </button>

            {/* Create Form */}
            {showCreateForm && (
              <div className="border rounded p-3 bg-muted/40 space-y-2">
                {formMessage && (
                  <div
                    className={`border px-2 py-1.5 text-[11px] rounded ${
                      formMessage.type === 'success'
                        ? 'border-foreground/20 bg-background'
                        : 'border-rose-600/40 bg-rose-600/10'
                    }`}
                  >
                    {formMessage.text}
                  </div>
                )}
                <form onSubmit={handleCreateMealPlan} className="space-y-2">
                  <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Week start
                    <input
                      type="date"
                      value={newWeekStartDate}
                      onChange={(e) => setNewWeekStartDate(e.target.value)}
                      required
                      className="border bg-background px-2 py-1 text-xs font-normal normal-case tracking-normal text-foreground"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingPlan}
                      className="flex-1 border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted/40 transition disabled:opacity-50"
                    >
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
                      className="flex-1 border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted/40 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Plan List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingMealPlans ? (
                <div className="text-[11px] text-muted-foreground px-1">Loading plans...</div>
              ) : mealPlans.length === 0 ? (
                <div className="border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
                  No meal plans yet
                </div>
              ) : (
                mealPlans.map((plan) => {
                  const selectedPlanId = searchParams?.get("planId");
                  const isSelected = selectedPlanId === String(plan.id);
                  return (
                    <div
                      key={plan.id}
                      className={`h-[40px] flex items-center px-2 border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-muted/40 border-foreground'
                          : 'bg-background border-muted hover:bg-muted/20'
                      }`}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams?.toString());
                        params.set("planId", String(plan.id));
                        router.push(`/meal-plans?${params.toString()}`);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="truncate flex-1">
                          Week of{' '}
                          {new Date(plan.weekStartDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        {isSelected && (
                          <button
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
                            className="text-xs text-muted-foreground hover:text-destructive transition whitespace-nowrap flex-shrink-0"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <Link 
          href="/settings" 
          onClick={handleSettingsClick}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span className="text-base">⚙️</span>
          Settings
        </Link>

        {/* Settings Drawer - shows when on settings page and drawer is open */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isSettingsPage && settingsDrawerOpen 
            ? 'max-h-[200px] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}>
          <div className="px-3 py-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground px-1">
              Nutrition Goals
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString());
                  const isEditing = params.get("editing") === "true";
                  if (isEditing) {
                    params.delete("editing");
                  } else {
                    params.set("editing", "true");
                  }
                  router.push(`/settings?${params.toString()}`);
                }}
                className="w-full border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition"
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
                className="w-full border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/40 transition"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 space-y-1 mt-auto">
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
