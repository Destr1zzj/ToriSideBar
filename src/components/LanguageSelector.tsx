import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../i18n";

export function LanguageSelector() {
  const { t, lang, setLang } = useI18n();

  const handleLangChange = (newLang: "en" | "zh") => {
    setLang(newLang);
    invoke("sync_language", { lang: newLang }).catch(() => {});
  };

  return (
    <div className="setting-row">
      <label>{t("language")}</label>
      <div className="lang-selector">
        <button
          className={`lang-btn ${lang === "en" ? "active" : ""}`}
          onClick={() => handleLangChange("en")}
        >
          {t("english")}
        </button>
        <button
          className={`lang-btn ${lang === "zh" ? "active" : ""}`}
          onClick={() => handleLangChange("zh")}
        >
          {t("chinese")}
        </button>
      </div>
    </div>
  );
}
