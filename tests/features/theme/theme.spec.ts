import { describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME_ID,
  getTheme,
  initializeTheme,
  persistTheme,
  resolveThemeId,
  THEMES,
  THEME_STORAGE_KEY,
  THEME_TOKEN_NAMES,
  type ThemeId,
} from '@/features/theme/theme';

type FakeRoot = HTMLElement & {
  appliedTokens: Map<string, string>;
};

function createFakeRoot(): FakeRoot {
  const appliedTokens = new Map<string, string>();
  return {
    dataset: {},
    style: {
      setProperty: (name: string, value: string) => {
        appliedTokens.set(name, value);
      },
    },
    appliedTokens,
  } as unknown as FakeRoot;
}

function expectAppliedTheme(root: FakeRoot, themeId: ThemeId) {
  const theme = getTheme(themeId);
  expect(root.dataset.theme).toBe(themeId);
  expect(root.appliedTokens).toHaveLength(THEME_TOKEN_NAMES.length);
  for (const tokenName of THEME_TOKEN_NAMES) {
    expect(root.appliedTokens.get(tokenName)).toBe(theme.tokens[tokenName]);
  }
}

describe('theme engine', () => {
  it('registers the five themes in menu order with complete token sets', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([
      'dark',
      'oled',
      'light',
      'dracula',
      'catppuccin',
    ]);
    for (const theme of THEMES) {
      expect(Object.keys(theme.tokens)).toEqual([...THEME_TOKEN_NAMES]);
    }
  });

  it('resolves valid IDs and falls back to OLED for invalid values', () => {
    for (const theme of THEMES) {
      expect(resolveThemeId(theme.id)).toBe(theme.id);
    }
    expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId('')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId('unknown-theme')).toBe(DEFAULT_THEME_ID);
  });

  it('applies the selected data attribute and every CSS token', () => {
    const root = createFakeRoot();

    applyTheme(root, 'catppuccin');

    expectAppliedTheme(root, 'catppuccin');
  });

  it('initializes from storage and applies OLED for invalid or blocked storage', () => {
    const storedRoot = createFakeRoot();
    const storedTheme = { getItem: vi.fn(() => 'light') };

    expect(initializeTheme(storedTheme, storedRoot)).toBe('light');
    expectAppliedTheme(storedRoot, 'light');
    expect(storedTheme.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);

    const invalidRoot = createFakeRoot();
    expect(initializeTheme({ getItem: () => 'not-a-theme' }, invalidRoot)).toBe(DEFAULT_THEME_ID);
    expectAppliedTheme(invalidRoot, DEFAULT_THEME_ID);

    const throwingRoot = createFakeRoot();
    const throwingStorage = { getItem: () => { throw new Error('blocked'); } };
    expect(initializeTheme(throwingStorage, throwingRoot)).toBe(DEFAULT_THEME_ID);
    expectAppliedTheme(throwingRoot, DEFAULT_THEME_ID);
  });

  it('persists raw IDs and swallows storage write errors', () => {
    const setItem = vi.fn();

    persistTheme('dracula', { setItem });

    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dracula');
    expect(() => persistTheme('light', { setItem: () => { throw new Error('full'); } })).not.toThrow();
  });
});
