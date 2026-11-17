import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '../lib/constants';
import { getTheme, isThemeId, type ThemeDefinition } from '../lib/themes';
import type { ThemeId } from '../types';

export function useTheme(): {
  theme: ThemeId;
  definition: ThemeDefinition;
  setTheme: (theme: ThemeId) => void;
} {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const fromDocument = document.documentElement.dataset.theme;
    return isThemeId(fromDocument) ? fromDocument : 'dark';
  });
  const definition = getTheme(theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be disabled; the in-memory theme still applies.
    }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content = definition.palette.bg;
    }
  }, [theme, definition]);

  return { theme, definition, setTheme };
}
