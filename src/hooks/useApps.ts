import { useState, useEffect, useCallback } from "react";
import type { AppItem } from "../types";
import { loadApps, saveApps, clearAppsStorage } from "../utils/storage";

const PRESET_APPS: AppItem[] = [
  { id: "outlook", label: "app-outlook", title: "Outlook", url: "https://outlook.live.com", icon: "📧" },
  { id: "gmail", label: "app-gmail", title: "Gmail", url: "https://mail.google.com", icon: "📨" },
  { id: "twitter", label: "app-twitter", title: "X / Twitter", url: "https://x.com", icon: "🐦" },
  { id: "youtube", label: "app-youtube", title: "YouTube", url: "https://youtube.com", icon: "▶️" },
  { id: "notion", label: "app-notion", title: "Notion", url: "https://notion.so", icon: "📝" },
  { id: "wechat", label: "app-wechat", title: "微信网页版", url: "https://wx.qq.com", icon: "💬" },
  { id: "github", label: "app-github", title: "GitHub", url: "https://github.com", icon: "🐙" },
];

export function useApps() {
  const [apps, setApps] = useState<AppItem[]>(() => {
    const stored = loadApps();
    return stored.length > 0 ? stored : PRESET_APPS;
  });

  useEffect(() => {
    saveApps(apps);
  }, [apps]);

  const addApp = useCallback((app: AppItem) => {
    setApps((prev) => [...prev, app]);
  }, []);

  const removeApp = useCallback((id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const reorderApps = useCallback((newOrder: AppItem[]) => {
    setApps(newOrder);
  }, []);

  const resetApps = useCallback(() => {
    setApps(PRESET_APPS);
    clearAppsStorage();
  }, []);

  return { apps, setApps, addApp, removeApp, reorderApps, resetApps };
}
