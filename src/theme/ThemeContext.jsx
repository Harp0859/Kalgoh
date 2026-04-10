import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Theme system.
 *
 *   preference: 'light' | 'dark' | 'system'   (what the user picked)
 *   resolved:   'light' | 'dark'              (what is actually applied)
 *
 * The preference is persisted to localStorage under `kalgoh:theme`.
 * The resolved theme is written to <html data-theme="..."> and to
 * <meta name="theme-color"> so browser chrome matches the page.
 *
 * An inline <script> in index.html reads the same storage key before
 * React mounts and sets data-theme up front, so there is no flash of
 * the wrong theme on first paint.
 */

const STORAGE_KEY = 'kalgoh:theme';

const THEME_COLORS = {
  light: '#e8e5df',
  dark: '#0a0a0a',
};

const ThemeContext = createContext(null);

function readPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'system';
}

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolvePreference(preference) {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyTheme(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) metaThemeColor.setAttribute('content', THEME_COLORS[resolved]);
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [resolved, setResolved] = useState(() => resolvePreference(readPreference()));

  // Apply resolved theme whenever it changes.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // React to system theme changes while in 'system' mode.
  useEffect(() => {
    if (preference !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setResolved(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next) => {
    if (next !== 'light' && next !== 'dark' && next !== 'system') return;
    setPreferenceState(next);
    setResolved(resolvePreference(next));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
