import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';
import Flag from './Flag';

function LanguageSwitcher() {
  const { lang, setLang, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function choose(code) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.language')}
        className="flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1.5 text-xs font-semibold uppercase text-text-muted transition-colors hover:border-primary-500 hover:text-text"
      >
        <Flag code={lang} />
        <span className="hidden sm:inline">{lang}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-40 overflow-hidden rounded-card border border-border bg-bg-elevated/95 py-1 shadow-glow backdrop-blur-md"
        >
          {LANGUAGES.map(({ code, label }) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === lang}
                lang={code}
                onClick={() => choose(code)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-text transition-colors hover:bg-surface-hover"
              >
                <Flag code={code} />
                <span className="flex-1">{label}</span>
                {code === lang && <Check size={16} className="text-primary-300" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSwitcher;
