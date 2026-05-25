import { useI18n } from "../i18n";
import { AppIcon } from "./AppIcon";
import { getDomain } from "../utils/favicon";
import type { AppItem } from "../types";

interface ManageAppItemProps {
  app: AppItem;
  index: number;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
}

export function ManageAppItem({
  app,
  index,
  isActive,
  isDragging,
  isDragOver,
  onRemove,
  onDragStart,
}: ManageAppItemProps) {
  const { t } = useI18n();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(index);
  };

  return (
    <div
      className={`app-item-wrapper manage-mode ${
        isDragging ? "dragging" : ""
      } ${isDragOver ? "drag-over" : ""}`}
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
      <button
        className="manage-action-btn delete"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(app.id)}
        title={t("delete")}
      >
        🗑️
      </button>
    </div>
  );
}
