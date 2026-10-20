import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
/** 'colorblind' remaps the semantic green/red/rose utilities to a blue/vermilion scheme (see index.css .cb-safe). */
export type Palette = 'default' | 'colorblind';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  palette: Palette;
  togglePalette: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [palette, setPalette] = useState<Palette>(() =>
    localStorage.getItem('stackatlas_palette') === 'colorblind' ? 'colorblind' : 'default',
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('cb-safe', palette === 'colorblind');
    localStorage.setItem('stackatlas_palette', palette);
  }, [palette]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const togglePalette = () => {
    setPalette(prev => (prev === 'colorblind' ? 'default' : 'colorblind'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, togglePalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
