import { useState, useEffect, useCallback } from "react";
export { PRESET_THEMES, DEFAULT_THEME } from "../themes";
import { PRESET_THEMES, DEFAULT_THEME, generateCustomTheme, type ThemeVars, type CustomColors } from "../themes";

const THEME_KEY = "tori-sidebar-theme";
const CUSTOM_KEY = "tori-sidebar-custom-colors";

export type ThemeId = "dark" | "light" | "nord" | "dracula" | "custom";

export interface ThemeState {
  themeId: ThemeId;
  customColors: CustomColors;
}

function loadThemeState(): ThemeState {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.themeId === "string") {
        const customStored = localStorage.getItem(CUSTOM_KEY);
        let customColors: CustomColors = {
          background: "#1e1e22",
          text: "#fafafa",
          accent: "#0ea5e9",
        };
        if (customStored) {
          try {
            const c = JSON.parse(customStored);
            if (c.background) customColors.background = c.background;
            if (c.text) customColors.text = c.text;
            if (c.accent) customColors.accent = c.accent;
          } catch { /* ignore */ }
        }
        return { themeId: parsed.themeId as ThemeId, customColors };
      }
    }
  } catch { /* ignore */ }
  return {
    themeId: "dark",
    customColors: { background: "#1e1e22", text: "#fafafa", accent: "#0ea5e9" },
  };
}

function saveThemeState(state: ThemeState) {
  localStorage.setItem(THEME_KEY, JSON.stringify({ themeId: state.themeId }));
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(state.customColors));
}

export function applyVars(vars: ThemeVars) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function useTheme() {
  const [state, setState] = useState<ThemeState>(loadThemeState);

  const apply = useCallback((id: ThemeId, custom?: CustomColors) => {
    let vars: ThemeVars;
    if (id === "custom" && custom) {
      vars = generateCustomTheme(custom);
    } else {
      const preset = PRESET_THEMES.find((t) => t.id === id);
      vars = preset ? preset.vars : DEFAULT_THEME.vars;
    }
    applyVars(vars);
  }, []);

  useEffect(() => {
    apply(state.themeId, state.themeId === "custom" ? state.customColors : undefined);
  }, [state.themeId, state.customColors, apply]);

  const setTheme = useCallback((id: ThemeId) => {
    setState((prev) => {
      const next = { ...prev, themeId: id };
      saveThemeState(next);
      return next;
    });
  }, []);

  const setCustomColors = useCallback((colors: Partial<CustomColors>) => {
    setState((prev) => {
      const next = {
        ...prev,
        themeId: "custom" as ThemeId,
        customColors: { ...prev.customColors, ...colors },
      };
      saveThemeState(next);
      return next;
    });
  }, []);

  return {
    themeId: state.themeId,
    customColors: state.customColors,
    setTheme,
    setCustomColors,
  };
}
