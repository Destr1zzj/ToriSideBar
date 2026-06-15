import { useState, useEffect, useMemo, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { useI18n } from "./i18n";
import { useTheme, PRESET_THEMES, DEFAULT_THEME } from "./hooks/useTheme";
import { loadNoteContent, saveNoteContent, loadNoteOpacity } from "./utils/storage";
import { MarkdownEditor, type MarkdownEditorRef } from "./components/MarkdownEditor";

interface NoteWindowProps {
  noteId: string;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r, g, b };
  }
  return null;
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  const hex = hexToRgb(color);
  if (hex) return hex;
  const rgbMatch = color.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  return null;
}

function withOpacity(color: string, opacity: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function NoteWindow({ noteId }: NoteWindowProps) {
  const { t } = useI18n();
  const { themeId, customColors } = useTheme();
  const editorRef = useRef<MarkdownEditorRef>(null);
  const [content, setContent] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [opacity] = useState(() => loadNoteOpacity());

  // Load note content from file on mount.
  useEffect(() => {
    let cancelled = false;
    loadNoteContent(noteId).then((text) => {
      if (cancelled) return;
      setContent(text);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [noteId]);

  // Save to file whenever content changes.
  useEffect(() => {
    if (!loaded) return;
    saveNoteContent(noteId, content).catch(() => {});
    emit("notes-updated", {}).catch(() => {});
  }, [content, loaded, noteId]);

  const title = useMemo(() => extractTitle(content), [content]);

  const handleClose = () => {
    getCurrentWindow().close();
  };

  const handleToggleAlwaysOnTop = async () => {
    const next = !isAlwaysOnTop;
    setIsAlwaysOnTop(next);
    await getCurrentWindow().setAlwaysOnTop(next);
  };

  const handleAddTodo = () => {
    editorRef.current?.insertTodo();
  };

  const baseBackground = useMemo(() => {
    if (themeId === "custom") return customColors.background;
    const preset = PRESET_THEMES.find((t) => t.id === themeId);
    return preset ? preset.vars["--bg-primary"] : DEFAULT_THEME.vars["--bg-primary"];
  }, [themeId, customColors.background]);

  const backgroundColor = useMemo(
    () => withOpacity(baseBackground, opacity),
    [baseBackground, opacity]
  );

  return (
    <div className="note-window" style={{ background: backgroundColor }}>
      <div className="note-titlebar">
        <span className="note-titlebar-text">
          {title || t("noteTitlePlaceholder")}
        </span>
        <div className="note-titlebar-actions no-drag">
          <button
            className="note-titlebar-btn new"
            onClick={handleAddTodo}
            title={t("todoInputPlaceholder")}
          >
            +
          </button>
          <button
            className={`note-titlebar-btn pin ${isAlwaysOnTop ? "active" : ""}`}
            onClick={handleToggleAlwaysOnTop}
            title={isAlwaysOnTop ? t("unpinWindow") : t("pinWindow")}
          >
            <img
              src={isAlwaysOnTop ? "/icons/yidingzhu.png" : "/icons/quxiaodingzhu.png"}
              style={{ width: 12, height: 12 }}
              alt=""
            />
          </button>
          <button
            className="note-titlebar-btn close"
            onClick={handleClose}
            title={t("close")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="note-body milkdown-note-body">
        {loaded ? (
          <MarkdownEditor
            ref={editorRef}
            markdown={content}
            onChange={setContent}
          />
        ) : (
          <div className="note-preview">{t("loading")}</div>
        )}
      </div>
    </div>
  );
}
