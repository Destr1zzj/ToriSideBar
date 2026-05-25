import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n";
import { getDomain } from "../utils/favicon";
import { getRandomEmoji } from "../utils/emoji";
import type { AppItem } from "../types";

interface EdgeAppInfo {
  title: string;
  url: string;
  icon_url?: string;
}

interface ImportEdgeAppsModalProps {
  onClose: () => void;
  onImport: (apps: AppItem[]) => void;
}

export function ImportEdgeAppsModal({ onClose, onImport }: ImportEdgeAppsModalProps) {
  const { t } = useI18n();
  const [edgeApps, setEdgeApps] = useState<EdgeAppInfo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    invoke<EdgeAppInfo[]>("read_edge_user_apps")
      .then((apps) => {
        setEdgeApps(apps);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(edgeApps.map((_, i) => i)));
  };

  const handleImport = () => {
    const apps: AppItem[] = Array.from(selected).map((index) => {
      const edgeApp = edgeApps[index];
      const id = "edge-imported-" + Date.now() + "-" + index;
      return {
        id,
        label: "app-" + id,
        title: edgeApp.title,
        url: edgeApp.url,
        icon: `https://www.google.com/s2/favicons?domain=${getDomain(edgeApp.url)}&sz=128`,
      };
    });
    onImport(apps);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("importEdgeAppsTitle")}</h3>

        {loading && <p className="import-status">{t("loading")}</p>}
        {error && <p className="import-status error">{error}</p>}
        {!loading && !error && edgeApps.length === 0 && (
          <p className="import-status">{t("noEdgeApps")}</p>
        )}

        {!loading && !error && edgeApps.length > 0 && (
          <>
            <div className="import-app-list">
              {edgeApps.map((app, index) => (
                <div
                  key={index}
                  className={`import-app-item ${selected.has(index) ? "selected" : ""}`}
                  onClick={() => toggleSelect(index)}
                >
                  <span className="import-checkbox">
                    {selected.has(index) ? "☑" : "☐"}
                  </span>
                      <img
                    className="import-app-icon"
                    src={`https://www.google.com/s2/favicons?domain=${getDomain(app.url)}&sz=32`}
                    alt=""
                    draggable={false}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.querySelector(".import-fallback")?.classList.remove("hidden");
                    }}
                  />
                  <span className="import-app-icon import-fallback hidden">{getRandomEmoji()}</span>
                  <div className="import-app-info">
                    <div className="import-app-title">{app.title}</div>
                    <div className="import-app-url">{app.url}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="import-actions">
              <button
                className="modal-btn cancel"
                onClick={() => {
                  if (selected.size === edgeApps.length) {
                    setSelected(new Set());
                  } else {
                    selectAll();
                  }
                }}
              >
                {selected.size === edgeApps.length ? t("deselectAll") : t("selectAll")}
              </button>
              <button
                className="modal-btn confirm"
                onClick={handleImport}
                disabled={selected.size === 0}
                style={{ opacity: selected.size === 0 ? 0.5 : 1 }}
              >
                {t("import")} ({selected.size})
              </button>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
