import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'tokyo-night' | 'dracula' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('examwise_theme');
    if (saved === 'tokyo-night' || saved === 'dracula' || saved === 'light') {
      return saved as Theme;
    }
    // Backward compatibility with previous 'dark'
    if (saved === 'dark') return 'tokyo-night';
    return 'tokyo-night'; // Default to Tokyo Night per user request
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('tokyo-night', 'dracula', 'light', 'dark');

    if (theme === 'tokyo-night') {
      root.classList.add('dark', 'tokyo-night');
    } else if (theme === 'dracula') {
      root.classList.add('dark', 'dracula');
    } else {
      root.classList.add('light');
    }

    localStorage.setItem('examwise_theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'tokyo-night') return 'dracula';
      if (prev === 'dracula') return 'light';
      return 'tokyo-night';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const isDark = theme === 'tokyo-night' || theme === 'dracula';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
