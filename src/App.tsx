import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "./i18n";
import { useApps } from "./hooks/useApps";
import { useActiveApps } from "./hooks/useActiveApps";
import { useTriggerWidth } from "./hooks/useTriggerWidth";
import { useDragSort } from "./hooks/useDragSort";
import { AppListItem } from "./components/AppListItem";
import { ManageAppItem } from "./components/ManageAppItem";
import { AddAppModal } from "./components/AddAppModal";
import { ExitConfirmModal } from "./components/ExitConfirmModal";
import { LanguageSelector } from "./components/LanguageSelector";
import type { AppItem } from "./types";
import "./App.css";

export default function App() {
  const { t, lang } = useI18n();
  const { apps, addApp, removeApp, reorderApps, resetApps } = useApps();
  const { activeApps, addActive, removeActive, clearActive } = useActiveApps();
  const { triggerWidth, setTriggerWidth } = useTriggerWidth();

  const [isManaging, setIsManaging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  return (
    <div className="sidebar">
      {!isManaging && (
        <div className="top-actions">
          <button className="action-btn top-close-btn" onClick={handleCloseAll} title={t("closeAll")}>
            ✕
          </button>
        </div>
      )}

      <div className="app-list" ref={containerRef}>
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

      {isManaging && (
        <div className="manage-settings">
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
          <LanguageSelector />
          <button className="manage-reset-btn" onClick={resetApps}>
            {t("reset")}
          </button>
        </div>
      )}

      <div className="bottom-actions">
        {!isManaging ? (
          <>
            <button className="action-btn" onClick={openAddModal} title={t("addApp")}>
              ➕
            </button>
            <button className="action-btn" onClick={toggleManageMode} title={t("manage")}>
              ⚙️
            </button>
            <button className="action-btn exit-btn" onClick={() => setShowExitConfirm(true)} title={t("exitApp")}>
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

      {showExitConfirm && (
        <ExitConfirmModal
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => invoke("exit_app").catch(() => {})}
        />
      )}
    </div>
  );
}
