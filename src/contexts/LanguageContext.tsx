import React, { createContext, useContext, useState, ReactNode } from "react";
import { Language, translations } from "../i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (keyPath: string) => any;
  currentTranslations: (typeof translations)["en"];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Default to "en" as requested by user. Migrate from legacy key if set to en.
    const saved = localStorage.getItem("signal_lang_v2");
    if (saved === "en" || saved === "tr") return saved;
    // Overwrite any legacy stored preference so users get English by default
    localStorage.removeItem("signal_lang");
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("signal_lang_v2", lang);
    localStorage.setItem("signal_lang", lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "tr" : "en";
    setLanguage(nextLang);
  };

  // Safe nested translation lookup (e.g. t("header.aiKeys"))
  const t = (keyPath: string): any => {
    if (!keyPath || typeof keyPath !== "string") return "";
    const keys = keyPath.split(".");
    let current: any = translations[language] || translations["en"];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English if translation is missing
        let fallback: any = translations["en"];
        for (const k of keys) {
          if (fallback && fallback[k] !== undefined) {
            fallback = fallback[k];
          } else {
            return keyPath;
          }
        }
        return typeof fallback === "string" ? fallback : keyPath;
      }
    }
    return typeof current === "string" || typeof current === "number" ? current : keyPath;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        currentTranslations: translations[language] || translations["en"],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
