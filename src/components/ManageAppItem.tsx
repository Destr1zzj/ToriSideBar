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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(index);
  };

  const handleResetWindow = () => {
    invoke("reset_window_state", { label: app.label }).catch(() => {});
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
          className="manage-action-btn reset-window"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleResetWindow}
          title={t("resetWindow")}
        >
          {t("resetWindow")}
        </button>
        <button
          className="manage-action-btn delete"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(app.id)}
          title={t("delete")}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
