// Shared icons for empty states across the app.
// All use strokeWidth="1.5" (lighter than nav icons at 1.8) so they read as illustrative.
// Size is controlled by the parent — default 32px.

const props = {
  width: 32,
  height: 32,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function RecipeEmptyIcon() {
  return (
    <svg {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function PantryEmptyIcon() {
  return (
    <svg {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  );
}

export function CalendarEmptyIcon() {
  return (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function MealsEmptyIcon() {
  return (
    <svg {...props}>
      <line x1="3" y1="2" x2="3" y2="22" />
      <path d="M7 2v7a4 4 0 0 1-4 4" />
      <path d="M7 2a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4v9" />
      <line x1="16" y1="2" x2="16" y2="22" />
      <path d="M16 2a5 5 0 0 1 5 5v14" />
    </svg>
  );
}

export function NoMatchesIcon() {
  return (
    <svg {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="8" x2="14" y2="14" />
      <line x1="14" y1="8" x2="8" y2="14" />
    </svg>
  );
}

export function SelectPlanIcon() {
  return (
    <svg {...props}>
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

export function ShoppingEmptyIcon() {
  return (
    <svg {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
