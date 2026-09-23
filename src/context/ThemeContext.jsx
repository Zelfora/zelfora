import { createContext, useContext, useEffect, useState } from 'react';

// Keep STORAGE_KEY and THEME_COLORS in sync with the inline script in index.html,
// which applies the theme before React loads to avoid a flash of the wrong theme.
const STORAGE_KEY = 'zelfora.theme';
const THEME_COLORS = { dark: '#120a24', light: '#ffffff' };
const LIGHT_QUERY = '(prefers-color-scheme: light)';

const ThemeContext = createContext(null);

function initialPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage unavailable: follow the system setting.
  }
  return 'system';
}

function systemTheme() {
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(initialPreference); // 'system' | 'light' | 'dark'
  const [system, setSystem] = useState(systemTheme);
  const theme = preference === 'system' ? system : preference;

  // Follow OS/browser changes live (e.g. iOS switching to dark mode at sunset).
  useEffect(() => {
    const media = window.matchMedia(LIGHT_QUERY);
    const handleChange = () => setSystem(media.matches ? 'light' : 'dark');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  function setPreference(next) {
    setPreferenceState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
