export interface ThemeVars {
  // Backgrounds
  "--bg-primary": string;
  "--bg-secondary": string;
  "--bg-hover": string;
  "--bg-active": string;
  "--bg-card": string;
  "--bg-input": string;
  "--bg-overlay": string;
  // Text
  "--text-primary": string;
  "--text-secondary": string;
  "--text-muted": string;
  "--text-tertiary": string;
  "--text-dim": string;
  "--text-inverse": string;
  // Border
  "--border": string;
  "--border-medium": string;
  "--border-strong": string;
  // Accent
  "--accent": string;
  "--accent-hover": string;
  "--accent-light": string;
  "--accent-bg": string;
  "--accent-bg-hover": string;
  "--accent-border": string;
  "--accent-border-weak": string;
  // Functional
  "--success": string;
  "--success-hover": string;
  "--success-bg": string;
  "--error": string;
  "--error-hover": string;
  "--error-bg": string;
  "--error-bg-hover": string;
  "--error-solid": string;
  "--error-border": string;
  "--warning": string;
  "--warning-bg": string;
  "--warning-bg-hover": string;
  "--warning-border": string;
  "--purple": string;
  "--purple-bg": string;
  "--purple-bg-hover": string;
  "--purple-border": string;
  // Misc
  "--slider-bg": string;
  "--shadow": string;
  "--icon-filter": string;
}

export interface Theme {
  id: string;
  name: string;
  vars: ThemeVars;
}

export const PRESET_THEMES: Theme[] = [
  {
    id: "dark",
    name: "Dark",
    vars: {
      "--bg-primary": "rgba(30, 30, 34, 0.98)",
      "--bg-secondary": "#252529",
      "--bg-hover": "rgba(255, 255, 255, 0.08)",
      "--bg-active": "rgba(255, 255, 255, 0.06)",
      "--bg-card": "rgba(255, 255, 255, 0.03)",
      "--bg-input": "rgba(255, 255, 255, 0.04)",
      "--bg-overlay": "rgba(0, 0, 0, 0.5)",
      "--text-primary": "#fafafa",
      "--text-secondary": "#e4e4e7",
      "--text-muted": "rgba(255, 255, 255, 0.6)",
      "--text-tertiary": "rgba(255, 255, 255, 0.5)",
      "--text-dim": "rgba(255, 255, 255, 0.25)",
      "--text-inverse": "#ffffff",
      "--border": "rgba(255, 255, 255, 0.04)",
      "--border-medium": "rgba(255, 255, 255, 0.06)",
      "--border-strong": "rgba(255, 255, 255, 0.08)",
      "--accent": "#0ea5e9",
      "--accent-hover": "#0284c7",
      "--accent-light": "#38bdf8",
      "--accent-bg": "rgba(14, 165, 233, 0.1)",
      "--accent-bg-hover": "rgba(14, 165, 233, 0.15)",
      "--accent-border": "rgba(14, 165, 233, 0.5)",
      "--accent-border-weak": "rgba(14, 165, 233, 0.2)",
      "--success": "#22c55e",
      "--success-hover": "#4ade80",
      "--success-bg": "rgba(34, 197, 94, 0.15)",
      "--error": "#ef4444",
      "--error-hover": "#f87171",
      "--error-bg": "rgba(239, 68, 68, 0.15)",
      "--error-bg-hover": "rgba(239, 68, 68, 0.25)",
      "--error-solid": "rgba(239, 68, 68, 0.85)",
      "--error-border": "rgba(239, 68, 68, 0.2)",
      "--warning": "#f59e0b",
      "--warning-bg": "rgba(245, 158, 11, 0.12)",
      "--warning-bg-hover": "rgba(245, 158, 11, 0.2)",
      "--warning-border": "rgba(245, 158, 11, 0.25)",
      "--purple": "#c084fc",
      "--purple-bg": "rgba(168, 85, 247, 0.08)",
      "--purple-bg-hover": "rgba(168, 85, 247, 0.15)",
      "--purple-border": "rgba(168, 85, 247, 0.2)",
      "--slider-bg": "rgba(255, 255, 255, 0.1)",
      "--shadow": "rgba(0, 0, 0, 0.5)",
      "--icon-filter": "brightness(0) invert(1)",
    },
  },
  {
    id: "light",
    name: "Light",
    vars: {
      "--bg-primary": "#f0f0f2",
      "--bg-secondary": "#ffffff",
      "--bg-hover": "rgba(0, 0, 0, 0.06)",
      "--bg-active": "rgba(0, 0, 0, 0.04)",
      "--bg-card": "rgba(0, 0, 0, 0.03)",
      "--bg-input": "rgba(0, 0, 0, 0.04)",
      "--bg-overlay": "rgba(0, 0, 0, 0.35)",
      "--text-primary": "#18181b",
      "--text-secondary": "#3f3f46",
      "--text-muted": "rgba(0, 0, 0, 0.55)",
      "--text-tertiary": "rgba(0, 0, 0, 0.45)",
      "--text-dim": "rgba(0, 0, 0, 0.25)",
      "--text-inverse": "#ffffff",
      "--border": "rgba(0, 0, 0, 0.06)",
      "--border-medium": "rgba(0, 0, 0, 0.08)",
      "--border-strong": "rgba(0, 0, 0, 0.12)",
      "--accent": "#0284c7",
      "--accent-hover": "#0369a1",
      "--accent-light": "#0ea5e9",
      "--accent-bg": "rgba(2, 132, 199, 0.1)",
      "--accent-bg-hover": "rgba(2, 132, 199, 0.15)",
      "--accent-border": "rgba(2, 132, 199, 0.5)",
      "--accent-border-weak": "rgba(2, 132, 199, 0.2)",
      "--success": "#16a34a",
      "--success-hover": "#22c55e",
      "--success-bg": "rgba(22, 163, 74, 0.12)",
      "--error": "#dc2626",
      "--error-hover": "#ef4444",
      "--error-bg": "rgba(220, 38, 38, 0.12)",
      "--error-bg-hover": "rgba(220, 38, 38, 0.2)",
      "--error-solid": "rgba(220, 38, 38, 0.85)",
      "--error-border": "rgba(220, 38, 38, 0.2)",
      "--warning": "#d97706",
      "--warning-bg": "rgba(217, 119, 6, 0.1)",
      "--warning-bg-hover": "rgba(217, 119, 6, 0.18)",
      "--warning-border": "rgba(217, 119, 6, 0.25)",
      "--purple": "#9333ea",
      "--purple-bg": "rgba(147, 51, 234, 0.08)",
      "--purple-bg-hover": "rgba(147, 51, 234, 0.15)",
      "--purple-border": "rgba(147, 51, 234, 0.2)",
      "--slider-bg": "rgba(0, 0, 0, 0.1)",
      "--shadow": "rgba(0, 0, 0, 0.12)",
      "--icon-filter": "none",
    },
  },
  {
    id: "nord",
    name: "Nord",
    vars: {
      "--bg-primary": "#2e3440",
      "--bg-secondary": "#3b4252",
      "--bg-hover": "rgba(236, 239, 244, 0.08)",
      "--bg-active": "rgba(236, 239, 244, 0.06)",
      "--bg-card": "rgba(236, 239, 244, 0.03)",
      "--bg-input": "rgba(236, 239, 244, 0.04)",
      "--bg-overlay": "rgba(0, 0, 0, 0.45)",
      "--text-primary": "#eceff4",
      "--text-secondary": "#d8dee9",
      "--text-muted": "rgba(216, 222, 233, 0.6)",
      "--text-tertiary": "rgba(216, 222, 233, 0.5)",
      "--text-dim": "rgba(216, 222, 233, 0.25)",
      "--text-inverse": "#2e3440",
      "--border": "rgba(216, 222, 233, 0.06)",
      "--border-medium": "rgba(216, 222, 233, 0.08)",
      "--border-strong": "rgba(216, 222, 233, 0.12)",
      "--accent": "#88c0d0",
      "--accent-hover": "#81a1c1",
      "--accent-light": "#8fbcbb",
      "--accent-bg": "rgba(136, 192, 208, 0.1)",
      "--accent-bg-hover": "rgba(136, 192, 208, 0.15)",
      "--accent-border": "rgba(136, 192, 208, 0.5)",
      "--accent-border-weak": "rgba(136, 192, 208, 0.2)",
      "--success": "#a3be8c",
      "--success-hover": "#b5ce9e",
      "--success-bg": "rgba(163, 190, 140, 0.15)",
      "--error": "#bf616a",
      "--error-hover": "#d08770",
      "--error-bg": "rgba(191, 97, 106, 0.15)",
      "--error-bg-hover": "rgba(191, 97, 106, 0.25)",
      "--error-solid": "rgba(191, 97, 106, 0.85)",
      "--error-border": "rgba(191, 97, 106, 0.2)",
      "--warning": "#ebcb8b",
      "--warning-bg": "rgba(235, 203, 139, 0.12)",
      "--warning-bg-hover": "rgba(235, 203, 139, 0.2)",
      "--warning-border": "rgba(235, 203, 139, 0.25)",
      "--purple": "#b48ead",
      "--purple-bg": "rgba(180, 142, 173, 0.08)",
      "--purple-bg-hover": "rgba(180, 142, 173, 0.15)",
      "--purple-border": "rgba(180, 142, 173, 0.2)",
      "--slider-bg": "rgba(216, 222, 233, 0.1)",
      "--shadow": "rgba(0, 0, 0, 0.45)",
      "--icon-filter": "brightness(0) invert(1)",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    vars: {
      "--bg-primary": "#282a36",
      "--bg-secondary": "#44475a",
      "--bg-hover": "rgba(248, 248, 242, 0.08)",
      "--bg-active": "rgba(248, 248, 242, 0.06)",
      "--bg-card": "rgba(248, 248, 242, 0.03)",
      "--bg-input": "rgba(248, 248, 242, 0.04)",
      "--bg-overlay": "rgba(0, 0, 0, 0.5)",
      "--text-primary": "#f8f8f2",
      "--text-secondary": "#e6e6e6",
      "--text-muted": "rgba(248, 248, 242, 0.6)",
      "--text-tertiary": "rgba(248, 248, 242, 0.5)",
      "--text-dim": "rgba(248, 248, 242, 0.25)",
      "--text-inverse": "#282a36",
      "--border": "rgba(248, 248, 242, 0.06)",
      "--border-medium": "rgba(248, 248, 242, 0.08)",
      "--border-strong": "rgba(248, 248, 242, 0.12)",
      "--accent": "#bd93f9",
      "--accent-hover": "#ff79c6",
      "--accent-light": "#d6acff",
      "--accent-bg": "rgba(189, 147, 249, 0.1)",
      "--accent-bg-hover": "rgba(189, 147, 249, 0.15)",
      "--accent-border": "rgba(189, 147, 249, 0.5)",
      "--accent-border-weak": "rgba(189, 147, 249, 0.2)",
      "--success": "#50fa7b",
      "--success-hover": "#69ff94",
      "--success-bg": "rgba(80, 250, 123, 0.15)",
      "--error": "#ff5555",
      "--error-hover": "#ff6e6e",
      "--error-bg": "rgba(255, 85, 85, 0.15)",
      "--error-bg-hover": "rgba(255, 85, 85, 0.25)",
      "--error-solid": "rgba(255, 85, 85, 0.85)",
      "--error-border": "rgba(255, 85, 85, 0.2)",
      "--warning": "#f1fa8c",
      "--warning-bg": "rgba(241, 250, 140, 0.12)",
      "--warning-bg-hover": "rgba(241, 250, 140, 0.2)",
      "--warning-border": "rgba(241, 250, 140, 0.25)",
      "--purple": "#bd93f9",
      "--purple-bg": "rgba(189, 147, 249, 0.08)",
      "--purple-bg-hover": "rgba(189, 147, 249, 0.15)",
      "--purple-border": "rgba(189, 147, 249, 0.2)",
      "--slider-bg": "rgba(248, 248, 242, 0.1)",
      "--shadow": "rgba(0, 0, 0, 0.5)",
      "--icon-filter": "brightness(0) invert(1)",
    },
  },
];

export const DEFAULT_THEME = PRESET_THEMES[0];

// ------------------------------------------------------------------
// Custom theme generation
// ------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function isDark(bgHex: string): boolean {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

/** Lighten or darken a hex color by a percentage (-1 to 1) */
function adjustColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export interface CustomColors {
  background: string;
  text: string;
  accent: string;
}

export function generateCustomTheme(colors: CustomColors): ThemeVars {
  const dark = isDark(colors.background);
  const overlayColor = dark ? "0, 0, 0" : "0, 0, 0";
  const shadowColor = dark ? "0, 0, 0" : "0, 0, 0";
  const accentRgb = hexToRgb(colors.accent);
  const accR = accentRgb?.r ?? 14;
  const accG = accentRgb?.g ?? 165;
  const accB = accentRgb?.b ?? 233;

  const bg2 = adjustColor(colors.background, dark ? 0.06 : -0.04);
  const bgHover = withAlpha(colors.text, dark ? 0.08 : 0.06);
  const bgActive = withAlpha(colors.text, dark ? 0.06 : 0.04);
  const bgCard = withAlpha(colors.text, dark ? 0.03 : 0.03);
  const bgInput = withAlpha(colors.text, dark ? 0.04 : 0.04);

  const accentHover = adjustColor(colors.accent, dark ? -0.15 : -0.1);
  const accentLight = adjustColor(colors.accent, dark ? 0.2 : 0.15);

  return {
    "--bg-primary": colors.background,
    "--bg-secondary": bg2,
    "--bg-hover": bgHover,
    "--bg-active": bgActive,
    "--bg-card": bgCard,
    "--bg-input": bgInput,
    "--bg-overlay": `rgba(${overlayColor}, 0.5)`,
    "--text-primary": colors.text,
    "--text-secondary": withAlpha(colors.text, 0.85),
    "--text-muted": withAlpha(colors.text, 0.6),
    "--text-tertiary": withAlpha(colors.text, 0.5),
    "--text-dim": withAlpha(colors.text, 0.25),
    "--text-inverse": dark ? "#ffffff" : "#18181b",
    "--border": withAlpha(colors.text, 0.04),
    "--border-medium": withAlpha(colors.text, 0.06),
    "--border-strong": withAlpha(colors.text, 0.08),
    "--accent": colors.accent,
    "--accent-hover": accentHover,
    "--accent-light": accentLight,
    "--accent-bg": `rgba(${accR}, ${accG}, ${accB}, 0.1)`,
    "--accent-bg-hover": `rgba(${accR}, ${accG}, ${accB}, 0.15)`,
    "--accent-border": `rgba(${accR}, ${accG}, ${accB}, 0.5)`,
    "--accent-border-weak": `rgba(${accR}, ${accG}, ${accB}, 0.2)`,
    "--success": dark ? "#22c55e" : "#16a34a",
    "--success-hover": dark ? "#4ade80" : "#22c55e",
    "--success-bg": dark ? "rgba(34, 197, 94, 0.15)" : "rgba(22, 163, 74, 0.12)",
    "--error": dark ? "#ef4444" : "#dc2626",
    "--error-hover": dark ? "#f87171" : "#ef4444",
    "--error-bg": dark ? "rgba(239, 68, 68, 0.15)" : "rgba(220, 38, 38, 0.12)",
    "--error-bg-hover": dark ? "rgba(239, 68, 68, 0.25)" : "rgba(220, 38, 38, 0.2)",
    "--error-solid": dark ? "rgba(239, 68, 68, 0.85)" : "rgba(220, 38, 38, 0.85)",
    "--error-border": dark ? "rgba(239, 68, 68, 0.2)" : "rgba(220, 38, 38, 0.2)",
    "--warning": dark ? "#f59e0b" : "#d97706",
    "--warning-bg": dark ? "rgba(245, 158, 11, 0.12)" : "rgba(217, 119, 6, 0.1)",
    "--warning-bg-hover": dark ? "rgba(245, 158, 11, 0.2)" : "rgba(217, 119, 6, 0.18)",
    "--warning-border": dark ? "rgba(245, 158, 11, 0.25)" : "rgba(217, 119, 6, 0.25)",
    "--purple": dark ? "#c084fc" : "#9333ea",
    "--purple-bg": dark ? "rgba(168, 85, 247, 0.08)" : "rgba(147, 51, 234, 0.08)",
    "--purple-bg-hover": dark ? "rgba(168, 85, 247, 0.15)" : "rgba(147, 51, 234, 0.15)",
    "--purple-border": dark ? "rgba(168, 85, 247, 0.2)" : "rgba(147, 51, 234, 0.2)",
    "--slider-bg": withAlpha(colors.text, 0.1),
    "--shadow": `rgba(${shadowColor}, 0.5)`,
    "--icon-filter": dark ? "brightness(0) invert(1)" : "none",
  };
}
