export const THEME_STORAGE_KEY = 'deadlock-buddy-theme.v1';
export const DEFAULT_THEME_ID = 'deadlock';

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
    id: 'deadlock',
    label: 'Deadlock',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#0d1214',
      '--foreground': '#e4ded2',
      '--surface': '#141b1d',
      '--surface-muted': '#192427',
      '--surface-raised': '#1f3a4a',
      '--panel-background': 'rgba(20,27,29,0.96)',
      '--overlay-background': 'rgba(10,16,18,0.98)',
      '--overlay-soft-background': 'rgba(20,27,29,0.96)',
      '--inset-background': 'rgba(31,58,74,0.48)',
      '--text-strong': '#fbedd7',
      '--text-rgb': '228 222 210',
      '--neutral-rgb': '251 237 215',
      '--shadow-rgb': '5 8 9',
      '--accent': '#4e9a78',
      '--accent-rgb': '78 154 120',
      '--accent-contrast': '#0d1214',
      '--danger': '#d26e67',
      '--info': '#72a6bf',
      '--success': '#6db58e',
    },
  },
  {
    id: 'deep-teal',
    label: 'Deep Teal',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#081312',
      '--foreground': '#d9e3da',
      '--surface': '#0e201e',
      '--surface-muted': '#152c29',
      '--surface-raised': '#1d3d38',
      '--panel-background': 'rgba(14,32,30,0.96)',
      '--overlay-background': 'rgba(7,16,15,0.98)',
      '--overlay-soft-background': 'rgba(14,32,30,0.96)',
      '--inset-background': 'rgba(29,61,56,0.58)',
      '--text-strong': '#fbedd7',
      '--text-rgb': '217 227 218',
      '--neutral-rgb': '217 227 218',
      '--shadow-rgb': '0 5 5',
      '--accent': '#65b89a',
      '--accent-rgb': '101 184 154',
      '--accent-contrast': '#081312',
      '--danger': '#d97870',
      '--info': '#76acbd',
      '--success': '#83c79f',
    },
  },
  {
    id: 'cold-slate',
    label: 'Cold Slate',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#0a1015',
      '--foreground': '#d8e0df',
      '--surface': '#101a22',
      '--surface-muted': '#172630',
      '--surface-raised': '#1f3a4a',
      '--panel-background': 'rgba(16,26,34,0.96)',
      '--overlay-background': 'rgba(8,14,19,0.98)',
      '--overlay-soft-background': 'rgba(16,26,34,0.96)',
      '--inset-background': 'rgba(31,58,74,0.62)',
      '--text-strong': '#fbedd7',
      '--text-rgb': '216 224 223',
      '--neutral-rgb': '216 224 223',
      '--shadow-rgb': '2 5 8',
      '--accent': '#6ca8bc',
      '--accent-rgb': '108 168 188',
      '--accent-contrast': '#0a1015',
      '--danger': '#d47572',
      '--info': '#7db9d0',
      '--success': '#62a887',
    },
  },
  {
    id: 'occult',
    label: 'Occult',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#0d0e14',
      '--foreground': '#dedbd5',
      '--surface': '#151620',
      '--surface-muted': '#1d1e2b',
      '--surface-raised': '#292b3d',
      '--panel-background': 'rgba(21,22,32,0.96)',
      '--overlay-background': 'rgba(11,12,18,0.98)',
      '--overlay-soft-background': 'rgba(21,22,32,0.96)',
      '--inset-background': 'rgba(41,43,61,0.62)',
      '--text-strong': '#fbedd7',
      '--text-rgb': '222 219 213',
      '--neutral-rgb': '222 219 213',
      '--shadow-rgb': '3 3 8',
      '--accent': '#998cba',
      '--accent-rgb': '153 140 186',
      '--accent-contrast': '#0d0e14',
      '--danger': '#d9828f',
      '--info': '#83a7c7',
      '--success': '#72aa8d',
    },
  },
  {
    id: 'true-black',
    label: 'True Black',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#020505',
      '--foreground': '#d9e1dc',
      '--surface': '#07100f',
      '--surface-muted': '#0c1917',
      '--surface-raised': '#132925',
      '--panel-background': 'rgba(7,16,15,0.96)',
      '--overlay-background': 'rgba(2,5,5,0.98)',
      '--overlay-soft-background': 'rgba(7,16,15,0.96)',
      '--inset-background': 'rgba(19,41,37,0.64)',
      '--text-strong': '#fbedd7',
      '--text-rgb': '217 225 220',
      '--neutral-rgb': '217 225 220',
      '--shadow-rgb': '0 0 0',
      '--accent': '#4e9a78',
      '--accent-rgb': '78 154 120',
      '--accent-contrast': '#020505',
      '--danger': '#cf6d68',
      '--info': '#6d9fb5',
      '--success': '#69ac89',
    },
  },
  {
    id: 'fog',
    label: 'Fog',
    tokens: {
      '--color-scheme': 'dark',
      '--background': '#151a1b',
      '--foreground': '#d5d8d2',
      '--surface': '#1c2425',
      '--surface-muted': '#253032',
      '--surface-raised': '#2c3d42',
      '--panel-background': 'rgba(28,36,37,0.96)',
      '--overlay-background': 'rgba(20,26,27,0.98)',
      '--overlay-soft-background': 'rgba(28,36,37,0.96)',
      '--inset-background': 'rgba(44,61,66,0.62)',
      '--text-strong': '#f3e8d5',
      '--text-rgb': '213 216 210',
      '--neutral-rgb': '213 216 210',
      '--shadow-rgb': '5 8 9',
      '--accent': '#69a88d',
      '--accent-rgb': '105 168 141',
      '--accent-contrast': '#151a1b',
      '--danger': '#cf7974',
      '--info': '#76a1b2',
      '--success': '#78b295',
    },
  },
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
