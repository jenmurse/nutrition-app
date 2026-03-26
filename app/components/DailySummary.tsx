'use client';

import React from 'react';

interface NutrientData {
  nutrientId: number;
  nutrientName: string;
  displayName: string;
  unit: string;
  value: number;
  lowGoal?: number;
  highGoal?: number;
  status?: 'ok' | 'warning' | 'error';
}

interface DailySummaryProps {
  dayOfWeek: string;
  date: Date;
  nutrients: NutrientData[];
  variant?: 'card' | 'flat';
}

const DailySummary: React.FC<DailySummaryProps> = ({
  dayOfWeek,
  date,
  nutrients,
  variant = 'card',
}) => {
  const formatVal = (v: number) => {
    const r = Math.round(v);
    return r >= 1000 ? r.toLocaleString() : String(r);
  };

  return (
    <div>
      {nutrients.map((nutrient) => {
        const target = nutrient.highGoal ?? nutrient.lowGoal ?? 0;
        const pct = target > 0 ? Math.min(Math.round((nutrient.value / target) * 100), 100) : 0;
        const isOverMax = nutrient.highGoal && nutrient.highGoal > 0 && nutrient.value > nutrient.highGoal;
        const isWarn = nutrient.status === 'warning';
        const barColor = 'bg-[var(--accent)]';
        const valueColor = 'text-[var(--muted)]';
        const unitSuffix = nutrient.displayName.toLowerCase() === 'calories' ? '' : ` ${nutrient.unit}`;

        return (
          <div key={nutrient.nutrientId} className="mb-3">
            <div className="flex justify-between items-baseline mb-[5px]">
              <span className="font-mono text-[10px] text-[var(--fg)] uppercase tracking-[0.06em]">{nutrient.displayName}</span>
              <span className={`font-mono text-[10px] tabular-nums ${valueColor}`}>
                {formatVal(nutrient.value)} / {formatVal(target)}{unitSuffix}
              </span>
            </div>
            <div className="h-[4px] bg-[var(--bg-subtle)] rounded-[var(--radius-sm,4px)] overflow-hidden">
              <div
                className={`h-full rounded-[var(--radius-sm,4px)] ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DailySummary;
