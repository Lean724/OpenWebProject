/**
 * OpenWebProject - Language Context & Hook
 * Provides reactive language state with persistence to localStorage.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  translations,
  TranslationKey,
  LanguageOption,
} from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey, defaultText?: string) => string;
  languages: LanguageOption[];
}

const STORAGE_KEY = 'openwebproject_preferred_lang';

const getInitialLanguage = (): SupportedLanguage => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && (saved === 'es' || saved === 'en' || saved === 'pt')) {
      return saved;
    }
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('pt')) return 'pt';
    if (nav.startsWith('en')) return 'en';
    return 'es';
  } catch {
    return 'es';
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key: TranslationKey, defaultText?: string) => defaultText || key,
  languages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore in strict environments
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // Ignore
    }
  }, [language]);

  const t = (key: TranslationKey, defaultText?: string): string => {
    const dict = translations[language];
    if (dict && key in dict) {
      return (dict as any)[key];
    }
    // Fallback to Spanish or provided default
    const fallbackDict = translations.es;
    if (fallbackDict && key in fallbackDict) {
      return (fallbackDict as any)[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
