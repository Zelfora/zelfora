import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, Store, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from '../components/FoodImage';
import MenuItemForm from '../components/MenuItemForm';
import RestaurantSignupForm from '../components/RestaurantSignupForm';
import SingleImageForm from '../components/SingleImageForm';
import { primaryButtonClass } from '../components/formHelpers';
import { deleteStoredImage } from '../services/images';

const cardClass = 'rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md';

// Restaurant owner portal: register a restaurant, then manage its photo and menu.
// Not wrapped in ProtectedRoute, so signed-out visitors first see what it's about.
function Partner() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">{t('common.loading')}</main>;
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
      const { data, error } = await supabase.from('restaurants').select('*').eq('owner_id', userId).maybeSingle();
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
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">{t('partner.loading')}</main>;
  }
  if (status === 'error') {
    return <main className="px-4 py-16 text-center text-danger md:px-8">{t('partner.loadFailed')}</main>;
  }
  if (!restaurant) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <RestaurantSignupForm
          onCreated={(created) => {
            setRestaurant(created);
            markRestaurantOwned();
          }}
        />
      </main>
    );
  }
  return <MenuManager restaurant={restaurant} onRestaurantChange={setRestaurant} />;
}

function MenuManager({ restaurant, onRestaurantChange }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at');
      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      setMenu(data);
      setStatus('ready');
    }
    load();
  }, [restaurant.id]);

  // Owners may only change the image column (see the grant in restaurant_owners.sql).
  async function saveRestaurantImage(image) {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ image })
      .eq('id', restaurant.id)
      .select()
      .single();
    if (error) throw error;
    onRestaurantChange(data);
  }

  function replaceItem(saved) {
    setMenu((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  function removeItem(id) {
    setMenu((current) => current.filter((item) => item.id !== id));
  }

  // Items added by an admin may have no category; they're grouped under "Other".
  const groups = [...new Set(menu.map((item) => item.category ?? ''))];
  const categories = groups.filter(Boolean);

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

      {!restaurant.published && (
        <p className="rounded-card border border-warn-400/50 bg-warn-400/10 p-4 text-sm text-text">
          {t('partner.dashboard.pendingNotice')}
        </p>
      )}

      <section className={cardClass}>
        <h2 className="mb-1 font-display text-lg font-semibold text-text">{t('partner.photo.title')}</h2>
        <p className="mb-4 text-sm text-text-muted">{t('partner.photo.intro')}</p>
        <SingleImageForm
          kind="restaurantCover"
          label={t('partner.photo.title')}
          current={restaurant.image}
          save={saveRestaurantImage}
        />
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('partner.menu.addTitle')}</h2>
        <MenuItemForm
          restaurantId={restaurant.id}
          categories={categories}
          onSaved={(item) => setMenu((current) => [...current, item])}
        />
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">
          {t('partner.menu.title')} <span className="font-normal text-text-faint">({menu.length})</span>
        </h2>

        {status === 'loading' && <p className="text-sm text-text-muted">{t('common.loading')}</p>}
        {status === 'error' && <p className="text-sm text-danger">{t('partner.menu.loadFailed')}</p>}
        {status === 'ready' && menu.length === 0 && (
          <p className="text-sm text-text-muted">{t('partner.menu.empty')}</p>
        )}

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <h3 className="mb-1 font-display font-semibold text-primary-300">
                {group || t('partner.menu.uncategorized')}
              </h3>
              <ul className="divide-y divide-border">
                {menu
                  .filter((item) => (item.category ?? '') === group)
                  .map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      onUpdated={replaceItem}
                      onDeleted={removeItem}
                    />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// One dish in the owner's menu, editable and deletable right there in the list.
function MenuItemRow({ item, categories, onUpdated, onDeleted }) {
  const { t, formatPrice } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!window.confirm(t('partner.menu.confirmDelete', { name: item.name }))) return;
    setError('');
    setDeleting(true);
    // select() so that a delete RLS silently skipped shows up as zero rows.
    const { data, error: deleteError } = await supabase.from('menu_items').delete().eq('id', item.id).select('id');
    setDeleting(false);
    if (deleteError || data.length === 0) {
      console.error(deleteError ?? 'Menu item was not deleted');
      setError(t('partner.menu.deleteFailed'));
      return;
    }
    deleteStoredImage(item.image);
    onDeleted(item.id);
  }

  if (editing) {
    return (
      <li className="py-4">
        <div className="rounded-card border border-primary-500/40 bg-bg/40 p-4">
          <MenuItemForm
            item={item}
            categories={categories}
            onSaved={(saved) => {
              onUpdated(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <FoodImage
        src={item.image}
        alt={item.name}
        iconSize={18}
        className="h-14 w-14 flex-shrink-0 rounded-[calc(var(--radius-card)-0.5rem)] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text">{item.name}</p>
        {item.description && <p className="truncate text-sm text-text-muted">{item.description}</p>}
        <p className="text-sm font-semibold text-primary-300">{formatPrice(item.price)}</p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={deleting}
          aria-label={t('partner.menu.edit', { name: item.name })}
          title={t('partner.menu.edit', { name: item.name })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-primary-300"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={t('partner.menu.delete', { name: item.name })}
          title={t('partner.menu.delete', { name: item.name })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
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
