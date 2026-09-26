import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

// Also the entry point to the owner portal on small screens, where the
// navbar has no room for the link. cart-shift moves it aside for the cart
// panel on a restaurant page, like the page above it.
function Footer() {
  const { ownsRestaurant } = useAuth();
  const { t } = useTranslation();
  const linkClass = 'font-semibold text-primary-300 hover:text-primary-400';

  return (
    <footer className="cart-shift border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-sm text-text-muted sm:flex-row sm:justify-between md:px-8">
        <span className="font-display font-semibold text-text">Zelfora</span>
        {ownsRestaurant === true && (
          <Link to="/partner" className={linkClass}>
            {t('footer.myRestaurantLink')} &rarr;
          </Link>
        )}
        {ownsRestaurant === false && (
          <span>
            {t('footer.partnerPrompt')}{' '}
            <Link to="/partner" className={linkClass}>
              {t('footer.partnerLink')}
            </Link>
          </span>
        )}
      </div>
    </footer>
  );
}

export default Footer;
