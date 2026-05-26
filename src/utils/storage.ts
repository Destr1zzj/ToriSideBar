import type { AppItem } from "../types";

const STORAGE_KEY = "tori-sidebar-apps";
const ACTIVE_KEY = "tori-sidebar-active";
const TRIGGER_KEY = "tori-sidebar-trigger";
const POSITION_KEY = "tori-sidebar-position";
const SHORTCUT_KEY = "tori-sidebar-shortcut";
const LAST_CHECK_KEY = "tori-sidebar-last-check";
const UPDATE_AVAILABLE_KEY = "tori-sidebar-update-available";
const FIRST_RUN_KEY = "tori-sidebar-first-run";

export function loadApps(): AppItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => ({
            id: String(item?.id ?? ""),
            label: String(item?.label ?? ""),
            title: String(item?.title ?? ""),
            url: String(item?.url ?? ""),
            icon: String(item?.icon ?? "🌐"),
          }))
          .filter((item: AppItem) => item.id && item.url);
      }
    }
  } catch { /* ignore */ }
  return [];
}

export function saveApps(apps: AppItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function loadActive(): Set<string> {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((s: any) => typeof s === "string"));
      }
    }
  } catch { /* ignore */ }
  return new Set();
}

export function saveActive(active: Set<string>) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(Array.from(active)));
}

export function loadTrigger(): number {
  try {
    const stored = localStorage.getItem(TRIGGER_KEY);
    if (stored) return Math.max(1, Math.min(100, parseInt(stored, 10) || 12));
  } catch { /* ignore */ }
  return 12;
}

export function saveTrigger(value: number) {
  localStorage.setItem(TRIGGER_KEY, String(value));
}

export function loadBarPosition(): "left" | "right" {
  try {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored === "left" || stored === "right") return stored;
  } catch { /* ignore */ }
  return "right";
}

export function saveBarPosition(position: "left" | "right") {
  localStorage.setItem(POSITION_KEY, position);
}

export function loadGlobalShortcut(): string {
  try {
    const stored = localStorage.getItem(SHORTCUT_KEY);
    // stored === "" means user explicitly cleared the shortcut;
    // stored === null means never set — use default.
    if (stored !== null) return stored;
  } catch { /* ignore */ }
  return "Ctrl+Shift+Space";
}

export function saveGlobalShortcut(shortcut: string) {
  localStorage.setItem(SHORTCUT_KEY, shortcut);
}

export function clearAppsStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadLastCheckTime(): number {
  try {
    const stored = localStorage.getItem(LAST_CHECK_KEY);
    if (stored) return parseInt(stored, 10) || 0;
  } catch { /* ignore */ }
  return 0;
}

export function saveLastCheckTime(timestamp: number) {
  localStorage.setItem(LAST_CHECK_KEY, String(timestamp));
}

export function loadUpdateAvailable(): boolean {
  try {
    const stored = localStorage.getItem(UPDATE_AVAILABLE_KEY);
    return stored === "1";
  } catch { /* ignore */ }
  return false;
}

export function saveUpdateAvailable(available: boolean) {
  localStorage.setItem(UPDATE_AVAILABLE_KEY, available ? "1" : "0");
}

export function loadFirstRun(): boolean {
  try {
    const stored = localStorage.getItem(FIRST_RUN_KEY);
    // null means first run; "1" means already seen
    return stored !== "1";
  } catch { /* ignore */ }
  return true;
}

export function saveFirstRun() {
  localStorage.setItem(FIRST_RUN_KEY, "1");
}

export function clearFirstRun() {
  localStorage.removeItem(FIRST_RUN_KEY);
}

// ------------------------------------------------------------------
// Config export / import
// ------------------------------------------------------------------

export interface ToriConfig {
  exportVersion: number;
  appVersion: string;
  exportedAt: string;
  data: {
    apps: AppItem[];
    activeApps: string[];
    triggerWidth: number;
    barPosition: "left" | "right";
    globalShortcut: string;
    language: string;
  };
}

export function exportConfig(): ToriConfig {
  const lang = localStorage.getItem("tori-sidebar-language") || "en";
  return {
    exportVersion: 1,
    appVersion: "0.6.2",
    exportedAt: new Date().toISOString(),
    data: {
      apps: loadApps(),
      activeApps: Array.from(loadActive()),
      triggerWidth: loadTrigger(),
      barPosition: loadBarPosition(),
      globalShortcut: loadGlobalShortcut(),
      language: lang === "zh" || lang === "en" ? lang : "en",
    },
  };
}

export function serializeConfig(config: ToriConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseConfigFile(text: string): ToriConfig | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && parsed.exportVersion === 1 && parsed.data) {
      return parsed as ToriConfig;
    }
  } catch { /* ignore */ }
  return null;
}

export function applyConfig(config: ToriConfig) {
  const d = config.data;
  if (Array.isArray(d.apps)) saveApps(d.apps);
  if (Array.isArray(d.activeApps)) saveActive(new Set(d.activeApps));
  if (typeof d.triggerWidth === "number") saveTrigger(d.triggerWidth);
  if (d.barPosition === "left" || d.barPosition === "right") saveBarPosition(d.barPosition);
  if (typeof d.globalShortcut === "string") saveGlobalShortcut(d.globalShortcut);
  if (d.language === "zh" || d.language === "en") {
    localStorage.setItem("tori-sidebar-language", d.language);
  }
}
