'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './settings.module.css';

interface Nutrient {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  orderIndex: number;
}

const SettingsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isEditing = searchParams?.get("editing") === "true";
  const shouldReset = searchParams?.get("reset") === "true";
  
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [goals, setGoals] = useState<Record<number, { lowGoal?: number; highGoal?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchNutrients();
  }, []);

  useEffect(() => {
    if (shouldReset && nutrients.length > 0) {
      const defaultGoals: Record<number, { lowGoal?: number; highGoal?: number }> = {};
      nutrients.forEach((nutrient) => {
        defaultGoals[nutrient.id] = { lowGoal: undefined, highGoal: undefined };
      });
      setGoals(defaultGoals);
      // Clear the reset param from URL
      const params = new URLSearchParams(searchParams?.toString());
      params.delete("reset");
      params.set("editing", "true");
      router.push(`/settings?${params.toString()}`);
    }
  }, [shouldReset, nutrients]);

  const fetchNutrients = async () => {
    try {
      setLoading(true);
      // First, fetch all nutrients from the database
      const nutrientsResponse = await fetch('/api/nutrients');
      if (!nutrientsResponse.ok) throw new Error('Failed to fetch nutrients');
      const nutrientsData = await nutrientsResponse.json();
      setNutrients(nutrientsData);

      const goalsResponse = await fetch('/api/nutrition-goals');
      const savedGoals = goalsResponse.ok ? await goalsResponse.json() : { goals: {} };

      // Initialize goals with saved values
      const defaultGoals: Record<number, { lowGoal?: number; highGoal?: number }> = {};
      nutrientsData.forEach((nutrient: Nutrient) => {
        defaultGoals[nutrient.id] = {
          lowGoal: savedGoals.goals?.[nutrient.id]?.lowGoal ?? undefined,
          highGoal: savedGoals.goals?.[nutrient.id]?.highGoal ?? undefined,
        };
      });
      setGoals(defaultGoals);
    } catch (error) {
      console.error('Error fetching nutrients:', error);
      setMessage({ type: 'error', text: 'Failed to load nutrients' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (
    nutrientId: number,
    field: 'lowGoal' | 'highGoal',
    value: string
  ) => {
    setGoals((prev) => ({
      ...prev,
      [nutrientId]: {
        ...prev[nutrientId],
        [field]: value === '' ? undefined : parseFloat(value),
      },
    }));
  };

  const handleSaveGoals = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/nutrition-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      });

      if (!response.ok) {
        throw new Error('Failed to save goals');
      }

      setMessage({ type: 'success', text: 'Nutrition goals saved successfully!' });
      // Exit edit mode via URL
      const params = new URLSearchParams(searchParams?.toString());
      params.delete("editing");
      router.push(`/settings?${params.toString()}`);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving goals:', error);
      setMessage({ type: 'error', text: 'Failed to save nutrition goals' });
    } finally {
      setSaving(false);
    }
  };

  const formatGoal = (value?: number) => {
    if (value === undefined || Number.isNaN(value)) return 'None';
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-muted-foreground">Loading nutrition settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <div className={styles.container}>
            <h1 className="text-xl font-semibold mb-2">Nutrition Settings</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Set your daily nutrition goals. Set minimum (low goal) and maximum (high goal) daily
              intake targets for each nutrient.
            </p>

          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

            <div className={styles.goalsForm}>

              {!isEditing ? (
                <div className="border divide-y">
                  {nutrients.map((nutrient) => (
                    <div key={nutrient.id} className="px-4 py-2.5 transition hover:bg-muted/20">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {nutrient.displayName} <span className="font-normal text-xs text-muted-foreground">({nutrient.unit})</span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs whitespace-nowrap">
                          <div>
                            <span className="font-semibold">Min:</span>{' '}
                            <span className="font-mono">{formatGoal(goals[nutrient.id]?.lowGoal)}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Max:</span>{' '}
                            <span className="font-mono">{formatGoal(goals[nutrient.id]?.highGoal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className={styles.nutrientsList}>
                    {nutrients.map((nutrient) => (
                      <div key={nutrient.id} className={styles.nutrientRow}>
                        <div className={styles.nutrientLabel}>
                          <h3>{nutrient.displayName}</h3>
                          <p>{nutrient.unit}</p>
                        </div>

                        <div className={styles.goalInputs}>
                          <div className={styles.inputGroup}>
                            <label htmlFor={`low-${nutrient.id}`}>Min Goal</label>
                            <input
                              id={`low-${nutrient.id}`}
                              type="number"
                              placeholder="No minimum"
                              value={goals[nutrient.id]?.lowGoal ?? ''}
                              onChange={(e) =>
                                handleGoalChange(nutrient.id, 'lowGoal', e.target.value)
                              }
                              step="0.1"
                            />
                          </div>

                          <div className={styles.inputGroup}>
                            <label htmlFor={`high-${nutrient.id}`}>Max Goal</label>
                            <input
                              id={`high-${nutrient.id}`}
                              type="number"
                              placeholder="No maximum"
                              value={goals[nutrient.id]?.highGoal ?? ''}
                              onChange={(e) =>
                                handleGoalChange(nutrient.id, 'highGoal', e.target.value)
                              }
                              step="0.1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                      onClick={handleSaveGoals}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams?.toString());
                        params.delete("editing");
                        router.push(`/settings?${params.toString()}`);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
