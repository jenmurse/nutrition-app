/**
 * Shared domain types used across components and pages.
 * Import from here instead of defining locally.
 */

export type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

export type Goal = {
  nutrientId: number;
  lowGoal?: number | null;
  highGoal?: number | null;
  nutrient: { displayName: string; unit: string };
};
