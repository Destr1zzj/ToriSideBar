import { useI18n } from "../i18n";

interface ExitConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitConfirmModal({ onCancel, onConfirm }: ExitConfirmModalProps) {
  const { t } = useI18n();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("confirmExitTitle")}</h3>
        <p className="confirm-text">{t("confirmExitMessage")}</p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button className="modal-btn confirm" onClick={onConfirm}>
            {t("quit")}
          </button>
        </div>
      </div>
    </div>
  );
}
