import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import FormMessage from '../components/FormMessage';
import PageMessage from '../components/PageMessage';
import PartnerMenu from '../components/PartnerMenu';
import PartnerOrders from '../components/PartnerOrders';
import PartnerSettings from '../components/PartnerSettings';
import RestaurantForm from '../components/RestaurantForm';
import Switch from '../components/Switch';
import { cardClass, noticeClass, primaryButtonClass } from '../components/formHelpers';
import { useOwnerOrders } from '../hooks/useOwnerOrders';
import { updateRestaurant } from '../services/restaurants';

// The portal's tabs, at /partner, /partner/menu and /partner/settings.
const TABS = [
  { path: '', label: 'partner.tab.orders' },
  { path: 'menu', label: 'partner.tab.menu' },
  { path: 'settings', label: 'partner.tab.settings' },
];

// Whether the restaurant is open changes with the time of day, so the portal
// asks the database again this often.
const OPEN_CHECK_INTERVAL = 60_000;

// Restaurant owner portal: register a restaurant, then handle its orders and
// manage its menu and settings.
// Not wrapped in ProtectedRoute, so signed-out visitors first see what it's about.
function Partner() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <PageMessage>{t('common.loading')}</PageMessage>;
  }
  if (!user) {
    return <PartnerIntro />;
  }
  // Keyed by user so nothing from a previous account carries over.
  return <PartnerDashboard key={user.id} userId={user.id} />;
}

function PartnerIntro() {
  const { t } = useTranslation();
  const location = useLocation();
  const steps = ['partner.intro.step1', 'partner.intro.step2', 'partner.intro.step3'];

  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 py-16 md:px-8">
      <div className="rounded-card border border-border bg-surface/70 p-8 backdrop-blur-md">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow">
          <Store size={22} />
        </span>
        <h1 className="mb-2 font-display text-2xl font-semibold text-text">{t('partner.intro.title')}</h1>
        <p className="mb-6 text-text-muted">{t('partner.intro.body')}</p>

        <ol className="mb-8 flex flex-col gap-3">
          {steps.map((key, index) => (
            <li key={key} className="flex items-start gap-3 text-sm text-text">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-primary-300">
                {index + 1}
              </span>
              <span className="pt-0.5">{t(key)}</span>
            </li>
          ))}
        </ol>

        {/* Login sends the user back here afterwards, like ProtectedRoute does. */}
        <Link to="/login" state={{ from: location }} className={`block text-center ${primaryButtonClass}`}>
          {t('partner.intro.cta')}
        </Link>
      </div>
    </main>
  );
}

function PartnerDashboard({ userId }) {
  const { markRestaurantOwned } = useAuth();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    async function load() {
      // One restaurant per owner (unique index in restaurant_owners.sql).
      // is_open is a computed column from the same file.
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, is_open')
        .eq('owner_id', userId)
        .maybeSingle();
      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      setRestaurant(data);
      setStatus('ready');
    }
    load();
  }, [userId]);

  if (status === 'loading') {
    return <PageMessage>{t('partner.loading')}</PageMessage>;
  }
  if (status === 'error') {
    return <PageMessage tone="error">{t('partner.loadFailed')}</PageMessage>;
  }
  if (!restaurant) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <div className={`${cardClass} sm:p-8`}>
          <h1 className="mb-2 font-display text-2xl font-semibold text-text">{t('partner.signup.title')}</h1>
          <p className="mb-6 text-sm text-text-muted">{t('partner.signup.intro')}</p>
          <RestaurantForm
            onSaved={(created) => {
              setRestaurant(created);
              markRestaurantOwned();
            }}
          />
        </div>
      </main>
    );
  }
  return <PartnerPortal restaurant={restaurant} onRestaurantChange={setRestaurant} />;
}

// onRestaurantChange takes a new restaurant row or an updater function.
function PartnerPortal({ restaurant, onRestaurantChange }) {
  const { tab = '' } = useParams();
  const { t } = useTranslation();
  const ordersState = useOwnerOrders(restaurant.id);
  const newCount = ordersState.orders.filter((order) => order.status === 'placed').length;

  useEffect(() => {
    const timer = setInterval(async () => {
      const { data } = await supabase.from('restaurants').select('is_open').eq('id', restaurant.id).maybeSingle();
      if (data) onRestaurantChange((current) => ({ ...current, is_open: data.is_open }));
    }, OPEN_CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, [restaurant.id, onRestaurantChange]);

  // The number of new orders in the browser tab's title, for owners who have
  // another tab in front.
  useEffect(() => {
    if (newCount === 0) return;
    const original = document.title;
    document.title = `(${newCount}) ${original}`;
    return () => {
      document.title = original;
    };
  }, [newCount]);

  if (!TABS.some(({ path }) => path === tab)) {
    return <Navigate to="/partner" replace />;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">{t('partner.dashboard.label')}</p>
          <h1 className="truncate font-display text-2xl font-semibold text-text">{restaurant.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge published={restaurant.published} />
          <Link
            to={`/restaurant/${restaurant.id}`}
            className="text-sm font-semibold text-primary-300 hover:text-primary-400"
          >
            {t('partner.dashboard.viewPage')} &rarr;
          </Link>
        </div>
      </header>

      {!restaurant.published && <p className={noticeClass}>{t('partner.dashboard.pendingNotice')}</p>}

      <OrderingStatus restaurant={restaurant} onRestaurantChange={onRestaurantChange} />

      <nav aria-label={t('partner.tab.label')} className="flex gap-1 rounded-pill border border-border bg-surface/70 p-1">
        {TABS.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path ? `/partner/${path}` : '/partner'}
            end
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center gap-2 rounded-pill px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-glow'
                  : 'text-text-muted hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {t(label)}
                {path === '' && newCount > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                      isActive ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
                    }`}
                  >
                    {newCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {tab === '' && <PartnerOrders ordersState={ordersState} published={restaurant.published} />}
      {tab === 'menu' && <PartnerMenu restaurant={restaurant} />}
      {tab === 'settings' && <PartnerSettings restaurant={restaurant} onRestaurantChange={onRestaurantChange} />}
    </main>
  );
}

const ORDERING_DOT = { open: 'bg-accent-400', paused: 'bg-warn-400', closed: 'bg-text-faint' };

// Whether customers can order right now, with the owner's switch to pause.
function OrderingStatus({ restaurant, onRestaurantChange }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function setAccepting(accepting) {
    setError('');
    setSaving(true);
    try {
      onRestaurantChange(await updateRestaurant(restaurant.id, { accepting_orders: accepting }));
    } catch (err) {
      console.error(err);
      setError(t('partner.error.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  let state = 'open';
  if (!restaurant.accepting_orders) state = 'paused';
  else if (!restaurant.is_open) state = 'closed';

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface/70 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-semibold text-text">
          <span className={`h-2.5 w-2.5 rounded-full ${ORDERING_DOT[state]}`} />
          {t(`partner.ordering.${state}`)}
        </p>
        <p className="text-sm text-text-muted">{t(`partner.ordering.${state}Hint`)}</p>
        <FormMessage error={error} />
      </div>
      <Switch
        checked={restaurant.accepting_orders}
        onChange={setAccepting}
        disabled={saving}
        label={t('partner.ordering.accepting')}
        className="flex-shrink-0"
      />
    </section>
  );
}

function StatusBadge({ published }) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-text">
      <span className={`h-2 w-2 rounded-full ${published ? 'bg-accent-400' : 'bg-warn-400'}`} />
      {t(published ? 'partner.status.live' : 'partner.status.pending')}
    </span>
  );
}

export default Partner;
