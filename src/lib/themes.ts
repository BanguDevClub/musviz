import type { Palette, ThemeId } from '../types';

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  hint: string;
  /**
   * Interface-only palette. The video palette is built independently in
   * `lib/videoStyle.ts` so changing the studio theme never touches an export.
   */
  palette: Palette;
};

export const THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark',
    hint: 'Electric lime on graphite',
    palette: {
      mode: 'dark',
      bg: '#0a0a0c',
      surface: '#16161d',
      fg: '#f7f7f8',
      muted: '#b8b8c4',
      accent: '#c9f75a',
      accent2: '#8b5cf6',
      border: '#2b2b34',
    },
  },
  {
    id: 'light',
    name: 'Light',
    hint: 'Indigo ink on warm paper',
    palette: {
      mode: 'light',
      bg: '#f2f0ea',
      surface: '#fffdf8',
      fg: '#17171a',
      muted: '#6d6d77',
      accent: '#4f46e5',
      accent2: '#0891b2',
      border: '#d9d4c9',
    },
  },
  {
    id: 'latte',
    name: 'Catppuccin Latte',
    hint: 'Soft pastel daylight',
    palette: {
      mode: 'light',
      bg: '#eff1f5',
      surface: '#f8f9fc',
      fg: '#4c4f69',
      muted: '#6c6f85',
      accent: '#8839ef',
      accent2: '#04a5e5',
      border: '#ccd0da',
    },
  },
  {
    id: 'frappe',
    name: 'Catppuccin Frappé',
    hint: 'Muted dusk tones',
    palette: {
      mode: 'dark',
      bg: '#303446',
      surface: '#292c3c',
      fg: '#c6d0f5',
      muted: '#a5adce',
      accent: '#ca9ee6',
      accent2: '#99d1db',
      border: '#414559',
    },
  },
  {
    id: 'macchiato',
    name: 'Catppuccin Macchiato',
    hint: 'Deep violet twilight',
    palette: {
      mode: 'dark',
      bg: '#24273a',
      surface: '#1e2030',
      fg: '#cad3f5',
      muted: '#a5adcb',
      accent: '#c6a0f6',
      accent2: '#91d7e3',
      border: '#363a4f',
    },
  },
  {
    id: 'mocha',
    name: 'Catppuccin Mocha',
    hint: 'The midnight classic',
    palette: {
      mode: 'dark',
      bg: '#1e1e2e',
      surface: '#181825',
      fg: '#cdd6f4',
      muted: '#a6adc8',
      accent: '#cba6f7',
      accent2: '#89dceb',
      border: '#313244',
    },
  },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId);
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}
