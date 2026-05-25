import { createContext, useContext, useState, useEffect } from "react";
import { en, type Translations } from "./locales/en";
import { zh } from "./locales/zh";

export type Lang = "en" | "zh";

const translations: Record<Lang, Translations> = { en, zh };
const STORAGE_KEY = "tori-sidebar-language";

function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  return "en";
}

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => String(key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = (lang: Lang) => setLangState(lang);
  const t = (key: keyof Translations) => translations[lang][key] || String(key);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
