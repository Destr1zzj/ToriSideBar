import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loadTrigger, saveTrigger } from "../utils/storage";

export function useTriggerWidth() {
  const [triggerWidth, setTriggerWidth] = useState(loadTrigger);

  useEffect(() => {
    saveTrigger(triggerWidth);
    invoke("set_trigger_width", { width: triggerWidth }).catch(() => {});
  }, [triggerWidth]);

  useEffect(() => {
    invoke("set_trigger_width", { width: triggerWidth }).catch(() => {});
  }, []);

  return { triggerWidth, setTriggerWidth };
}
