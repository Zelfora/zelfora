import { useId } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Receipt, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { useDropdown } from '../hooks/useDropdown';
import Avatar from './Avatar';
import ThemeSwitcher from './ThemeSwitcher';
import { dropdownPanelClass, navButtonClass } from './formHelpers';

// The pages in the menu that the avatar button lights up for.
const ACCOUNT_PAGES = ['/orders', '/profile'];

const itemClass =
  'flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-hover';

// The signed-in user's menu in the navbar, behind their avatar: their
// orders and profile, the theme, and signing out. A button that shows and
// hides a panel of links (a disclosure, not an ARIA menu), so it works with
// Tab like the rest of the page.
function AccountMenu() {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { open, setOpen, containerRef, buttonRef } = useDropdown();
  const panelId = useId();
  const highlighted = open || ACCOUNT_PAGES.includes(pathname);

  function close() {
    setOpen(false);
  }

  async function handleSignOut() {
    close();
    await signOut();
    navigate('/');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t('nav.account')}
        title={t('nav.account')}
        className={`${navButtonClass} gap-1 pr-1 pl-1 sm:pr-2 ${highlighted ? 'border-primary-500' : 'border-border'}`}
      >
        <Avatar src={profile?.avatar_url} name={user.email} className="h-7 w-7 text-sm" />
        <ChevronDown size={14} className={`hidden transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={panelId} className={`w-64 ${dropdownPanelClass}`}>
          <div className="px-4 py-2">
            <p className="text-xs text-text-faint">{t('nav.signedInAs')}</p>
            <p className="truncate text-sm font-medium text-text">{user.email}</p>
          </div>
          <hr className="my-1 border-border" />
          <ul>
            <MenuLink to="/orders" icon={Receipt} onClick={close}>
              {t('nav.orders')}
            </MenuLink>
            <MenuLink to="/profile" icon={User} onClick={close}>
              {t('nav.profile')}
            </MenuLink>
          </ul>
          <hr className="my-1 border-border" />
          {/* The switch has the same text as its accessible name. */}
          <div className="flex items-center justify-between gap-3 px-4 py-1.5">
            <span aria-hidden="true" className="text-sm text-text">
              {t('nav.theme')}
            </span>
            <ThemeSwitcher />
          </div>
          <hr className="my-1 border-border" />
          <button type="button" onClick={handleSignOut} className={`${itemClass} text-text`}>
            <LogOut size={16} className="text-text-muted" />
            {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

// A page in the account menu, lit up while it's the current one.
function MenuLink({ to, icon: Icon, onClick, children }) {
  return (
    <li>
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => `${itemClass} ${isActive ? 'text-primary-300' : 'text-text'}`}
      >
        <Icon size={16} className="text-text-muted" />
        {children}
      </NavLink>
    </li>
  );
}

export default AccountMenu;
