import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { loadActive, saveActive } from "../utils/storage";

export function useActiveApps() {
  const [activeApps, setActiveApps] = useState<Set<string>>(loadActive);

  useEffect(() => {
    saveActive(activeApps);
  }, [activeApps]);

  useEffect(() => {
    const unlisten = listen<string>("app-closed", (event) => {
      setActiveApps((prev) => {
        if (!prev.has(event.payload)) return prev;
        const next = new Set(prev);
        next.delete(event.payload);
        return next;
      });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const addActive = (label: string) => {
    setActiveApps((prev) => {
      if (prev.has(label)) return prev;
      const next = new Set(prev);
      next.add(label);
      return next;
    });
  };

  const removeActive = (label: string) => {
    setActiveApps((prev) => {
      if (!prev.has(label)) return prev;
      const next = new Set(prev);
      next.delete(label);
      return next;
    });
  };

  const clearActive = () => {
    setActiveApps(new Set());
  };

  return { activeApps, setActiveApps, addActive, removeActive, clearActive };
}
