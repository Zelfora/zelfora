import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import ThemeSwitcher from './ThemeSwitcher';

// Holds the theme switch for visitors who aren't signed in (the navbar only
// has it in the account menu), and the link to the privacy statement. cart-shift
// moves it aside for the cart panel on a restaurant page, like the page above it.
function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="cart-shift border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-text-muted sm:flex-row sm:justify-between md:px-8">
        <div className="flex items-center gap-4">
          <span className="font-display font-semibold text-text">Zelfora</span>
          <Link to="/privacy" className="hover:text-primary-300">
            {t('footer.privacy')}
          </Link>
        </div>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}

export default Footer;
