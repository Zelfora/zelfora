import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

function Navbar() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
        <Link
          to="/"
          className="font-display text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"
        >
          Zelfora<span className="text-text-muted">.nl</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeSwitcher />
          <LanguageSwitcher />

          <Link
            to="/cart"
            className="relative cursor-pointer text-text-muted transition-colors hover:text-primary-300"
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
            <div className="flex items-center gap-3">
              <Link to="/orders" className="hidden text-sm text-text-muted hover:text-primary-300 md:inline">
                {t('nav.orders')}
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden rounded-pill border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary-500 sm:inline-block"
              >
                {t('nav.signOut')}
              </button>
              <NavLink
                to="/profile"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
                className={({ isActive }) =>
                  `flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-display text-sm font-bold uppercase text-white transition-transform hover:scale-105 ${
                    isActive ? 'shadow-glow-lg ring-2 ring-primary-300' : 'shadow-glow'
                  }`
                }
              >
                {user.email?.[0] ?? '?'}
              </NavLink>
            </div>
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
