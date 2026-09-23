import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import NavDropdown from './NavDropdown';

const ICONS = { system: Monitor, light: Sun, dark: Moon };

function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation();
  const CurrentIcon = ICONS[preference];

  const options = ['system', 'light', 'dark'].map((value) => {
    const Icon = ICONS[value];
    return { value, label: t(`theme.${value}`), icon: <Icon size={16} className="text-text-muted" /> };
  });

  return (
    <NavDropdown label={t('nav.theme')} value={preference} options={options} onChange={setPreference}>
      <CurrentIcon size={16} />
    </NavDropdown>
  );
}

export default ThemeSwitcher;
