import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import MenuItemForm from './MenuItemForm';
import Switch from './Switch';
import { deleteStoredImage } from '../services/images';

const cardClass = 'rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md';

const arrowButtonClass =
  'flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-primary-300 disabled:pointer-events-none disabled:opacity-30';

const groupOf = (item) => item.category ?? '';

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

// The portal's Menu tab: add dishes, and edit, reorder, mark as sold out or
// delete them. Customers see the menu in the order set here.
function PartnerMenu({ restaurant }) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [orderError, setOrderError] = useState('');
  // Reorders are saved one after another, so a quick series of moves arrives in order.
  const saveQueue = useRef(Promise.resolve());

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

  function replaceItem(saved) {
    setMenu((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  function removeItem(id) {
    setMenu((current) => current.filter((item) => item.id !== id));
  }

  // Categories in the order of their first dish. Items added by an admin may
  // have no category; they're grouped under "Other".
  const groups = [...new Set(menu.map(groupOf))];
  const categories = groups.filter(Boolean);
  // The menu as customers see it: category by category.
  const ordered = groups.flatMap((group) => menu.filter((item) => groupOf(item) === group));

  function saveOrder(next) {
    setOrderError('');
    setMenu(next.map((item, index) => ({ ...item, position: index })));
    const ids = next.map((item) => item.id);
    saveQueue.current = saveQueue.current.then(async () => {
      const { data, error } = await supabase.rpc('reorder_menu_items', { item_ids: ids });
      if (error || data !== ids.length) {
        console.error(error ?? 'Not every menu item was reordered');
        setOrderError(t('partner.menu.reorderFailed'));
        // Show the order that was actually saved.
        try {
          setMenu(await fetchMenu(restaurant.id));
        } catch (fetchError) {
          console.error(fetchError);
        }
      }
    });
  }

  function moveItem(item, direction) {
    const siblings = ordered.filter((other) => groupOf(other) === groupOf(item));
    const target = siblings[siblings.findIndex((other) => other.id === item.id) + direction];
    if (!target) return;
    saveOrder(ordered.map((other) => (other.id === item.id ? target : other.id === target.id ? item : other)));
  }

  function moveGroup(group, direction) {
    const index = groups.indexOf(group);
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    const nextGroups = [...groups];
    [nextGroups[index], nextGroups[target]] = [nextGroups[target], nextGroups[index]];
    saveOrder(nextGroups.flatMap((g) => ordered.filter((item) => groupOf(item) === g)));
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
        <h2 className="mb-1 font-display text-lg font-semibold text-text">
          {t('partner.menu.title')} <span className="font-normal text-text-faint">({menu.length})</span>
        </h2>
        <p className="mb-4 text-sm text-text-muted">{t('partner.menu.intro')}</p>

        {status === 'loading' && <p className="text-sm text-text-muted">{t('common.loading')}</p>}
        {status === 'error' && <p className="text-sm text-danger">{t('partner.menu.loadFailed')}</p>}
        {status === 'ready' && menu.length === 0 && (
          <p className="text-sm text-text-muted">{t('partner.menu.empty')}</p>
        )}
        {orderError && <p className="mb-4 text-sm text-danger">{orderError}</p>}

        <div className="space-y-6">
          {groups.map((group, groupIndex) => {
            const groupName = group || t('partner.menu.uncategorized');
            const items = ordered.filter((item) => groupOf(item) === group);
            return (
              <div key={group}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h3 className="font-display font-semibold text-primary-300">{groupName}</h3>
                  {groups.length > 1 && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={groupIndex === 0}
                        onClick={() => moveGroup(group, -1)}
                        aria-label={t('partner.menu.moveCategoryUp', { name: groupName })}
                        title={t('partner.menu.moveCategoryUp', { name: groupName })}
                        className={arrowButtonClass}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={groupIndex === groups.length - 1}
                        onClick={() => moveGroup(group, 1)}
                        aria-label={t('partner.menu.moveCategoryDown', { name: groupName })}
                        title={t('partner.menu.moveCategoryDown', { name: groupName })}
                        className={arrowButtonClass}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-border">
                  {items.map((item, index) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                      onMove={(direction) => moveItem(item, direction)}
                      onUpdated={replaceItem}
                      onDeleted={removeItem}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// One dish in the owner's menu: reorder, edit, mark as sold out or delete it
// right there in the list.
function MenuItemRow({ item, categories, canMoveUp, canMoveDown, onMove, onUpdated, onDeleted }) {
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
      <div className="flex flex-shrink-0 flex-col">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
          aria-label={t('partner.menu.moveUp', { name: item.name })}
          title={t('partner.menu.moveUp', { name: item.name })}
          className={arrowButtonClass}
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
          aria-label={t('partner.menu.moveDown', { name: item.name })}
          title={t('partner.menu.moveDown', { name: item.name })}
          className={arrowButtonClass}
        >
          <ChevronDown size={16} />
        </button>
      </div>
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
    </li>
  );
}

export default PartnerMenu;
