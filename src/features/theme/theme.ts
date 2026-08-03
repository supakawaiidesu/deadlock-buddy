export const THEME_STORAGE_KEY = 'deadlock-buddy-theme.v1';
export const DEFAULT_THEME_ID = 'oled';

export const THEME_TOKEN_NAMES = [
  '--color-scheme',
  '--background',
  '--foreground',
  '--surface',
  '--surface-muted',
  '--surface-raised',
  '--panel-background',
  '--overlay-background',
  '--overlay-soft-background',
  '--inset-background',
  '--text-strong',
  '--text-rgb',
  '--neutral-rgb',
  '--shadow-rgb',
  '--accent',
  '--accent-rgb',
  '--accent-contrast',
  '--danger',
  '--info',
  '--success',
] as const;

export type ThemeTokens = Record<(typeof THEME_TOKEN_NAMES)[number], string>;

export type ThemeDefinition = {
  id: string;
  label: string;
  tokens: ThemeTokens;
};

export const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#111318',
      '--foreground': '#e7ebe8',
      '--surface': '#171a20',
      '--surface-muted': '#1c2027',
      '--surface-raised': '#232832',
      '--panel-background': 'rgba(23,26,32,0.96)',
      '--overlay-background': 'rgba(23,26,32,0.98)',
      '--overlay-soft-background': 'rgba(23,26,32,0.96)',
      '--inset-background': 'rgba(28,32,39,0.94)',
      '--text-strong': '#ffffff',
      '--text-rgb': '231 235 232',
      '--neutral-rgb': '255 255 255',
      '--shadow-rgb': '0 0 0',
      '--accent': '#3fc96d',
      '--accent-rgb': '63 201 109',
      '--accent-contrast': '#061109',
      '--danger': '#f87171',
      '--info': '#38bdf8',
      '--success': '#4ade80',
    },
  },
  {
    id: 'oled',
    label: 'OLED',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#040405',
      '--foreground': '#f2f4f2',
      '--surface': '#08080a',
      '--surface-muted': '#0b0c0f',
      '--surface-raised': '#101015',
      '--panel-background': 'rgba(10,10,12,0.94)',
      '--overlay-background': 'rgba(8,12,11,0.97)',
      '--overlay-soft-background': 'rgba(8,12,11,0.95)',
      '--inset-background': 'rgba(8,8,10,0.90)',
      '--text-strong': '#ffffff',
      '--text-rgb': '245 247 245',
      '--neutral-rgb': '255 255 255',
      '--shadow-rgb': '0 0 0',
      '--accent': '#3fc96d',
      '--accent-rgb': '63 201 109',
      '--accent-contrast': '#000000',
      '--danger': '#f87171',
      '--info': '#38bdf8',
      '--success': '#4ade80',
    },
  },
  {
    id: 'light',
    label: 'Light',
    tokens: {
      '--color-scheme': 'light',
      '--background': '#f2f4f3',
      '--foreground': '#1b211e',
      '--surface': '#ffffff',
      '--surface-muted': '#ecefed',
      '--surface-raised': '#e3e8e5',
      '--panel-background': 'rgba(255,255,255,0.96)',
      '--overlay-background': 'rgba(255,255,255,0.98)',
      '--overlay-soft-background': 'rgba(255,255,255,0.96)',
      '--inset-background': 'rgba(244,246,245,0.94)',
      '--text-strong': '#111713',
      '--text-rgb': '27 33 30',
      '--neutral-rgb': '27 33 30',
      '--shadow-rgb': '15 23 42',
      '--accent': '#147a3d',
      '--accent-rgb': '20 122 61',
      '--accent-contrast': '#ffffff',
      '--danger': '#b42335',
      '--info': '#0369a1',
      '--success': '#157347',
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#1e1f29',
      '--foreground': '#f8f8f2',
      '--surface': '#282a36',
      '--surface-muted': '#2d303e',
      '--surface-raised': '#373a4a',
      '--panel-background': 'rgba(40,42,54,0.96)',
      '--overlay-background': 'rgba(40,42,54,0.98)',
      '--overlay-soft-background': 'rgba(40,42,54,0.96)',
      '--inset-background': 'rgba(33,34,44,0.94)',
      '--text-strong': '#ffffff',
      '--text-rgb': '248 248 242',
      '--neutral-rgb': '248 248 242',
      '--shadow-rgb': '0 0 0',
      '--accent': '#bd93f9',
      '--accent-rgb': '189 147 249',
      '--accent-contrast': '#1e1f29',
      '--danger': '#ff5555',
      '--info': '#8be9fd',
      '--success': '#50fa7b',
    },
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#1e1e2e',
      '--foreground': '#cdd6f4',
      '--surface': '#181825',
      '--surface-muted': '#313244',
      '--surface-raised': '#45475a',
      '--panel-background': 'rgba(24,24,37,0.96)',
      '--overlay-background': 'rgba(17,17,27,0.98)',
      '--overlay-soft-background': 'rgba(24,24,37,0.96)',
      '--inset-background': 'rgba(49,50,68,0.94)',
      '--text-strong': '#cdd6f4',
      '--text-rgb': '205 214 244',
      '--neutral-rgb': '166 173 200',
      '--shadow-rgb': '0 0 0',
      '--accent': '#cba6f7',
      '--accent-rgb': '203 166 247',
      '--accent-contrast': '#1e1e2e',
      '--danger': '#f38ba8',
      '--info': '#89b4fa',
      '--success': '#a6e3a1',
    },
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]['id'];

export function resolveThemeId(value: unknown): ThemeId {
  if (typeof value === 'string' && THEMES.some((theme) => theme.id === value)) {
    return value as ThemeId;
  }
  return DEFAULT_THEME_ID;
}

export function getTheme(themeId: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === themeId)!;
}

export function applyTheme(root: HTMLElement, themeId: ThemeId): void {
  const theme = getTheme(themeId);
  root.dataset.theme = theme.id;
  for (const tokenName of THEME_TOKEN_NAMES) {
    root.style.setProperty(tokenName, theme.tokens[tokenName]);
  }
}

export function initializeTheme(
  storage?: Pick<Storage, 'getItem'>,
  root?: HTMLElement,
): ThemeId {
  let storedTheme: string | null = null;
  try {
    storedTheme = storage
      ? storage.getItem(THEME_STORAGE_KEY)
      : window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    storedTheme = null;
  }

  const themeId = resolveThemeId(storedTheme);
  applyTheme(root ?? document.documentElement, themeId);
  return themeId;
}

export function persistTheme(
  themeId: ThemeId,
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    if (storage) {
      storage.setItem(THEME_STORAGE_KEY, themeId);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  } catch {
    // Storage failures should not block an in-session theme change.
  }
}
