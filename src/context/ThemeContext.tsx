import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Theme, getTheme, DEFAULT_THEME } from "../lib/themes";

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem("aterm-theme") || DEFAULT_THEME;
  });

  const theme = getTheme(themeId);

  useEffect(() => {
    localStorage.setItem("aterm-theme", themeId);

    // Set data-theme attribute for CSS variable switching
    const root = document.documentElement;
    root.setAttribute("data-theme", themeId);

    // Also set class for dark mode (all themes are dark in aTerm)
    root.classList.add("dark");
  }, [theme, themeId]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
