/**
 * useTheme hook
 *
 * Manages the app-wide dark/light theme.
 *
 * Strategy:
 *   - The theme is stored in localStorage under the key "finpulse-theme".
 *   - On first load, if no stored value exists, the OS preference
 *     (prefers-color-scheme: dark) is respected.
 *   - The "dark" class is toggled on document.documentElement so that all
 *     Tailwind dark: variants respond immediately.
 *
 * The initial class application happens BEFORE first React paint via an
 * inline script in index.html, so there is no flash of the wrong theme.
 * This hook just wires up the toggle and exposes the current state.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'finpulse-theme';

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (_) {
    // localStorage may be unavailable in some environments
  }
  // Fall back to OS preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
