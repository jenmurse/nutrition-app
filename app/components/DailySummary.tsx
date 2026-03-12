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
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok':
        return 'text-[var(--fg)]';
      case 'warning':
        return 'text-[var(--warning)]';
      case 'error':
        return 'text-[var(--error)]';
      default:
        return 'text-[var(--muted)]';
    }
  };

  const getBarColor = (status?: string) => {
    switch (status) {
      case 'ok':
        return 'bg-[var(--fg)]';
      case 'warning':
        return 'bg-[var(--warning)]';
      case 'error':
        return 'bg-[var(--error)]';
      default:
        return 'bg-[var(--muted)] opacity-30';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ok':
        return 'Within range';
      case 'warning':
        return 'Below minimum';
      case 'error':
        return 'Above maximum';
      default:
        return 'No goal set';
    }
  };

  const getProgressPercentage = (
    value: number,
    lowGoal?: number,
    highGoal?: number
  ) => {
    if (!lowGoal && !highGoal) return 0;

    if (!lowGoal && highGoal) {
      return Math.min((value / highGoal) * 100, 100);
    }

    if (lowGoal && !highGoal) {
      return Math.min((value / lowGoal) * 100, 100);
    }

    const range = highGoal! - lowGoal!;
    if (value < lowGoal) {
      return (value / lowGoal) * 50;
    } else if (value > highGoal) {
      return 50 + ((value - highGoal) / (highGoal * 0.5)) * 50;
    } else {
      return ((value - lowGoal) / range) * 100;
    }
  };

  return (
    <div>
      {nutrients.map((nutrient, index) => {
        const progressPercent = getProgressPercentage(
          nutrient.value,
          nutrient.lowGoal,
          nutrient.highGoal
        );
        const statusColor = getStatusColor(nutrient.status);
        const barColor = getBarColor(nutrient.status);
        const statusLabel = getStatusLabel(nutrient.status);
        const isLast = index === nutrients.length - 1;

        return (
          <div
            key={nutrient.nutrientId}
            className={`py-4 ${!isLast ? 'border-b border-[var(--rule)]' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-sans text-[13px] font-medium text-[var(--fg)]">
                {nutrient.displayName}
              </div>
              <div className="text-right">
                <span className="font-mono text-[20px] font-normal text-[var(--fg)]">
                  {nutrient.value}
                </span>
                <span className="font-mono text-[11px] text-[var(--muted)] ml-1">
                  {nutrient.unit}
                </span>
              </div>
            </div>

            {(nutrient.lowGoal !== null && nutrient.lowGoal !== undefined) ||
            (nutrient.highGoal !== null && nutrient.highGoal !== undefined) ? (
              <div className="mt-1 text-right font-mono text-[10px] text-[var(--muted)]">
                {nutrient.lowGoal !== null && nutrient.lowGoal !== undefined
                  ? `Min ${nutrient.lowGoal}`
                  : 'Min --'}
                {' · '}
                {nutrient.highGoal !== null && nutrient.highGoal !== undefined
                  ? `Max ${nutrient.highGoal}`
                  : 'Max --'}
              </div>
            ) : null}

            <div className="mt-3">
              <div className="h-[2px] w-full bg-[var(--rule)]">
                <div
                  className={`h-[2px] ${barColor}`}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className={`mt-1 text-[10px] ${statusColor}`}>
                {statusLabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DailySummary;
