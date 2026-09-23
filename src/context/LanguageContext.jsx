import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'zelfora.lang';
const DEFAULT_LANG = 'nl';

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (translations[saved]) return saved;
  } catch {
    // Storage unavailable (e.g. private mode): fall through to browser language.
  }
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  return translations[browser] ? browser : DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);
  const locale = LANGUAGES.find((l) => l.code === lang).locale;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(code) {
    if (!translations[code]) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }

  const has = useCallback((key) => key in translations[lang] || key in translations[DEFAULT_LANG], [lang]);

  const t = useCallback(
    (key, vars) => {
      const template = translations[lang][key] ?? translations[DEFAULT_LANG][key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
    },
    [lang]
  );

  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }),
    [locale]
  );

  const value = {
    lang,
    locale,
    setLang,
    t,
    has,
    formatPrice: (amount) => priceFormatter.format(Number(amount)),
    formatDate: (date, options) => new Date(date).toLocaleString(locale, options),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}
