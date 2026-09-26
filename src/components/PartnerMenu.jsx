import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import MenuItemForm from './MenuItemForm';
import SortableMenu from './SortableMenu';
import Switch from './Switch';
import { deleteStoredImage } from '../services/images';

const cardClass = 'rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md';

// The menu in the owner's order; items they never moved come last.
async function fetchMenu(restaurantId) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('position', { nullsFirst: false })
    .order('created_at');
  if (error) throw error;
  return data;
}

// The portal's Menu tab: add dishes, and edit, reorder (drag and drop), mark
// as sold out or delete them. Customers see the menu in the order set here.
function PartnerMenu({ restaurant }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [orderError, setOrderError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  // Reorders are saved one after another, so a quick series of moves arrives in order.
  const saveQueue = useRef(Promise.resolve());
  const pendingSaves = useRef(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchMenu(restaurant.id);
        if (ignore) return;
        setMenu(data);
        setStatus('ready');
      } catch (error) {
        console.error(error);
        if (!ignore) setStatus('error');
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [restaurant.id]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  function replaceItem(saved) {
    setMenu((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  function removeItem(id) {
    setMenu((current) => current.filter((item) => item.id !== id));
  }

  const categories = [...new Set(menu.map((item) => item.category).filter(Boolean))];

  // items is the whole menu in its new order. moved = { id, category } when a
  // dish was dragged into another category.
  function saveOrder(items, moved) {
    setOrderError('');
    setMenu(items.map((item, index) => ({ ...item, position: index })));
    const ids = items.map((item) => item.id);
    pendingSaves.current += 1;
    setSaveStatus('saving');
    saveQueue.current = saveQueue.current.then(async () => {
      let saved = true;
      try {
        if (moved) {
          // .single() also fails when RLS silently matched no row.
          const { error } = await supabase
            .from('menu_items')
            .update({ category: moved.category })
            .eq('id', moved.id)
            .select('id')
            .single();
          if (error) throw error;
        }
        const { data, error } = await supabase.rpc('reorder_menu_items', { item_ids: ids });
        if (error) throw error;
        if (data !== ids.length) throw new Error('Not every menu item was reordered');
      } catch (error) {
        saved = false;
        console.error(error);
        setOrderError(t('partner.menu.reorderFailed'));
        // Show the menu as it was actually saved.
        try {
          setMenu(await fetchMenu(restaurant.id));
        } catch (fetchError) {
          console.error(fetchError);
        }
      }
      pendingSaves.current -= 1;
      if (pendingSaves.current === 0) setSaveStatus(saved ? 'saved' : 'idle');
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('partner.menu.addTitle')}</h2>
        <MenuItemForm
          restaurantId={restaurant.id}
          categories={categories}
          onSaved={(item) => setMenu((current) => [...current, item])}
        />
      </section>

      <section className={cardClass}>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-text">
            {t('partner.menu.title')} <span className="font-normal text-text-faint">({menu.length})</span>
          </h2>
          <p role="status" className="text-xs text-text-faint">
            {saveStatus === 'saving' && t('partner.menu.saving')}
            {saveStatus === 'saved' && (
              <span className="drag-fade-in flex items-center gap-1 text-accent-400">
                <Check size={14} />
                {t('partner.menu.saved')}
              </span>
            )}
          </p>
        </div>
        <p className="mb-4 text-sm text-text-muted">{t('partner.menu.intro')}</p>

        {status === 'loading' && <p className="text-sm text-text-muted">{t('common.loading')}</p>}
        {status === 'error' && <p className="text-sm text-danger">{t('partner.menu.loadFailed')}</p>}
        {status === 'ready' && menu.length === 0 && (
          <p className="text-sm text-text-muted">{t('partner.menu.empty')}</p>
        )}
        {orderError && <p className="mb-4 text-sm text-danger">{orderError}</p>}

        <SortableMenu
          menu={menu}
          onReorder={saveOrder}
          renderItem={(item, handle) => (
            <MenuItemRow
              item={item}
              handle={handle}
              categories={categories}
              onUpdated={replaceItem}
              onDeleted={removeItem}
            />
          )}
        />
      </section>
    </div>
  );
}

// One dish in the owner's menu: edit it, mark it as sold out or delete it
// right there in the list. handle is its drag handle for reordering.
function MenuItemRow({ item, handle, categories, onUpdated, onDeleted }) {
  const { t, formatPrice } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!window.confirm(t('partner.menu.confirmDelete', { name: item.name }))) return;
    setError('');
    setBusy(true);
    // select() so that a delete RLS silently skipped shows up as zero rows.
    const { data, error: deleteError } = await supabase.from('menu_items').delete().eq('id', item.id).select('id');
    setBusy(false);
    if (deleteError || data.length === 0) {
      console.error(deleteError ?? 'Menu item was not deleted');
      setError(t('partner.menu.deleteFailed'));
      return;
    }
    deleteStoredImage(item.image);
    onDeleted(item.id);
  }

  async function setAvailable(available) {
    setError('');
    setBusy(true);
    const { data, error: updateError } = await supabase
      .from('menu_items')
      .update({ available })
      .eq('id', item.id)
      .select()
      .single();
    setBusy(false);
    if (updateError) {
      console.error(updateError);
      setError(t('partner.error.saveFailed'));
      return;
    }
    onUpdated(data);
  }

  if (editing) {
    return (
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
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-card border border-border/70 bg-bg/40 py-2 pr-2 pl-1 sm:gap-3">
      {handle}
      <FoodImage
        src={item.image}
        alt={item.name}
        iconSize={18}
        className={`h-14 w-14 flex-shrink-0 rounded-[calc(var(--radius-card)-0.5rem)] object-cover ${
          item.available ? '' : 'opacity-50 grayscale'
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text">
          {item.name}
          {!item.available && (
            <span className="ml-2 rounded-pill border border-border px-2 py-0.5 text-xs font-semibold text-text-muted">
              {t('menuItem.soldOut')}
            </span>
          )}
        </p>
        {item.description && <p className="truncate text-sm text-text-muted">{item.description}</p>}
        <p className="text-sm font-semibold text-primary-300">{formatPrice(item.price)}</p>
        <Switch
          checked={item.available}
          onChange={setAvailable}
          disabled={busy}
          label={t('partner.menu.available')}
          className="mt-1.5"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={busy}
          aria-label={t('partner.menu.edit', { name: item.name })}
          title={t('partner.menu.edit', { name: item.name })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-primary-300"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          aria-label={t('partner.menu.delete', { name: item.name })}
          title={t('partner.menu.delete', { name: item.name })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default PartnerMenu;
