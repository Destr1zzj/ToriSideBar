import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  loadBarPosition,
  saveBarPosition,
  loadGlobalShortcut,
  saveGlobalShortcut,
  loadClickOutsideHide,
  saveClickOutsideHide,
  loadAutoHideOnAppOpen,
  saveAutoHideOnAppOpen,
} from "../utils/storage";

export function useSettings() {
  const [barPosition, setBarPositionState] = useState<"left" | "right">(loadBarPosition);
  const [globalShortcut, setGlobalShortcutState] = useState(loadGlobalShortcut);
  const [clickOutsideHide, setClickOutsideHideState] = useState(loadClickOutsideHide);
  const [autoHideOnAppOpen, setAutoHideOnAppOpenState] = useState(loadAutoHideOnAppOpen);

  useEffect(() => {
    invoke("set_bar_position", { position: barPosition }).catch(() => {});
    invoke("set_auto_hide_on_app_open", { enabled: autoHideOnAppOpen }).catch(() => {});
  }, []);

  const setBarPosition = useCallback((pos: "left" | "right") => {
    setBarPositionState(pos);
    saveBarPosition(pos);
    invoke("set_bar_position", { position: pos }).catch(() => {});
  }, []);

  const setGlobalShortcut = useCallback((shortcut: string) => {
    setGlobalShortcutState(shortcut);
    saveGlobalShortcut(shortcut);
  }, []);

  const setClickOutsideHide = useCallback((enabled: boolean) => {
    setClickOutsideHideState(enabled);
    saveClickOutsideHide(enabled);
    invoke("set_click_outside_hide", { enabled }).catch(() => {});
  }, []);

  const setAutoHideOnAppOpen = useCallback((enabled: boolean) => {
    setAutoHideOnAppOpenState(enabled);
    saveAutoHideOnAppOpen(enabled);
    invoke("set_auto_hide_on_app_open", { enabled }).catch(() => {});
  }, []);

  return {
    barPosition,
    setBarPosition,
    globalShortcut,
    setGlobalShortcut,
    clickOutsideHide,
    setClickOutsideHide,
    autoHideOnAppOpen,
    setAutoHideOnAppOpen,
  };
}
