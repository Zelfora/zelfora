import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import AccountMenu from './AccountMenu';
import LanguageSwitcher from './LanguageSwitcher';

// The logo, and on the right: the link for restaurants, the language, the
// cart, and the account menu or the sign-in button. Everything else about
// the account (orders, profile, theme, signing out) is in the account menu.
function Navbar() {
  const { user, ownsRestaurant } = useAuth();
  const { itemCount } = useCart();
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Link
          to="/"
          className="font-display text-xl font-bold md:text-3xl bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"
        >
          Zelfora
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* The only link to the portal, for restaurants that want to join
              and for owners. On phones a shop icon, for lack of room. */}
          {ownsRestaurant !== null && (
            <NavLink
              to="/partner"
              aria-label={t(ownsRestaurant ? 'nav.myRestaurant' : 'nav.partner')}
              className={({ isActive }) =>
                `flex items-center text-sm transition-colors ${
                  isActive ? 'text-primary-300' : 'text-text-muted hover:text-primary-300'
                }`
              }
            >
              <Store size={22} className="sm:hidden" />
              <span className="hidden sm:inline">{t(ownsRestaurant ? 'nav.myRestaurant' : 'nav.partner')}</span>
            </NavLink>
          )}
          <LanguageSwitcher />

          {/* The count badge sticks out to the right, so on phones the cart
              needs extra room before the account button. */}
          <Link
            to="/cart"
            className="relative mr-2 cursor-pointer text-text-muted transition-colors hover:text-primary-300 sm:mr-0"
            aria-label={t('nav.cart')}
          >
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <AccountMenu />
          ) : (
            <Link
              to="/login"
              className="rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
            >
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
