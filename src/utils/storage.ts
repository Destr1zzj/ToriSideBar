import { invoke } from "@tauri-apps/api/core";
import type { AppItem, Note } from "../types";

const STORAGE_KEY = "tori-sidebar-apps";
const ACTIVE_KEY = "tori-sidebar-active";
const TRIGGER_KEY = "tori-sidebar-trigger";
const POSITION_KEY = "tori-sidebar-position";
const SHORTCUT_KEY = "tori-sidebar-shortcut";
const LAST_CHECK_KEY = "tori-sidebar-last-check";
const UPDATE_AVAILABLE_KEY = "tori-sidebar-update-available";
const FIRST_RUN_KEY = "tori-sidebar-first-run";
const CLICK_OUTSIDE_KEY = "tori-sidebar-click-outside-hide";
const AUTO_HIDE_ON_APP_OPEN_KEY = "tori-sidebar-auto-hide-on-app-open";
const NOTES_KEY = "tori-sidebar-notes";
const NOTE_OPACITY_KEY = "tori-sidebar-note-opacity";

let storagePathCache: string | null = null;
let notesCache: Note[] | null = null;

export async function getNoteStoragePath(): Promise<string> {
  if (storagePathCache) return storagePathCache;
  const path = await invoke<string>("get_note_storage_path");
  storagePathCache = path;
  return path;
}

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

export function loadClickOutsideHide(): boolean {
  try {
    const stored = localStorage.getItem(CLICK_OUTSIDE_KEY);
    return stored === "1";
  } catch { /* ignore */ }
  return false;
}

export function saveClickOutsideHide(enabled: boolean) {
  localStorage.setItem(CLICK_OUTSIDE_KEY, enabled ? "1" : "0");
}

export function loadAutoHideOnAppOpen(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_HIDE_ON_APP_OPEN_KEY);
    return stored === "1";
  } catch { /* ignore */ }
  return false;
}

export function saveAutoHideOnAppOpen(enabled: boolean) {
  localStorage.setItem(AUTO_HIDE_ON_APP_OPEN_KEY, enabled ? "1" : "0");
}

function extractTitle(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const title = trimmed
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*]\s+\[[xX ]\]\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .trim();
    if (title) return title.slice(0, 40);
  }
  return "";
}

function loadNotesLegacy(): Note[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => ({
            id: String(item?.id ?? ""),
            title: String(item?.title ?? ""),
            content: String(item?.content ?? ""),
            updatedAt: typeof item?.updatedAt === "number" ? item.updatedAt : Date.now(),
          }))
          .filter((item: Note) => item.id) as Note[];
      }
    }
  } catch { /* ignore */ }
  return [];
}

// ------------------------------------------------------------------
// Notes (file-based persistence as .md files)
// ------------------------------------------------------------------

export async function loadNoteContent(noteId: string): Promise<string> {
  const path = await getNoteStoragePath();
  try {
    return await invoke<string>("read_note_file", { storagePath: path, noteId });
  } catch {
    return "";
  }
}

export async function saveNoteContent(noteId: string, content: string): Promise<void> {
  const path = await getNoteStoragePath();
  await invoke("write_note_file", { storagePath: path, noteId, content });
  if (notesCache) {
    const idx = notesCache.findIndex((n) => n.id === noteId);
    const note: Note = {
      id: noteId,
      title: extractTitle(content),
      content,
      updatedAt: Date.now(),
    };
    if (idx >= 0) notesCache[idx] = note;
    else notesCache.unshift(note);
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  const path = await getNoteStoragePath();
  await invoke("delete_note_file", { storagePath: path, noteId });
  if (notesCache) {
    notesCache = notesCache.filter((n) => n.id !== noteId);
  }
}

async function migrateNotesIfNeeded(): Promise<void> {
  const legacy = loadNotesLegacy();
  if (legacy.length === 0) return;
  const path = await getNoteStoragePath();
  for (const note of legacy) {
    if (!note.content) continue;
    try {
      await invoke("write_note_file", {
        storagePath: path,
        noteId: note.id,
        content: note.content,
      });
    } catch { /* ignore */ }
  }
  localStorage.removeItem(NOTES_KEY);
}

export async function loadNotes(): Promise<Note[]> {
  if (notesCache) return notesCache;
  await migrateNotesIfNeeded();
  const path = await getNoteStoragePath();
  try {
    const files = await invoke<string[]>("list_note_files", { storagePath: path });
    const notes: Note[] = [];
    for (const noteId of files) {
      const content = await invoke<string>("read_note_file", { storagePath: path, noteId });
      notes.push({
        id: noteId,
        title: extractTitle(content),
        content,
        updatedAt: Date.now(),
      });
    }
    notesCache = notes;
    return notes;
  } catch {
    return [];
  }
}

export function invalidateNotesCache() {
  notesCache = null;
}

export async function saveNotes(notes: Note[]): Promise<void> {
  notesCache = notes;
  const path = await getNoteStoragePath();
  for (const note of notes) {
    try {
      await invoke("write_note_file", {
        storagePath: path,
        noteId: note.id,
        content: note.content,
      });
    } catch { /* ignore */ }
  }
}

export function loadNoteOpacity(): number {
  try {
    const stored = localStorage.getItem(NOTE_OPACITY_KEY);
    if (stored) {
      const value = parseFloat(stored);
      if (!isNaN(value)) return Math.max(0.3, Math.min(1, value));
    }
  } catch { /* ignore */ }
  return 0.75;
}

export function saveNoteOpacity(opacity: number) {
  localStorage.setItem(NOTE_OPACITY_KEY, String(Math.max(0.3, Math.min(1, opacity))));
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
    clickOutsideHide: boolean;
    autoHideOnAppOpen: boolean;
    notes: Note[];
  };
}

export async function exportConfig(): Promise<ToriConfig> {
  const lang = localStorage.getItem("tori-sidebar-language") || "en";
  return {
    exportVersion: 1,
    appVersion: "1.4.2",
    exportedAt: new Date().toISOString(),
    data: {
      apps: loadApps(),
      activeApps: Array.from(loadActive()),
      triggerWidth: loadTrigger(),
      barPosition: loadBarPosition(),
      globalShortcut: loadGlobalShortcut(),
      language: lang === "zh" || lang === "en" ? lang : "en",
      clickOutsideHide: loadClickOutsideHide(),
      autoHideOnAppOpen: loadAutoHideOnAppOpen(),
      notes: await loadNotes(),
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

export async function applyConfig(config: ToriConfig) {
  const d = config.data;
  if (Array.isArray(d.apps)) saveApps(d.apps);
  if (Array.isArray(d.activeApps)) saveActive(new Set(d.activeApps));
  if (typeof d.triggerWidth === "number") saveTrigger(d.triggerWidth);
  if (d.barPosition === "left" || d.barPosition === "right") saveBarPosition(d.barPosition);
  if (typeof d.globalShortcut === "string") saveGlobalShortcut(d.globalShortcut);
  if (d.language === "zh" || d.language === "en") {
    localStorage.setItem("tori-sidebar-language", d.language);
  }
  if (typeof d.clickOutsideHide === "boolean") saveClickOutsideHide(d.clickOutsideHide);
  if (typeof d.autoHideOnAppOpen === "boolean") saveAutoHideOnAppOpen(d.autoHideOnAppOpen);
  if (Array.isArray(d.notes)) await saveNotes(d.notes);
}
