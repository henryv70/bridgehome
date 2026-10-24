import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useMedia } from '@/hooks/use-media';

type Theme = 'light' | 'dark' | 'system';
const KEY = 'bridgehome.theme';
const ThemeContext = createContext<{ theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (t: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme) || 'system');
  const systemDark = useMedia('(prefers-color-scheme: dark)');
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);
  const set = (t: Theme) => { localStorage.setItem(KEY, t); setTheme(t); };
  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: set }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw Error('useTheme must be used inside ThemeProvider');
  return v;
}
