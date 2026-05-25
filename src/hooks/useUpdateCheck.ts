import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  loadLastCheckTime,
  saveLastCheckTime,
  loadUpdateAvailable,
  saveUpdateAvailable,
} from "../utils/storage";

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release_url: string;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export function useUpdateCheck() {
  const [localVersion, setLocalVersion] = useState<string>("");
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [hasUpdate, setHasUpdate] = useState<boolean>(loadUpdateAvailable());
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);

  // Load local version on mount
  useEffect(() => {
    invoke<string>("get_app_version")
      .then((v) => setLocalVersion(v))
      .catch(() => {});
  }, []);

  const checkUpdate = useCallback(async (_force = false) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError(null);

    try {
      const info = await invoke<UpdateInfo>("check_update");
      setLocalVersion(info.current_version);
      setLatestVersion(info.latest_version);
      setHasUpdate(info.has_update);
      saveUpdateAvailable(info.has_update);
      saveLastCheckTime(Date.now());
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
      checkingRef.current = false;
    }
  }, []);

  // Auto-check on Mondays
  useEffect(() => {
    const shouldAutoCheck = () => {
      const now = new Date();
      if (now.getDay() !== 1) return false; // Only Monday
      const lastCheck = loadLastCheckTime();
      return Date.now() - lastCheck > SIX_HOURS_MS;
    };

    // Check once on startup (async, non-blocking)
    if (shouldAutoCheck()) {
      checkUpdate();
    }

    // Periodically check if it's Monday and time to auto-check
    const interval = setInterval(() => {
      if (shouldAutoCheck()) {
        checkUpdate();
      }
    }, ONE_HOUR_MS);

    return () => clearInterval(interval);
  }, [checkUpdate]);

  return {
    localVersion,
    latestVersion,
    hasUpdate,
    checking,
    error,
    checkUpdate,
  };
}
