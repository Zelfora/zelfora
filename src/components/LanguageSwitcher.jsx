import { useTranslation } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';
import Flag from './Flag';
import NavDropdown from './NavDropdown';

function LanguageSwitcher() {
  const { lang, setLang, t } = useTranslation();

  const options = LANGUAGES.map(({ code, label }) => ({
    value: code,
    label,
    lang: code,
    icon: <Flag code={code} />,
  }));

  return (
    <NavDropdown label={t('nav.language')} value={lang} options={options} onChange={setLang}>
      <Flag code={lang} />
      <span className="hidden sm:inline">{lang}</span>
    </NavDropdown>
  );
}

export default LanguageSwitcher;
