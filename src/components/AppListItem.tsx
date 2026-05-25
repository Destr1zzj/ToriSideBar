import { useI18n } from "../i18n";
import { AppIcon } from "./AppIcon";
import { getDomain } from "../utils/favicon";
import type { AppItem } from "../types";

interface AppListItemProps {
  app: AppItem;
  isActive: boolean;
  isDragging: boolean;
  style?: React.CSSProperties;
  onMouseDown: () => void;
  onClose: (app: AppItem, e: React.MouseEvent) => void;
}

export function AppListItem({
  app,
  isActive,
  isDragging,
  style,
  onMouseDown,
  onClose,
}: AppListItemProps) {
  const { t } = useI18n();

  return (
    <div
      className={`app-item-wrapper ${isDragging ? "dragging" : ""}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      <div
        className={`app-item ${isActive ? "active" : ""}`}
        title={app.title}
      >
        <AppIcon
          icon={app.icon}
          title={app.title}
          domain={getDomain(app.url)}
        />
      </div>
      {isActive && (
        <button
          className="app-close-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => onClose(app, e)}
          title={t("close")}
        >
          ×
        </button>
      )}
    </div>
  );
}
