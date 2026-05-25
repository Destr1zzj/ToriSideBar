import { useState, useMemo } from "react";
import { useI18n } from "../i18n";
import { FaviconOptionImg } from "./FaviconImg";
import { getDomain, getFaviconSources } from "../utils/favicon";
import { getRandomEmoji } from "../utils/emoji";
import type { AppItem } from "../types";

interface AddAppModalProps {
  onClose: () => void;
  onAdd: (app: AppItem) => void;
}

export function AddAppModal({ onClose, onAdd }: AddAppModalProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [useEmoji, setUseEmoji] = useState(false);
  const [selectedSource, setSelectedSource] = useState(0);

  const currentDomain = url.trim() ? getDomain(url.trim()) : "";
  const faviconSources = useMemo(
    () => (currentDomain ? getFaviconSources(currentDomain) : []),
    [currentDomain]
  );

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    const id = "custom-" + Date.now();
    const domain = getDomain(finalUrl);
    let finalIcon: string;
    if (useEmoji) {
      finalIcon = icon.trim() || getRandomEmoji();
    } else {
      finalIcon = faviconSources[selectedSource] || getFaviconSources(domain)[0];
    }

    onAdd({
      id,
      label: "app-" + id,
      title: title.trim(),
      url: finalUrl,
      icon: finalIcon,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
              setIcon(getRandomEmoji());
            }}
            title={t("randomEmoji")}
          >
            <span>😀</span>
          </button>
        </div>

        {useEmoji && (
          <p className="emoji-label">
            {t("selected")} {icon || getRandomEmoji()}
          </p>
        )}

        <input
          placeholder={t("appNamePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <input
          placeholder={t("urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />

        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="modal-btn confirm" onClick={handleAdd}>
            {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}
