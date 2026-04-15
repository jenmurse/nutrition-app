export interface ThemeDef {
  name: string;
  label: string;
  hex: string;
}

export const THEMES: ThemeDef[] = [
  { name: 'coral',    label: 'Coral',    hex: '#E84828' },
  { name: 'terra',    label: 'Terra',    hex: '#C45C3A' },
  { name: 'sage',     label: 'Sage',     hex: '#5A9B6A' },
  { name: 'cerulean', label: 'Cerulean', hex: '#2B90C8' },
  { name: 'plum',     label: 'Plum',     hex: '#8B5A9E' },
  { name: 'slate',    label: 'Slate',    hex: '#5C7080' },
];

/** Map legacy theme names to the surviving 6 */
const LEGACY_MAP: Record<string, string> = {
  hotpink:     'coral',
  blush:       'terra',
  terracotta:  'terra',
  mauve:       'plum',
  burgundy:    'coral',
  olive:       'sage',
  charcoal:    'slate',
  cobalt:      'cerulean',
  emerald:     'sage',
  forest:      'sage',
  steel:       'cerulean',
  teal:        'cerulean',
  violet:      'plum',
  lavender:    'plum',
  cornflower:  'cerulean',
  periwinkle:  'cerulean',
};

/** Resolve any theme name (including legacy) to a valid current theme name */
export function resolveTheme(name: string): string {
  if (THEMES.some(t => t.name === name)) return name;
  return LEGACY_MAP[name] ?? 'sage';
}

export function themeHex(name: string): string {
  const resolved = resolveTheme(name);
  return THEMES.find(t => t.name === resolved)?.hex ?? '#5A9B6A';
}
