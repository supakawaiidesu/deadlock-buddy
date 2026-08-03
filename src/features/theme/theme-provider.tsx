import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  applyTheme,
  persistTheme,
  resolveThemeId,
  THEMES,
  type ThemeId,
} from './theme';

type ThemeContextValue = {
  themeId: ThemeId;
  themes: typeof THEMES;
  setThemeId: (themeId: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() =>
    resolveThemeId(document.documentElement.dataset.theme),
  );

  const setThemeId = (nextThemeId: ThemeId) => {
    applyTheme(document.documentElement, nextThemeId);
    persistTheme(nextThemeId);
    setThemeIdState(nextThemeId);
  };

  return (
    <ThemeContext.Provider value={{ themeId, themes: THEMES, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
