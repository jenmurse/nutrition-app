'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
      const params = new URLSearchParams(searchParams?.toString());
      params.delete("reset");
      params.set("editing", "true");
      router.push(`/settings?${params.toString()}`);
    }
  }, [shouldReset, nutrients]);

  const fetchNutrients = async () => {
    try {
      setLoading(true);
      const nutrientsResponse = await fetch('/api/nutrients');
      if (!nutrientsResponse.ok) throw new Error('Failed to fetch nutrients');
      const nutrientsData = await nutrientsResponse.json();
      setNutrients(nutrientsData);

      const goalsResponse = await fetch('/api/nutrition-goals');
      const savedGoals = goalsResponse.ok ? await goalsResponse.json() : { goals: {} };

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

      if (!response.ok) throw new Error('Failed to save goals');

      setMessage({ type: 'success', text: 'Nutrition goals saved successfully!' });
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
    if (value === undefined || Number.isNaN(value)) return '—';
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-baseline justify-between gap-4 px-7 pt-6 pb-5 border-b border-[var(--rule)]" style={{ flexShrink: 0 }}>
          <div>
            <div className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[3px]">Settings</div>
            <div className="font-sans text-[16px] font-normal tracking-[-0.01em]">Nutrition Goals</div>
          </div>
        </div>
        <div className="flex-1 p-7">
          <div className="text-[11px] text-[var(--muted)]">Loading nutrition settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Head */}
      <div className="flex items-baseline justify-between gap-4 px-7 pt-6 pb-5 border-b border-[var(--rule)]" style={{ flexShrink: 0 }}>
        <div>
          <div className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[3px]">Settings</div>
          <div className="font-sans text-[16px] font-normal tracking-[-0.01em]">Nutrition Goals</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {message && (
          <div className={`px-7 py-3 text-[11px] border-b border-[var(--rule)] ${
            message.type === 'success' ? 'text-[#2a7a2a]' : 'text-[var(--error)]'
          }`}>
            {message.text}
          </div>
        )}

        {!isEditing ? (
          /* View Mode — settings rows */
          <div>
            {nutrients.map((nutrient) => (
              <div
                key={nutrient.id}
                className="flex items-center justify-between gap-4 py-[10px] px-7 border-b border-[var(--rule)]"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-[12px] font-normal text-[var(--fg)]">{nutrient.displayName}</span>
                  <span className="text-[10px] text-[var(--muted)]">{nutrient.unit}</span>
                </div>
                <div className="flex gap-6 text-[11px] text-[var(--muted)] text-right">
                  <span>Min <span className="text-[var(--fg)] text-[11px]">{formatGoal(goals[nutrient.id]?.lowGoal)}</span></span>
                  <span>Max <span className="text-[var(--fg)] text-[11px]">{formatGoal(goals[nutrient.id]?.highGoal)}</span></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Edit Mode */
          <div className="p-7">
            <div className="space-y-4">
              {nutrients.map((nutrient) => (
                <div key={nutrient.id} className="grid grid-cols-[150px_1fr] gap-3 py-[10px] px-3 border border-[var(--rule)] items-start">
                  <div className="pt-[2px]">
                    <div className="font-sans text-[12px] font-normal">{nutrient.displayName}</div>
                    <div className="text-[10px] text-[var(--muted)]">{nutrient.unit}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-1">Min Goal</label>
                      <input
                        type="number"
                        placeholder="No minimum"
                        value={goals[nutrient.id]?.lowGoal ?? ''}
                        onChange={(e) => handleGoalChange(nutrient.id, 'lowGoal', e.target.value)}
                        step="0.1"
                        className="w-full bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 font-mono text-[12px] font-light text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-1">Max Goal</label>
                      <input
                        type="number"
                        placeholder="No maximum"
                        value={goals[nutrient.id]?.highGoal ?? ''}
                        onChange={(e) => handleGoalChange(nutrient.id, 'highGoal', e.target.value)}
                        step="0.1"
                        className="w-full bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 font-mono text-[12px] font-light text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5 border-t border-[var(--rule)] pt-4">
              <button
                onClick={handleSaveGoals}
                disabled={saving}
                className="bg-[var(--fg)] text-[var(--bg)] py-[8px] px-5 text-[9px] tracking-[0.12em] uppercase border-0 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.delete("editing");
                  router.push(`/settings?${params.toString()}`);
                }}
                disabled={saving}
                className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] tracking-[0.12em] uppercase border-0 cursor-pointer hover:text-[var(--fg)] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function SettingsPageWrapper() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}

export default SettingsPageWrapper;
