'use client';

import React from 'react';
import styles from './DailySummary.module.css';

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
}

const DailySummary: React.FC<DailySummaryProps> = ({
  dayOfWeek,
  date,
  nutrients,
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ok':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getProgressPercentage = (
    value: number,
    lowGoal?: number,
    highGoal?: number
  ) => {
    // If no goals, default to a reasonable scale
    if (!lowGoal && !highGoal) return 0;

    // If only high goal, percentage of high goal
    if (!lowGoal && highGoal) {
      return Math.min((value / highGoal) * 100, 100);
    }

    // If only low goal, percentage of low goal
    if (lowGoal && !highGoal) {
      return Math.min((value / lowGoal) * 100, 100);
    }

    // If both goals, scale between them
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          {dayOfWeek} - {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </h3>
      </div>

      <div className={styles.nutrientsList}>
        {nutrients.map((nutrient) => {
          const progressPercent = getProgressPercentage(
            nutrient.value,
            nutrient.lowGoal,
            nutrient.highGoal
          );
          const statusColor = getStatusColor(nutrient.status);
          const statusIcon = getStatusIcon(nutrient.status);

          return (
            <div key={nutrient.nutrientId} className={styles.nutrientCard}>
              <div className={styles.nutrientHeader}>
                <div className={styles.nutrientName}>
                  <span
                    className={styles.statusIcon}
                    style={{ color: statusColor }}
                  >
                    {statusIcon}
                  </span>
                  {nutrient.displayName}
                </div>
                <div className={styles.nutrientValue}>
                  <span className={styles.actualValue}>{nutrient.value}</span>
                  <span className={styles.unit}>{nutrient.unit}</span>
                </div>
              </div>

              <div className={styles.goalInfo}>
                {nutrient.lowGoal !== null &&
                  nutrient.lowGoal !== undefined && (
                    <span className={styles.goal}>
                      Min: {nutrient.lowGoal}
                    </span>
                  )}
                {nutrient.highGoal !== null &&
                  nutrient.highGoal !== undefined && (
                    <span className={styles.goal}>
                      Max: {nutrient.highGoal}
                    </span>
                  )}
              </div>

              <div className={styles.progressBarContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(progressPercent, 100)}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
                {nutrient.lowGoal !== null &&
                  nutrient.lowGoal !== undefined && (
                    <div
                      className={styles.goalMarker}
                      style={{
                        left: `${
                          nutrient.highGoal
                            ? ((nutrient.lowGoal -
                                (nutrient.lowGoal === 0 ? 0 : nutrient.lowGoal * 0.5)) /
                                nutrient.highGoal) *
                              100
                            : 50
                        }%`,
                      }}
                    />
                  )}
              </div>

              <div className={styles.statusText}>
                {nutrient.status === 'ok' && (
                  <span style={{ color: '#4caf50' }}>✓ Within range</span>
                )}
                {nutrient.status === 'warning' && (
                  <span style={{ color: '#ff9800' }}>⚠ Below minimum</span>
                )}
                {nutrient.status === 'error' && (
                  <span style={{ color: '#f44336' }}>✗ Above maximum</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailySummary;
