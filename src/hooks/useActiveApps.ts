import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useActiveApps() {
  // Do not persist active apps across restarts — child windows are not
  // restored, so restoring the active set would show stale active indicators.
  const [activeApps, setActiveApps] = useState<Set<string>>(new Set());

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
