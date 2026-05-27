import { useState } from "react";
import { useI18n } from "../i18n";
import { AppIcon } from "./AppIcon";
import { getDomain } from "../utils/favicon";
import type { AppItem } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface ManageAppItemProps {
  app: AppItem;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  style?: React.CSSProperties;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
}

export function ManageAppItem({
  app,
  index,
  isActive,
  isDragging,
  style,
  onRemove,
  onDragStart,
}: ManageAppItemProps) {
  const { t } = useI18n();
  const [resetDone, setResetDone] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(index);
  };

  const handleResetWindow = () => {
    invoke("reset_window_state", { label: app.label })
      .then(() => {
        setResetDone(true);
        setTimeout(() => setResetDone(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div
      className={`app-item-wrapper manage-mode ${isDragging ? "dragging" : ""}`}
      style={style}
      data-id={app.id}
    >
      <div
        className="drag-handle"
        title={t("dragToSort")}
        onMouseDown={handleMouseDown}
      >
        ⋮⋮
      </div>
      <div className={`app-item ${isActive ? "active" : ""}`} title={app.title}>
        <AppIcon
          icon={app.icon}
          title={app.title}
          domain={getDomain(app.url)}
        />
      </div>
      <div className="manage-item-actions">
        <button
          className={`manage-action-btn reset-window ${resetDone ? "success" : ""}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleResetWindow}
          title={t("resetWindow")}
        >
          {resetDone ? (
            <span style={{ fontSize: 14, lineHeight: 1 }}>✓</span>
          ) : (
            <img src="/icons/reset.png" style={{ width: 14, height: 14, filter: 'var(--icon-filter)' }} />
          )}
        </button>
        <button
          className="manage-action-btn delete"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(app.id)}
          title={t("delete")}
        >
          <img src="/icons/Delete.png" style={{ width: 14, height: 14, filter: 'var(--icon-filter)' }} />
        </button>
      </div>
    </div>
  );
}
