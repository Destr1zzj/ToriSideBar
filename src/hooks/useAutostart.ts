import { useState, useEffect, useCallback } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export function useAutostart() {
  const [autostart, setAutostart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isEnabled()
      .then(setAutostart)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleAutostart = useCallback(async (value: boolean) => {
    try {
      if (value) {
        await enable();
      } else {
        await disable();
      }
      const actual = await isEnabled();
      setAutostart(actual);
    } catch (e) {
      console.error("autostart error:", e);
    }
  }, []);

  return { autostart, loading, toggleAutostart };
}
