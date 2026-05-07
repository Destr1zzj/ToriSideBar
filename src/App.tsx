import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return PRESET_APPS;
}

function saveApps(apps: AppItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function loadActive(): Set<string> {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored) return new Set(JSON.parse(stored));
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
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://api.faviconkit.com/${domain}/64`,
    `https://${domain}/favicon.ico`,
  ];
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
  const [apps, setApps] = useState<AppItem[]>(loadApps);
  const [activeApps, setActiveApps] = useState<Set<string>>(loadActive);
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [useEmoji, setUseEmoji] = useState(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState(loadTrigger());

  // Sorting mode
  const [isSorting, setIsSorting] = useState(false);
  const [sortDraggingIndex, setSortDraggingIndex] = useState<number | null>(null);
  const [sortDragOverIndex, setSortDragOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeApps.size > 0 && !isSorting) {
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeApps, isSorting]);

  const handleAppClick = useCallback(async (app: AppItem) => {
    try {
      await invoke("toggle_app_window", {
        label: app.label,
        title: app.title,
        url: app.url,
      });
      setActiveApps((prev) => {
        if (prev.has(app.label)) return prev;
        const next = new Set(prev);
        next.add(app.label);
        return next;
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
    invoke("collapse_bar").catch(() => {});
  }, []);

  const openManage = useCallback(async () => {
    await invoke("expand_bar").catch(() => {});
    setShowManage(true);
  }, []);

  const closeManage = useCallback(() => {
    setShowManage(false);
    invoke("collapse_bar").catch(() => {});
  }, []);

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

  const handleResetApps = useCallback(() => {
    activeApps.forEach((label) => {
      invoke("close_app_window", { label }).catch(() => {});
    });
    setActiveApps(new Set());
    setApps(PRESET_APPS);
    localStorage.removeItem(STORAGE_KEY);
  }, [activeApps]);

  // Sorting mode: use HTML5 Drag and Drop on the wrapper div
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setSortDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== sortDragOverIndex) {
      setSortDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      setApps((prev) => {
        const newApps = [...prev];
        const [moved] = newApps.splice(fromIndex, 1);
        newApps.splice(index, 0, moved);
        return newApps;
      });
    }
    setSortDraggingIndex(null);
    setSortDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setSortDraggingIndex(null);
    setSortDragOverIndex(null);
  };

  const toggleSortMode = useCallback(() => {
    setIsSorting((prev) => !prev);
  }, []);

  return (
    <div className="sidebar">
      {!isSorting && (
        <div className="top-actions">
          <button className="action-btn top-close-btn" onClick={handleCloseAll} title="关闭全部窗口">
            ✕
          </button>
        </div>
      )}

      <div className="app-list" ref={listRef}>
        {apps.map((app, index) => (
          <div
            key={app.id}
            className={`app-item-wrapper ${sortDraggingIndex === index ? "dragging" : ""} ${sortDragOverIndex === index && sortDraggingIndex !== index ? "drag-over" : ""}`}
            draggable={isSorting}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {isSorting && <span className="sort-handle">⋮⋮</span>}
            {isSorting ? (
              <div
                className={`app-item ${activeApps.has(app.label) ? "active" : ""}`}
                title={app.title}
              >
                <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
              </div>
            ) : (
              <button
                className={`app-item ${activeApps.has(app.label) ? "active" : ""}`}
                onClick={() => handleAppClick(app)}
                title={app.title}
              >
                <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
              </button>
            )}
            {activeApps.has(app.label) && !isSorting && (
              <button
                className="app-close-btn"
                onClick={(e) => handleCloseApp(app, e)}
                title="关闭"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bottom-actions">
        {!isSorting ? (
          <>
            <button className="action-btn" onClick={openAdd} title="添加应用">
              ➕
            </button>
            <button className="action-btn" onClick={openManage} title="管理应用">
              ⚙️
            </button>
            <button className="action-btn" onClick={toggleSortMode} title="排序">
              ☰
            </button>
            <button className="action-btn exit-btn" onClick={handleExitApp} title="退出应用">
              🚪
            </button>
          </>
        ) : (
          <button className="action-btn sort-done-btn" onClick={toggleSortMode} title="完成排序">
            ✓
          </button>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>添加应用</h3>

            <div className="favicon-selector">
              {faviconSources.map((src, i) => (
                <button
                  key={i}
                  className={`favicon-option ${!useEmoji && selectedSource === i ? "selected" : ""}`}
                  onClick={() => {
                    setUseEmoji(false);
                    setSelectedSource(i);
                  }}
                  title={`源 ${i + 1}`}
                >
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
              <button
                className={`favicon-option emoji-option ${useEmoji ? "selected" : ""}`}
                onClick={() => {
                  setUseEmoji(true);
                  setNewIcon(getRandomEmoji());
                }}
                title="随机 emoji"
              >
                <span>😀</span>
              </button>
            </div>
            {useEmoji && (
              <p className="emoji-label">
                已选: {newIcon || getRandomEmoji()}
              </p>
            )}

            <input
              placeholder="应用名称"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <input
              placeholder="网址 (如: notion.so)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddApp()}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeAdd}>
                取消
              </button>
              <button className="modal-btn confirm" onClick={handleAddApp}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showManage && (
        <div className="modal-overlay" onClick={closeManage}>
          <div className="modal manage-modal" onClick={(e) => e.stopPropagation()}>
            <h3>管理应用</h3>
            <div className="manage-list">
              {apps.map((app) => (
                <div key={app.id} className="manage-item">
                  <span className="manage-item-icon">
                    <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
                    {app.title}
                  </span>
                  <button className="delete-btn" onClick={() => handleRemoveApp(app.id)}>
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="settings-section">
              <h4>设置</h4>
              <div className="setting-row">
                <label>触发边栏弹出的像素</label>
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
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={handleResetApps}>
                恢复默认
              </button>
              <button className="modal-btn cancel" onClick={closeManage}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="modal-overlay" onClick={closeExitConfirm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>确认退出</h3>
            <p className="confirm-text">确定要退出 ToriSidebar 吗？</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeExitConfirm}>
                取消
              </button>
              <button className="modal-btn confirm" onClick={confirmExit}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
