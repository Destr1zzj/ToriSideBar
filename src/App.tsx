import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "./i18n";
import "./App.css";

interface AppItem {
  id: string;
  label: string;
  title: string;
  url: string;
  icon: string;
}

const PRESET_APPS: AppItem[] = [
  { id: "outlook", label: "app-outlook", title: "Outlook", url: "https://outlook.live.com", icon: "📧" },
  { id: "gmail", label: "app-gmail", title: "Gmail", url: "https://mail.google.com", icon: "📨" },
  { id: "twitter", label: "app-twitter", title: "X / Twitter", url: "https://x.com", icon: "🐦" },
  { id: "youtube", label: "app-youtube", title: "YouTube", url: "https://youtube.com", icon: "▶️" },
  { id: "notion", label: "app-notion", title: "Notion", url: "https://notion.so", icon: "📝" },
  { id: "wechat", label: "app-wechat", title: "微信网页版", url: "https://wx.qq.com", icon: "💬" },
  { id: "github", label: "app-github", title: "GitHub", url: "https://github.com", icon: "🐙" },
];

const STORAGE_KEY = "tori-sidebar-apps";
const ACTIVE_KEY = "tori-sidebar-active";
const TRIGGER_KEY = "tori-sidebar-trigger";

// Random emoji pool
const RANDOM_EMOJIS = [
  "🚀","⭐","🔥","💎","🌟","⚡","🎯","💡","🎨","🔮",
  "🎪","🌈","🍀","🎸","🎮","📱","💻","🔑","🎁","🏆",
  "🎵","🌺","🍎","🦊","🐱","🐶","🦁","🐼","🦄","🦋",
  "🌻","🍄","🌵","🎄","🍕","🍣","🍩","🧁","☕","🍺",
  "🎂","🎈","🎉","🏅","🎲","🎭","🎤","🎸","🎬","👾",
  "🤖","🎃","🎊","🎀","🧸","🎳","🎯","🎱","🎰","♟️",
];

function getRandomEmoji(): string {
  return RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)];
}

function loadApps(): AppItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => ({
            id: String(item?.id ?? ""),
            label: String(item?.label ?? ""),
            title: String(item?.title ?? ""),
            url: String(item?.url ?? ""),
            icon: String(item?.icon ?? "🌐"),
          }))
          .filter((item: AppItem) => item.id && item.url);
      }
    }
  } catch { /* ignore */ }
  return PRESET_APPS;
}

function saveApps(apps: AppItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function loadActive(): Set<string> {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((s: any) => typeof s === "string"));
      }
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveActive(active: Set<string>) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(Array.from(active)));
}

function loadTrigger(): number {
  try {
    const stored = localStorage.getItem(TRIGGER_KEY);
    if (stored) return Math.max(1, Math.min(100, parseInt(stored, 10) || 12));
  } catch { /* ignore */ }
  return 12;
}

function saveTrigger(value: number) {
  localStorage.setItem(TRIGGER_KEY, String(value));
}

function getDomain(url: string): string {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Multiple favicon sources
function getFaviconSources(domain: string): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
  ];
}

function FaviconOptionImg({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span style={{ fontSize: "14px", opacity: 0.4 }}>🌐</span>;
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function FaviconImg({ src, domain, title, className = "app-icon-img" }: { src?: string; domain: string; title: string; className?: string }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const allSources = getFaviconSources(domain);
  const sources = src && !allSources.includes(src)
    ? [src, ...allSources]
    : src
      ? [src, ...allSources.filter(s => s !== src)]
      : allSources;

  return (
    <img
      src={sources[srcIndex]}
      alt={title}
      className={className}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onError={() => {
        if (srcIndex < sources.length - 1) {
          setSrcIndex(srcIndex + 1);
        }
      }}
    />
  );
}

function AppIcon({ icon, title, domain }: { icon: string; title: string; domain?: string }) {
  if (icon.startsWith("http://") || icon.startsWith("https://")) {
    return <FaviconImg src={icon} domain={domain || getDomain(icon)} title={title} />;
  }
  return <span className="app-icon-text">{icon}</span>;
}

function App() {
  const { t, lang, setLang } = useI18n();

  const [apps, setApps] = useState<AppItem[]>(loadApps);
  const [activeApps, setActiveApps] = useState<Set<string>>(loadActive);
  const [showAdd, setShowAdd] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [useEmoji, setUseEmoji] = useState(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(loadTrigger());

  // Manage mode
  const [isManaging, setIsManaging] = useState(false);

  const currentDomain = newUrl.trim() ? getDomain(newUrl.trim()) : "";
  const faviconSources = currentDomain ? getFaviconSources(currentDomain) : [];

  useEffect(() => {
    saveApps(apps);
  }, [apps]);

  useEffect(() => {
    saveActive(activeApps);
  }, [activeApps]);

  useEffect(() => {
    saveTrigger(triggerWidth);
    invoke("set_trigger_width", { width: triggerWidth }).catch(() => {});
  }, [triggerWidth]);

  useEffect(() => {
    invoke("set_trigger_width", { width: triggerWidth }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isManaging) {
        // Try to close child window first
        const handled = await invoke<boolean>("handle_esc").catch(() => false);
        if (handled) return;

        // No child window, close last active parent window
        if (activeApps.size > 0) {
          const last = Array.from(activeApps).pop();
          if (last) {
            invoke("close_app_window", { label: last }).catch(() => {});
            setActiveApps((prev) => {
              const next = new Set(prev);
              next.delete(last);
              return next;
            });
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeApps, isManaging]);

  const handleAppClick = useCallback(async (app: AppItem) => {
    try {
      const opened = await invoke<boolean>("toggle_app_window", {
        label: app.label,
        title: app.title,
        url: app.url,
      });
      setActiveApps((prev) => {
        // Only add to set when newly opened; keep visual state when hidden (background keep-alive)
        if (opened && !prev.has(app.label)) {
          const next = new Set(prev);
          next.add(app.label);
          return next;
        }
        return prev;
      });
    } catch (e) {
      console.error("Failed to toggle app window:", e);
    }
  }, []);

  const handleCloseApp = useCallback(async (app: AppItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke("close_app_window", { label: app.label });
      setActiveApps((prev) => {
        const next = new Set(prev);
        next.delete(app.label);
        return next;
      });
    } catch (e) {
      console.error("Failed to close app window:", e);
    }
  }, []);

  const handleCloseAll = useCallback(async () => {
    try {
      await invoke("close_all_app_windows");
      setActiveApps(new Set());
    } catch (e) {
      console.error("Failed to close all:", e);
    }
  }, []);

  const handleExitApp = useCallback(async () => {
    await invoke("expand_bar").catch(() => {});
    setShowExitConfirm(true);
  }, []);

  const closeExitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    invoke("collapse_bar").catch(() => {});
  }, []);

  const confirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    await invoke("exit_app").catch(() => {});
  }, []);

  const openAdd = useCallback(async () => {
    setNewTitle("");
    setNewUrl("");
    setNewIcon("");
    setUseEmoji(false);
    setSelectedSource(0);
    await invoke("expand_bar").catch(() => {});
    setShowAdd(true);
  }, []);

  const closeAdd = useCallback(() => {
    setShowAdd(false);
    if (!isManaging) {
      invoke("collapse_bar").catch(() => {});
    }
  }, [isManaging]);

  const handleAddApp = useCallback(() => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const id = "custom-" + Date.now();
    const domain = getDomain(url);
    let icon: string;
    if (useEmoji) {
      icon = newIcon.trim() || getRandomEmoji();
    } else {
      icon = faviconSources[selectedSource] || getFaviconSources(domain)[0];
    }
    const app: AppItem = {
      id,
      label: "app-" + id,
      title: newTitle.trim(),
      url,
      icon,
    };
    setApps((prev) => [...prev, app]);
    closeAdd();
  }, [newTitle, newUrl, newIcon, useEmoji, selectedSource, faviconSources, closeAdd]);

  const handleRemoveApp = useCallback((id: string) => {
    const app = apps.find((a) => a.id === id);
    if (app && activeApps.has(app.label)) {
      invoke("close_app_window", { label: app.label }).catch(() => {});
      setActiveApps((prev) => {
        const next = new Set(prev);
        next.delete(app.label);
        return next;
      });
    }
    setApps((prev) => prev.filter((a) => a.id !== id));
  }, [apps, activeApps]);

  const handleMoveApp = useCallback((index: number, direction: -1 | 1) => {
    setApps((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newApps = [...prev];
      const [moved] = newApps.splice(index, 1);
      newApps.splice(newIndex, 0, moved);
      return newApps;
    });
  }, []);

  const handleResetApps = useCallback(() => {
    activeApps.forEach((label) => {
      invoke("close_app_window", { label }).catch(() => {});
    });
    setActiveApps(new Set());
    setApps(PRESET_APPS);
    localStorage.removeItem(STORAGE_KEY);
  }, [activeApps]);

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

  return (
    <div className="sidebar">
      {!isManaging && (
        <div className="top-actions">
          <button className="action-btn top-close-btn" onClick={handleCloseAll} title={t("closeAll")}>
            ✕
          </button>
        </div>
      )}

      <div className="app-list">
        {apps.map((app, index) => (
          <div
            key={app.id}
            className={`app-item-wrapper ${isManaging ? "manage-mode" : ""}`}
          >
            {isManaging ? (
              <>
                <div className="manage-actions">
                  <button
                    className="manage-action-btn"
                    disabled={index === 0}
                    onClick={() => handleMoveApp(index, -1)}
                    title={t("moveUp")}
                  >
                    ↑
                  </button>
                  <button
                    className="manage-action-btn"
                    disabled={index === apps.length - 1}
                    onClick={() => handleMoveApp(index, 1)}
                    title={t("moveDown")}
                  >
                    ↓
                  </button>
                </div>
                <div
                  className={`app-item ${activeApps.has(app.label) ? "active" : ""}`}
                  title={app.title}
                >
                  <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
                </div>
                <button
                  className="manage-action-btn delete"
                  onClick={() => handleRemoveApp(app.id)}
                  title={t("delete")}
                >
                  🗑️
                </button>
              </>
            ) : (
              <>
                <button
                  className={`app-item ${activeApps.has(app.label) ? "active" : ""}`}
                  onClick={() => handleAppClick(app)}
                  title={app.title}
                >
                  <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
                </button>
                {activeApps.has(app.label) && (
                  <button
                    className="app-close-btn"
                    onClick={(e) => handleCloseApp(app, e)}
                    title={t("close")}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        ))}
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
          <div className="setting-row">
            <label>{t("language")}</label>
            <div className="lang-selector">
              <button
                className={`lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => setLang("en")}
              >
                {t("english")}
              </button>
              <button
                className={`lang-btn ${lang === "zh" ? "active" : ""}`}
                onClick={() => setLang("zh")}
              >
                {t("chinese")}
              </button>
            </div>
          </div>
          <button className="manage-reset-btn" onClick={handleResetApps}>
            {t("reset")}
          </button>
        </div>
      )}

      <div className="bottom-actions">
        {!isManaging ? (
          <>
            <button className="action-btn" onClick={openAdd} title={t("addApp")}>
              ➕
            </button>
            <button className="action-btn" onClick={toggleManageMode} title={t("manage")}>
              ⚙️
            </button>
            <button className="action-btn exit-btn" onClick={handleExitApp} title={t("exitApp")}>
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
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("addAppTitle")}</h3>

            <div className="favicon-selector">
              {faviconSources.map((src, i) => (
                <button
                  key={i}
                  className={`favicon-option ${!useEmoji && selectedSource === i ? "selected" : ""}`}
                  onClick={() => {
                    setUseEmoji(false);
                    setSelectedSource(i);
                  }}
                  title={`${t("source")} ${i + 1}`}
                >
                  <FaviconOptionImg src={src} />
                </button>
              ))}
              <button
                className={`favicon-option emoji-option ${useEmoji ? "selected" : ""}`}
                onClick={() => {
                  setUseEmoji(true);
                  setNewIcon(getRandomEmoji());
                }}
                title={t("randomEmoji")}
              >
                <span>😀</span>
              </button>
            </div>
            {useEmoji && (
              <p className="emoji-label">
                {t("selected")} {newIcon || getRandomEmoji()}
              </p>
            )}

            <input
              placeholder={t("appNamePlaceholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <input
              placeholder={t("urlPlaceholder")}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddApp()}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeAdd}>
                {t("cancel")}
              </button>
              <button className="modal-btn confirm" onClick={handleAddApp}>
                {t("add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="modal-overlay" onClick={closeExitConfirm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t("confirmExitTitle")}</h3>
            <p className="confirm-text">{t("confirmExitMessage")}</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeExitConfirm}>
                {t("cancel")}
              </button>
              <button className="modal-btn confirm" onClick={confirmExit}>
                {t("quit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
