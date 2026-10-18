// Accent Theme Configuration and Custom Color Manager

export interface AccentOption {
  id: string;
  name: string;
  nameBn: string;
  lightHex: string;
  darkHex: string;
  previewHex: string;
}

export const PRESET_ACCENTS: AccentOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Green',
    nameBn: 'পান্না সবুজ',
    lightHex: '#059669',
    darkHex: '#10B981',
    previewHex: '#10B981',
  },
  {
    id: 'indigo',
    name: 'Electric Indigo',
    nameBn: 'ইন্ডিগো নীল',
    lightHex: '#4F46E5',
    darkHex: '#818CF8',
    previewHex: '#6366F1',
  },
  {
    id: 'sapphire',
    name: 'Sapphire Blue',
    nameBn: 'নীলকান্তমণি',
    lightHex: '#0284C7',
    darkHex: '#38BDF8',
    previewHex: '#0284C7',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    nameBn: 'আম্বর সোনালী',
    lightHex: '#D97706',
    darkHex: '#FBBF24',
    previewHex: '#F59E0B',
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    nameBn: 'গোলাপী লাল',
    lightHex: '#E11D48',
    darkHex: '#FB7185',
    previewHex: '#F43F5E',
  },
  {
    id: 'purple',
    name: 'Royal Violet',
    nameBn: 'রয়েল বেগুনী',
    lightHex: '#7C3AED',
    darkHex: '#C084FC',
    previewHex: '#9333EA',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    nameBn: 'সমুদ্র টিল',
    lightHex: '#0D9488',
    darkHex: '#2DD4BF',
    previewHex: '#14B8A6',
  },
];

const STORAGE_KEY = 'challan_custom_accent_color';
const THEME_PALETTE_STORAGE_KEY = 'challan_theme_palette';

export interface ThemePaletteOption {
  id: string;
  name: string;
  nameBn: string;
  desc: string;
  descBn: string;
  canvasDark: string;
  surfaceDark: string;
  elevatedDark: string;
  canvasLight: string;
  surfaceLight: string;
  previewSwatches: [string, string, string];
  scale: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export const THEME_PALETTES: ThemePaletteOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Zinc',
    nameBn: 'অবসিডিয়ান জিঙ্ক',
    desc: 'Neutral carbon & zinc',
    descBn: 'নিউট্রাল চারকোল ও জিঙ্ক',
    canvasDark: '#09090B',
    surfaceDark: '#121215',
    elevatedDark: '#1A1A1F',
    canvasLight: '#FFFFFF',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#09090B', '#18181B', '#3F3F46'],
    scale: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#09090B',
    },
  },
  {
    id: 'oled',
    name: 'Pitch Black',
    nameBn: 'পিচ ব্ল্যাক (OLED)',
    desc: 'True black high-contrast',
    descBn: 'ট্রু ব্ল্যাক হাই-কন্ট্রাস্ট',
    canvasDark: '#000000',
    surfaceDark: '#0A0A0A',
    elevatedDark: '#141414',
    canvasLight: '#FFFFFF',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#000000', '#121212', '#333333'],
    scale: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#050505',
    },
  },
  {
    id: 'espresso',
    name: 'Warm Espresso',
    nameBn: 'ওয়ার্ম এসপ্রেসো',
    desc: 'Warm stone & umber',
    descBn: 'উষ্ণ স্টোন ও কফি টেক্সচার',
    canvasDark: '#0C0A09',
    surfaceDark: '#161311',
    elevatedDark: '#211D1A',
    canvasLight: '#FDFCFB',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#0C0A09', '#1C1917', '#44403C'],
    scale: {
      50: '#FAFAF9',
      100: '#F5F5F4',
      200: '#E7E5E4',
      300: '#D6D3D1',
      400: '#A8A29E',
      500: '#78716C',
      600: '#57534E',
      700: '#44403C',
      800: '#292524',
      900: '#1C1917',
      950: '#0C0A09',
    },
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    nameBn: 'ডিপ ফরেস্ট',
    desc: 'Botanical pine & sage',
    descBn: 'বোটানিক্যাল পাইন ও সেজ',
    canvasDark: '#060C09',
    surfaceDark: '#0C1611',
    elevatedDark: '#14241C',
    canvasLight: '#F9FCFA',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#060C09', '#11221A', '#2D4F3E'],
    scale: {
      50: '#F4F9F6',
      100: '#E6F2EC',
      200: '#CEE4D9',
      300: '#A9CEBC',
      400: '#77AC93',
      500: '#52886F',
      600: '#3D6B56',
      700: '#2E5242',
      800: '#1E362B',
      900: '#112119',
      950: '#060C09',
    },
  },
  {
    id: 'plum',
    name: 'Velvet Plum',
    nameBn: 'ভেলভেট প্লাম',
    desc: 'Amethyst & dusk rose',
    descBn: 'অ্যামেথিস্ট ও ডাস্ক রোজ',
    canvasDark: '#0B070E',
    surfaceDark: '#140D19',
    elevatedDark: '#201528',
    canvasLight: '#FCFAFD',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#0B070E', '#1D1224', '#4A3259'],
    scale: {
      50: '#FAF7FC',
      100: '#F3ECF8',
      200: '#E6D8F0',
      300: '#D1BAE2',
      400: '#AC8BC6',
      500: '#8664A2',
      600: '#694B82',
      700: '#503864',
      800: '#342342',
      900: '#1E1326',
      950: '#0B070E',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Slate',
    nameBn: 'মিডনাইট স্লেট',
    desc: 'Classic deep navy slate',
    descBn: 'ক্লাসিক ডিপ নেভি ব্লু',
    canvasDark: '#07090E',
    surfaceDark: '#0D121D',
    elevatedDark: '#161F30',
    canvasLight: '#FFFFFF',
    surfaceLight: '#FFFFFF',
    previewSwatches: ['#07090E', '#0D121D', '#334155'],
    scale: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
  },
];

export function getSavedAccentColor(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.startsWith('#')) return saved;
    return '#059669'; // Default Emerald
  } catch {
    return '#059669';
  }
}

export function getSavedThemePalette(): string {
  try {
    const saved = localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
    if (saved && THEME_PALETTES.some(p => p.id === saved)) return saved;
    return 'obsidian'; // Default to neutral Obsidian Zinc
  } catch {
    return 'obsidian';
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

export function applyAccentColor(hex: string) {
  if (!hex || !hex.startsWith('#')) return;

  try {
    localStorage.setItem(STORAGE_KEY, hex);
  } catch (e) {
    // Ignore storage issues
  }

  const rgb = hexToRgb(hex) || { r: 5, g: 150, b: 105 };
  const root = document.documentElement;

  // Set CSS Custom Properties
  root.style.setProperty('--accent-color', hex);
  root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--accent-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  root.style.setProperty('--accent-subtle-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  root.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);

  // Dispatch custom event for real-time reactivity in components
  window.dispatchEvent(new CustomEvent('accent-color-changed', { detail: { hex } }));
}

export function applyThemePalette(paletteId: string) {
  const palette = THEME_PALETTES.find(p => p.id === paletteId) || THEME_PALETTES[0];

  try {
    localStorage.setItem(THEME_PALETTE_STORAGE_KEY, palette.id);
  } catch (e) {
    // Ignore storage issues
  }

  const root = document.documentElement;

  root.style.setProperty('--theme-bg-canvas', palette.canvasDark);
  root.style.setProperty('--theme-bg-surface', palette.surfaceDark);
  root.style.setProperty('--theme-bg-elevated', palette.elevatedDark);
  root.style.setProperty('--theme-light-canvas', palette.canvasLight);
  root.style.setProperty('--theme-light-surface', palette.surfaceLight);

  // Override Tailwind v4 slate & zinc color tokens dynamically so all surfaces, borders & text adapt
  (Object.keys(palette.scale) as unknown as Array<keyof typeof palette.scale>).forEach((step) => {
    const hexVal = palette.scale[step];
    root.style.setProperty(`--color-slate-${step}`, hexVal);
    root.style.setProperty(`--color-zinc-${step}`, hexVal);
  });

  window.dispatchEvent(new CustomEvent('theme-palette-changed', { detail: { paletteId: palette.id } }));
}

