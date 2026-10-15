import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

const ICONS = { system: Monitor, light: Sun, dark: Moon };

// Three small buttons for the theme: follow the device, light or dark. In
// the account menu and the footer.
function ThemeSwitcher({ className = '' }) {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t('nav.theme')} className={`flex rounded-pill border border-border p-0.5 ${className}`}>
      {['system', 'light', 'dark'].map((value) => {
        const Icon = ICONS[value];
        const active = value === preference;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            aria-pressed={active}
            aria-label={t(`theme.${value}`)}
            title={t(`theme.${value}`)}
            className={`flex h-7 w-8 cursor-pointer items-center justify-center rounded-pill transition-colors ${
              active ? 'bg-primary-500/15 text-primary-300' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
