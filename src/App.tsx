import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useI18n } from "./i18n";
import { useApps } from "./hooks/useApps";
import { useActiveApps } from "./hooks/useActiveApps";
import { useTriggerWidth } from "./hooks/useTriggerWidth";
import { useSettings } from "./hooks/useSettings";
import { useDragSort } from "./hooks/useDragSort";
import { useUpdateCheck } from "./hooks/useUpdateCheck";
import { useTheme, type ThemeId } from "./hooks/useTheme";
import { useAutostart } from "./hooks/useAutostart";

import { AppListItem } from "./components/AppListItem";
import { ManageAppItem } from "./components/ManageAppItem";
import { AddAppModal } from "./components/AddAppModal";
import { ImportEdgeAppsModal } from "./components/ImportEdgeAppsModal";
import { LanguageSelector } from "./components/LanguageSelector";
import type { AppItem } from "./types";
import { exportConfig, serializeConfig, parseConfigFile, applyConfig } from "./utils/storage";
import "./App.css";

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { apps, setApps, addApp, removeApp, reorderApps, resetApps } = useApps();
  const { activeApps, setActiveApps, addActive, removeActive, clearActive } = useActiveApps();
  const { triggerWidth, setTriggerWidth } = useTriggerWidth();
  const { barPosition, setBarPosition, globalShortcut, setGlobalShortcut } = useSettings();
  const {
    localVersion,
    latestVersion,
    hasUpdate,
    checking,
    checkUpdate,
  } = useUpdateCheck();
  const { themeId, customColors, setTheme, setCustomColors } = useTheme();
  const { autostart, toggleAutostart } = useAutostart();

  const [isManaging, setIsManaging] = useState(false);
  const [manageAppsExpanded, setManageAppsExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImportEdge, setShowImportEdge] = useState(false);
  const [shortcutInput, setShortcutInput] = useState(globalShortcut);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [shortcutHintKey, setShortcutHintKey] = useState<"" | "shortcutSetHint" | "shortcutInUse">("");
  const [exportStatus, setExportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);


  // Global shortcut registration
  useEffect(() => {
    let activeShortcut = globalShortcut;
    if (!activeShortcut) {
      setShortcutHintKey("");
      return;
    }
    const registerShortcut = async () => {
      try {
        await register(activeShortcut, (event) => {
          if (event.state === "Pressed") {
            invoke("toggle_bar_visible").catch(() => {});
          }
        });
        setShortcutHintKey("shortcutSetHint");
      } catch (err) {
        console.error("[shortcut] register failed:", err);
        setShortcutHintKey("shortcutInUse");
      }
    };
    registerShortcut();
    return () => {
      unregister(activeShortcut).catch(() => {});
    };
  }, [globalShortcut]);

  const clearShortcut = () => {
    setShortcutInput("");
    setGlobalShortcut("");
    setShortcutHintKey("");
  };

  // Re-position bar when position changes
  useEffect(() => {
    invoke("position_bar").catch(() => {});
  }, [barPosition]);

  // Shortcut recording listener
  useEffect(() => {
    if (!isRecordingShortcut) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setIsRecordingShortcut(false);
        return;
      }

      const mods: string[] = [];
      if (e.ctrlKey) mods.push("Ctrl");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (e.metaKey) mods.push("Command");

      // Ignore pure modifier keys
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;

      let key = e.code;
      // Normalize common keys to Tauri format
      if (key.startsWith("Key")) key = key.slice(3);
      else if (key.startsWith("Digit")) key = key.slice(5);
      else if (key === "Space") key = "Space";
      else if (key === "Enter") key = "Return";
      else if (key === "Escape") key = "Escape";
      else if (key === "Backspace") key = "Backspace";
      else if (key === "Tab") key = "Tab";
      else if (key === "ArrowUp") key = "Up";
      else if (key === "ArrowDown") key = "Down";
      else if (key === "ArrowLeft") key = "Left";
      else if (key === "ArrowRight") key = "Right";
      else if (key === "Comma") key = ",";
      else if (key === "Period") key = ".";
      else if (key === "Slash") key = "/";
      else if (key === "Semicolon") key = ";";
      else if (key === "Quote") key = "'";
      else if (key === "BracketLeft") key = "[";
      else if (key === "BracketRight") key = "]";
      else if (key === "Backslash") key = "\\";
      else if (key === "Minus") key = "-";
      else if (key === "Equal") key = "=";
      else if (key === "Backquote") key = "`";
      else if (key.startsWith("F") && key.length <= 3) key = key; // F1-F24

      if (mods.length === 0) return; // Require at least one modifier

      const shortcut = [...mods, key].join("+");
      setShortcutInput(shortcut);
      setIsRecordingShortcut(false);

      setShortcutHintKey("");
      setGlobalShortcut(shortcut);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isRecordingShortcut]);

  // ESC handler
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isManaging) {
        const handled = await invoke<boolean>("handle_esc").catch(() => false);
        if (handled) return;

        if (activeApps.size > 0) {
          const last = Array.from(activeApps).pop();
          if (last) {
            invoke("close_app_window", { label: last }).catch(() => {});
            removeActive(last);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeApps, isManaging, removeActive]);

  const handleAppClick = useCallback(
    async (app: AppItem) => {
      try {
        const opened = await invoke<boolean>("toggle_app_window", {
          label: app.label,
          title: app.title,
          url: app.url,
          lang,
        });
        if (opened) addActive(app.label);
      } catch (e) {
        console.error("Failed to toggle app window:", e);
      }
    },
    [lang, addActive]
  );

  const handleCloseApp = useCallback(
    async (app: AppItem) => {
      try {
        await invoke("close_app_window", { label: app.label });
        removeActive(app.label);
      } catch (e) {
        console.error("Failed to close app window:", e);
      }
    },
    [removeActive]
  );

  const handleCloseAll = useCallback(async () => {
    try {
      await invoke("close_all_app_windows");
      clearActive();
    } catch (e) {
      console.error("Failed to close all:", e);
    }
  }, [clearActive]);

  const handleRemoveApp = useCallback(
    (id: string) => {
      const app = apps.find((a) => a.id === id);
      if (app && activeApps.has(app.label)) {
        invoke("close_app_window", { label: app.label }).catch(() => {});
        removeActive(app.label);
      }
      removeApp(id);
    },
    [apps, activeApps, removeActive, removeApp]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newApps = [...apps];
      const [moved] = newApps.splice(fromIndex, 1);
      newApps.splice(toIndex, 0, moved);
      reorderApps(newApps);
    },
    [apps, reorderApps]
  );

  const handleAppClickByIndex = useCallback(
    (index: number) => {
      handleAppClick(apps[index]);
    },
    [apps, handleAppClick]
  );

  const {
    containerRef,
    draggingIndex,
    getItemStyle,
    handleDragStart,
  } = useDragSort(apps.length, handleReorder, handleAppClickByIndex);

  const toggleManageMode = useCallback(async () => {
    setIsManaging((prev) => {
      if (!prev) {
        invoke("expand_bar").catch(() => {});
      } else {
        invoke("collapse_bar").catch(() => {});
        setManageAppsExpanded(false);
      }
      return !prev;
    });
  }, []);

  const openAddModal = useCallback(async () => {
    await invoke("expand_bar").catch(() => {});
    setShowAdd(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAdd(false);
    if (!isManaging) {
      invoke("collapse_bar").catch(() => {});
    }
  }, [isManaging]);

  const openImportEdgeModal = useCallback(async () => {
    await invoke("expand_bar").catch(() => {});
    setShowImportEdge(true);
  }, []);

  const closeImportEdgeModal = useCallback(() => {
    setShowImportEdge(false);
    if (!isManaging) {
      invoke("collapse_bar").catch(() => {});
    }
  }, [isManaging]);

  const handleExport = useCallback(async () => {
    const config = exportConfig();
    try {
      const path = await invoke<string>("export_config", { content: serializeConfig(config) });
      setExportStatus({ type: "success", message: t("configExported") + ": " + path });
    } catch (e) {
      setExportStatus({ type: "error", message: t("exportFailed") + ": " + String(e) });
    }
    setTimeout(() => setExportStatus(null), 4000);
  }, [t]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const config = parseConfigFile(text);
      if (!config) {
        setImportStatus({ type: "error", message: t("invalidConfigFile") });
        setTimeout(() => setImportStatus(null), 4000);
        event.target.value = "";
        return;
      }
      applyConfig(config);
      setApps(config.data.apps);
      setActiveApps(new Set(config.data.activeApps));
      setBarPosition(config.data.barPosition);
      setTriggerWidth(config.data.triggerWidth);
      setGlobalShortcut(config.data.globalShortcut);
      setShortcutInput(config.data.globalShortcut);
      setLang(config.data.language as "en" | "zh");
      await invoke("sync_language", { lang: config.data.language });
      setImportStatus({ type: "success", message: t("configImported") });
    } catch (e) {
      setImportStatus({ type: "error", message: t("importFailed") + ": " + String(e) });
    }
    setTimeout(() => setImportStatus(null), 4000);
    event.target.value = "";
  }, [t]);

  return (
    <div className={`sidebar sidebar-${barPosition}`}>

      {!isManaging && (
        <div className="top-actions">
          <button className="action-btn top-close-btn" onClick={handleCloseAll} title={t("closeAll")}>
            ✕
          </button>
        </div>
      )}

      {isManaging && (
        <div className="manage-apps-fold">
          <button
            className="manage-apps-toggle"
            onClick={() => setManageAppsExpanded((p) => !p)}
          >
            <span className={`fold-arrow ${manageAppsExpanded ? "expanded" : ""}`}>▶</span>
            {t("manageApps")}
            <span className="fold-count">({apps.length})</span>
          </button>
        </div>
      )}

      {(!isManaging || manageAppsExpanded) && (
        <div className="app-list" ref={containerRef}>
          {apps.length === 0 && !isManaging && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-text">{t("noApps")}</div>
              <button className="empty-add-btn" onClick={openAddModal}>
                {t("addFirstApp")}
              </button>
            </div>
          )}
          {apps.map((app, index) =>
            isManaging ? (
              <ManageAppItem
                key={app.id}
                app={app}
                index={index}
                isActive={activeApps.has(app.label)}
                isDragging={draggingIndex === index}
                style={getItemStyle(index)}
                onRemove={handleRemoveApp}
                onDragStart={handleDragStart}
              />
            ) : (
              <AppListItem
                key={app.id}
                app={app}
                isActive={activeApps.has(app.label)}
                isDragging={draggingIndex === index}
                style={getItemStyle(index)}
                onMouseDown={() => handleDragStart(index)}
                onClose={handleCloseApp}
              />
            )
          )}
        </div>
      )}

      {isManaging && (
        <div className="manage-settings">
          <div className="setting-row">
            <label>{t("barPosition")}</label>
            <div className="lang-selector">
              <button
                className={`lang-btn ${barPosition === "left" ? "active" : ""}`}
                onClick={() => setBarPosition("left")}
              >
                {t("left")}
              </button>
              <button
                className={`lang-btn ${barPosition === "right" ? "active" : ""}`}
                onClick={() => setBarPosition("right")}
              >
                {t("right")}
              </button>
            </div>
          </div>
          <div className="setting-row">
            <label>{t("globalShortcut")}</label>
            <div className="shortcut-wrap">
              <div className="shortcut-row">
                <input
                  className={`shortcut-input ${isRecordingShortcut ? "recording" : ""} ${shortcutHintKey === "shortcutInUse" ? "error" : ""}`}
                  type="text"
                  readOnly
                  placeholder={isRecordingShortcut ? t("pressShortcut") : "Ctrl+Shift+Space"}
                  value={shortcutInput}
                  onChange={(e) => setShortcutInput(e.target.value)}
                  onClick={() => {
                    if (!isRecordingShortcut) {
                      setIsRecordingShortcut(true);
                    }
                  }}
                />
                {shortcutInput && !isRecordingShortcut && (
                  <button
                    className="shortcut-clear-btn"
                    onClick={clearShortcut}
                    title={t("clear")}
                  >
                    ×
                  </button>
                )}
                <button
                  className={`shortcut-save-btn ${isRecordingShortcut ? "recording" : ""}`}
                  onClick={() => {
                    if (isRecordingShortcut) {
                      setIsRecordingShortcut(false);
                    } else {
                      setIsRecordingShortcut(true);
                    }
                  }}
                >
                  {isRecordingShortcut ? t("cancel") : t("record")}
                </button>
              </div>
              {shortcutHintKey && (
                <div className={`shortcut-hint ${shortcutHintKey === "shortcutInUse" ? "error" : ""}`}>{t(shortcutHintKey)}</div>
              )}
              <div className="shortcut-desc">{t("shortcutLockHint")}</div>
            </div>
          </div>
          <div className="setting-row">
            <label>{t("autostart")}</label>
            <div className="lang-selector">
              <button
                className={`lang-btn ${autostart ? "active" : ""}`}
                onClick={() => toggleAutostart(true)}
              >
                {t("on")}
              </button>
              <button
                className={`lang-btn ${!autostart ? "active" : ""}`}
                onClick={() => toggleAutostart(false)}
              >
                {t("off")}
              </button>
            </div>
          </div>
          <div className="setting-row">
            <label>{t("triggerWidth")}</label>
            <div className="slider-row">
              <input
                type="range"
                min={1}
                max={100}
                value={triggerWidth}
                onChange={(e) => setTriggerWidth(parseInt(e.target.value, 10))}
              />
              <span className="slider-value">{triggerWidth}px</span>
            </div>
          </div>
          <div className="setting-row">
            <label>{t("theme")}</label>
            <div className="theme-selector">
              {(["dark", "light", "nord", "dracula", "custom"] as ThemeId[]).map((id) => (
                <button
                  key={id}
                  className={`theme-btn ${themeId === id ? "active" : ""}`}
                  onClick={() => setTheme(id)}
                  title={t(id === "dark" ? "themeDark" : id === "light" ? "themeLight" : id === "nord" ? "themeNord" : id === "dracula" ? "themeDracula" : "themeCustom")}
                >
                  <span className={`theme-dot theme-${id}`} />
                  <span className="theme-label">{t(id === "dark" ? "themeDark" : id === "light" ? "themeLight" : id === "nord" ? "themeNord" : id === "dracula" ? "themeDracula" : "themeCustom")}</span>
                </button>
              ))}
            </div>
            {themeId === "custom" && (
              <div className="custom-colors">
                <div className="custom-color-row">
                  <label>{t("backgroundColor")}</label>
                  <input
                    type="color"
                    value={customColors.background}
                    onChange={(e) => setCustomColors({ background: e.target.value })}
                  />
                </div>
                <div className="custom-color-row">
                  <label>{t("textColor")}</label>
                  <input
                    type="color"
                    value={customColors.text}
                    onChange={(e) => setCustomColors({ text: e.target.value })}
                  />
                </div>
                <div className="custom-color-row">
                  <label>{t("accentColor")}</label>
                  <input
                    type="color"
                    value={customColors.accent}
                    onChange={(e) => setCustomColors({ accent: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <LanguageSelector />
          <button className="manage-reset-btn" onClick={resetApps}>
            {t("reset")}
          </button>
          <button className="manage-import-btn" onClick={openImportEdgeModal}>
            {t("importEdgeApps")}
          </button>
          <div className="config-row">
            <button className="manage-export-btn" onClick={handleExport}>
              {t("exportConfig")}
            </button>
            <label className="manage-import-config-btn">
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
              {t("importConfig")}
            </label>
          </div>
          {exportStatus && (
            <div className={`export-status ${exportStatus.type}`}>
              {exportStatus.message}
            </div>
          )}
          {importStatus && (
            <div className={`export-status ${importStatus.type}`}>
              {importStatus.message}
            </div>
          )}

          <div className="about-section">
            <div className="about-divider" />
            <div className="about-row">
              <span className="about-label">{t("currentVersion")}</span>
              <span className="about-value">v{localVersion || "—"}</span>
            </div>
            <div className="about-row">
              <span className="about-label">{t("latestVersion")}</span>
              <span className={`about-value ${hasUpdate ? "update-highlight" : ""}`}>
                {latestVersion ? (latestVersion.startsWith("v") ? latestVersion : `v${latestVersion}`) : "—"}
              </span>
            </div>
            <div className="about-row">
              <span className={`about-status ${hasUpdate ? "update-available" : ""}`}>
                {checking ? t("checking") : hasUpdate ? t("updateAvailable") : t("upToDate")}
              </span>
            </div>
            <div className="about-actions">
              <button
                className="about-btn"
                onClick={() => checkUpdate(true)}
                disabled={checking}
              >
                {t("checkUpdate")}
              </button>
              {hasUpdate && (
                <button
                  className="about-btn download"
                  onClick={() => {
                    invoke("open_external_url", {
                      url: "https://github.com/Destr1zzj/ToriSideBar/releases/latest",
                    }).catch(() => {});
                  }}
                >
                  {t("download")}
                </button>
              )}
            </div>
            <div className="about-dev">
              <span>ToriSidebar</span>
              <span className="about-dev-sep">·</span>
              <span
                className="about-link"
                onClick={() => {
                  invoke("open_external_url", {
                    url: "https://github.com/Destr1zzj/ToriSideBar",
                  }).catch(() => {});
                }}
              >
                {t("githubRepo")}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bottom-actions">
        {!isManaging ? (
          <>
            <button className="action-btn" onClick={openAddModal} title={t("addApp")}>
              ➕
            </button>
            <button className="action-btn manage-btn-wrap" onClick={toggleManageMode} title={t("manage")}>
              ⚙️
              {hasUpdate && <span className="update-badge" />}
            </button>
            <button
              className="action-btn exit-btn"
              onClick={async () => {
                const confirmed = await invoke<boolean>("confirm_exit", { lang });
                if (confirmed) {
                  invoke("exit_app").catch(() => {});
                }
              }}
              title={t("exitApp")}
            >
              🚪
            </button>
          </>
        ) : (
          <button className="action-btn manage-done-btn" onClick={toggleManageMode} title={t("done")}>
            ✓
          </button>
        )}
      </div>

      {showAdd && (
        <AddAppModal
          onClose={closeAddModal}
          onAdd={(app) => {
            addApp(app);
            closeAddModal();
          }}
        />
      )}

      {showImportEdge && (
        <ImportEdgeAppsModal
          onClose={closeImportEdgeModal}
          onImport={(apps) => {
            apps.forEach((app) => addApp(app));
            closeImportEdgeModal();
          }}
        />
      )}
    </div>
  );
}
