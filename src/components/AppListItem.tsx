import { useI18n } from "../i18n";
import { AppIcon } from "./AppIcon";
import { getDomain } from "../utils/favicon";
import type { AppItem } from "../types";

interface AppItemProps {
  app: AppItem;
  isActive: boolean;
  onClick: (app: AppItem) => void;
  onClose: (app: AppItem, e: React.MouseEvent) => void;
}

export function AppListItem({ app, isActive, onClick, onClose }: AppItemProps) {
  const { t } = useI18n();

  return (
    <div className="app-item-wrapper">
      <button
        className={`app-item ${isActive ? "active" : ""}`}
        onClick={() => onClick(app)}
        title={app.title}
      >
        <AppIcon icon={app.icon} title={app.title} domain={getDomain(app.url)} />
      </button>
      {isActive && (
        <button
          className="app-close-btn"
          onClick={(e) => onClose(app, e)}
          title={t("close")}
        >
          ×
        </button>
      )}
    </div>
  );
}
