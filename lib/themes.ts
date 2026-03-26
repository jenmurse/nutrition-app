export interface ThemeDef {
  name: string;
  label: string;
  hex: string;
  warm: boolean;
}

export const THEMES: ThemeDef[] = [
  { name: 'sage',        label: 'Sage',        hex: '#5C9169', warm: true  },
  { name: 'coral',       label: 'Coral',       hex: '#EE636E', warm: true  },
  { name: 'hotpink',     label: 'Hot Pink',    hex: '#D43875', warm: true  },
  { name: 'blush',       label: 'Blush',       hex: '#B87880', warm: true  },
  { name: 'terracotta',  label: 'Terracotta',  hex: '#CB4D1B', warm: true  },
  { name: 'mauve',       label: 'Mauve',       hex: '#907080', warm: true  },
  { name: 'burgundy',    label: 'Burgundy',    hex: '#8A3050', warm: true  },
  { name: 'plum',        label: 'Plum',        hex: '#7A3068', warm: true  },
  { name: 'olive',       label: 'Olive',       hex: '#808838', warm: true  },
  { name: 'charcoal',    label: 'Charcoal',    hex: '#504840', warm: true  },
  { name: 'cobalt',      label: 'Cobalt',      hex: '#2858C0', warm: false },
  { name: 'emerald',     label: 'Emerald',     hex: '#1E8C58', warm: false },
  { name: 'teal',        label: 'Teal',        hex: '#1E8A84', warm: false },
  { name: 'violet',      label: 'Violet',      hex: '#6848D0', warm: false },
  { name: 'slate',       label: 'Slate',       hex: '#5878A0', warm: false },
  { name: 'lavender',    label: 'Lavender',    hex: '#7868A0', warm: false },
  { name: 'cornflower',  label: 'Cornflower',  hex: '#5C78C8', warm: false },
  { name: 'cerulean',    label: 'Cerulean',    hex: '#3890C0', warm: false },
  { name: 'periwinkle',  label: 'Periwinkle',  hex: '#8890D0', warm: false },
  { name: 'steel',       label: 'Steel',       hex: '#607888', warm: false },
];

export function themeHex(name: string): string {
  return THEMES.find(t => t.name === name)?.hex ?? '#5C9169';
}
