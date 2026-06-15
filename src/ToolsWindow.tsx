import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useI18n } from "./i18n";
import { loadNotes, deleteNote as deleteNoteFile, saveNoteContent, invalidateNotesCache } from "./utils/storage";
import type { Note } from "./types";

type ToolsView = "tools" | "notes";

export function ToolsWindow() {
  const { t } = useI18n();
  const [view, setView] = useState<ToolsView>("tools");
  const [notes, setNotes] = useState<Note[]>([]);

  const refreshNotes = async () => {
    invalidateNotesCache();
    const all = await loadNotes();
    setNotes(all);
  };

  useEffect(() => {
    refreshNotes();
    const promise = listen("notes-updated", () => {
      refreshNotes();
    });
    return () => {
      promise.then((unlisten) => unlisten());
    };
  }, []);

  const openNote = async (id: string) => {
    try {
      await invoke("open_note_window", { noteId: id });
    } catch (e) {
      console.error("Failed to open note window:", e);
    }
  };

  const createNote = async () => {
    const id = "note-" + Date.now();
    await saveNoteContent(id, "");
    await refreshNotes();
    try {
      await invoke("open_note_window", { noteId: id });
    } catch (e) {
      console.error("Failed to open note window:", e);
    }
  };

  const deleteNote = async (id: string) => {
    await deleteNoteFile(id);
    await refreshNotes();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderToolsMenu = () => (
    <div className="tools-menu">
      <button className="tools-menu-card" onClick={() => setView("notes")}>
        <span className="tools-menu-icon">📝</span>
        <span className="tools-menu-name">{t("notes")}</span>
      </button>
    </div>
  );

  const renderNotesList = () => (
    <>
      <button className="tools-back-btn" onClick={() => setView("tools")}>
        ← {t("back")}
      </button>
      <button className="tools-new-btn" onClick={createNote}>
        + {t("newNote")}
      </button>

      {notes.length === 0 ? (
        <div className="tools-empty">{t("noNotes")}</div>
      ) : (
        <div className="tools-list">
          {notes.map((note) => (
            <div key={note.id} className="tools-list-item">
              <button
                className="tools-list-content"
                onClick={() => openNote(note.id)}
                title={note.title || t("untitledNote")}
              >
                <span className="tools-list-title">
                  {note.title || t("untitledNote")}
                </span>
                <span className="tools-list-time">{formatTime(note.updatedAt)}</span>
              </button>
              <button
                className="tools-list-delete"
                onClick={() => deleteNote(note.id)}
                title={t("deleteNote")}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="tools-window">
      <div className="tools-titlebar">
        <span className="tools-titlebar-text">{t("toolsWindowTitle")}</span>
        <button
          className="tools-titlebar-btn close no-drag"
          onClick={() => getCurrentWindow().close()}
          title={t("close")}
        >
          ✕
        </button>
      </div>

      <div className="tools-body">
        {view === "tools" ? renderToolsMenu() : renderNotesList()}
      </div>
    </div>
  );
}
