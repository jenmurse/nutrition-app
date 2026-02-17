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
  const isFlat = variant === 'flat';
  const getStatusColorClass = (status?: string) => {
    switch (status) {
      case 'ok':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-rose-600';
      default:
        return 'text-muted-foreground';
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
    <div className={isFlat ? 'bg-transparent p-0' : 'border bg-card'}>
      <div className={isFlat ? 'space-y-3' : 'divide-y'}>
        {nutrients.map((nutrient) => {
          const progressPercent = getProgressPercentage(
            nutrient.value,
            nutrient.lowGoal,
            nutrient.highGoal
          );
          const statusClass = getStatusColorClass(nutrient.status);

          return (
            <div
              key={nutrient.nutrientId}
              className={isFlat ? 'py-2' : 'px-4 py-3'}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold">
                  {nutrient.displayName}
                </div>
                <div className="flex items-center gap-2 text-right text-[10px] text-muted-foreground">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {nutrient.value}
                    <span className="ml-1 text-[10px] text-muted-foreground">{nutrient.unit}</span>
                  </span>
                  {(nutrient.lowGoal !== null && nutrient.lowGoal !== undefined) ||
                  (nutrient.highGoal !== null && nutrient.highGoal !== undefined) ? (
                    <span className={`font-mono ${isFlat ? 'border px-1.5 py-0.5' : 'border bg-muted/20 px-1.5 py-0.5'}`}>
                      {nutrient.lowGoal !== null && nutrient.lowGoal !== undefined
                        ? `Min ${nutrient.lowGoal}`
                        : 'Min —'}
                      {nutrient.highGoal !== null && nutrient.highGoal !== undefined
                        ? ` · Max ${nutrient.highGoal}`
                        : ' · Max —'}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="h-1 w-full bg-muted">
                  <div
                    className={`h-1 ${
                      nutrient.status === 'ok'
                        ? 'bg-foreground'
                        : nutrient.status === 'warning'
                        ? 'bg-amber-500'
                        : nutrient.status === 'error'
                        ? 'bg-rose-600'
                        : 'bg-muted-foreground/40'
                    }`}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                <div className={`text-[10px] ${statusClass}`}>
                  {nutrient.status === 'ok' && 'Within range'}
                  {nutrient.status === 'warning' && 'Below minimum'}
                  {nutrient.status === 'error' && 'Above maximum'}
                  {!nutrient.status && 'No goal set'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailySummary;
