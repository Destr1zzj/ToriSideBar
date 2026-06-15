import { useState, useEffect, useCallback } from "react";
import type { Note } from "../types";
import { loadNotes, deleteNote as deleteNoteFile, saveNoteContent, invalidateNotesCache } from "../utils/storage";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    invalidateNotesCache();
    const all = await loadNotes();
    setNotes(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNote = useCallback(async () => {
    const now = Date.now();
    const id = "note-" + now;
    await saveNoteContent(id, "");
    const newNote: Note = { id, title: "", content: "", updatedAt: now };
    setNotes((prev) => [newNote, ...prev]);
    return id;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, "id" | "updatedAt">>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      )
    );
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await deleteNoteFile(id);
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const setAllNotes = useCallback((newNotes: Note[]) => {
    setNotes(newNotes);
  }, []);

  return { notes, loaded, addNote, updateNote, deleteNote, setAllNotes, refresh };
}
