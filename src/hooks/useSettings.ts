import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  loadBarPosition,
  saveBarPosition,
  loadGlobalShortcut,
  saveGlobalShortcut,
  loadClickOutsideHide,
  saveClickOutsideHide,
} from "../utils/storage";

export function useSettings() {
  const [barPosition, setBarPositionState] = useState<"left" | "right">(loadBarPosition);
  const [globalShortcut, setGlobalShortcutState] = useState(loadGlobalShortcut);
  const [clickOutsideHide, setClickOutsideHideState] = useState(loadClickOutsideHide);

  useEffect(() => {
    invoke("set_bar_position", { position: barPosition }).catch(() => {});
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

  return {
    barPosition,
    setBarPosition,
    globalShortcut,
    setGlobalShortcut,
    clickOutsideHide,
    setClickOutsideHide,
  };
}
