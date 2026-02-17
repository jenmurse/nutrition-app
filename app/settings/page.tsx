'use client';

import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';

interface Nutrient {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  orderIndex: number;
}

const SettingsPage = () => {
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [goals, setGoals] = useState<Record<number, { lowGoal?: number; highGoal?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchNutrients();
  }, []);

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
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving goals:', error);
      setMessage({ type: 'error', text: 'Failed to save nutrition goals' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetGoals = () => {
    const defaultGoals: Record<number, { lowGoal?: number; highGoal?: number }> = {};
    nutrients.forEach((nutrient) => {
      defaultGoals[nutrient.id] = { lowGoal: undefined, highGoal: undefined };
    });
    setGoals(defaultGoals);
  };

  const formatGoal = (value?: number) => {
    if (value === undefined || Number.isNaN(value)) return 'None';
    return value.toString();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading nutrition settings...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Nutrition Settings</h1>
        <p>Set your daily nutrition goals</p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.goalsForm}>
        <div className={styles.formIntroRow}>
          <div className={styles.formIntro}>
            <p>
              Set minimum (low goal) and maximum (high goal) daily intake targets for each nutrient.
              Leave empty for no limit.
            </p>
          </div>
          <button
            className={styles.editButton}
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? 'Close' : 'Edit Goals'}
          </button>
        </div>

        {!isEditing ? (
          <div className={styles.summaryList}>
            {nutrients.map((nutrient) => (
              <div key={nutrient.id} className={styles.summaryRow}>
                <div>
                  <div className={styles.summaryName}>{nutrient.displayName}</div>
                  <div className={styles.summaryUnit}>{nutrient.unit}</div>
                </div>
                <div className={styles.summaryValues}>
                  <span className="font-mono">Min: {formatGoal(goals[nutrient.id]?.lowGoal)}</span>
                  <span className="font-mono">Max: {formatGoal(goals[nutrient.id]?.highGoal)}</span>
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

            <div className={styles.actions}>
              <button
                className={styles.saveButton}
                onClick={handleSaveGoals}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Goals'}
              </button>
              <button
                className={styles.resetButton}
                onClick={handleResetGoals}
                disabled={saving}
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default SettingsPage;
