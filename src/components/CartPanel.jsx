import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Minus, PanelRightClose, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import Modal from './Modal';
import { primaryButtonClass } from './formHelpers';
import { MAX_QUANTITY, formatOptions } from '../services/menuOptions';

// How long "Added: ..." shows on the bar and the folded button.
const ADDED_MESSAGE_MS = 1800;

// The cart on a restaurant page. From xl it floats on the right while the
// customer browses, and the page moves aside to make room (.cart-shift in
// index.css). The customer can fold it into a small button, which puts the
// page back in the middle. Below xl there's no room next to the menu, so a
// bar at the bottom shows the total and opens the cart as a sheet.
function CartPanel({ restaurant }) {
  const { t, formatPrice } = useTranslation();
  const navigate = useNavigate();
  const { items, itemCount, subtotal, lastAdded, panelMinimized, setPanelMinimized, restaurantId } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Every open starts the sheet's list afresh, so its lines don't grow in.
  const [sheetKey, setSheetKey] = useState(0);
  const sheetTitleId = useId();
  const minimizeRef = useRef(null);
  const expandRef = useRef(null);

  const hasItems = items.length > 0;
  const panelShown = hasItems && !panelMinimized;
  const folded = hasItems && panelMinimized;
  // The fee is only known here for this restaurant's cart; the cart page
  // shows it for any.
  const deliveryFee = restaurantId === restaurant.id ? Number(restaurant.delivery_fee) : null;

  // An emptied cart closes the sheet.
  if (sheetOpen && !hasItems) setSheetOpen(false);

  // Before paint, so a page that opens with the panel doesn't slide aside.
  useLayoutEffect(() => {
    const { classList } = document.body;
    classList.toggle('cart-panel-open', panelShown);
    classList.toggle('cart-folded', folded);
    classList.toggle('cart-bar-space', hasItems);
    return () => classList.remove('cart-panel-open', 'cart-folded', 'cart-bar-space');
  }, [panelShown, folded, hasItems]);

  // After an add, the bar and the folded button say what was added for a
  // moment. The panel itself highlights the line instead.
  const [seenAdd, setSeenAdd] = useState(lastAdded.count);
  useEffect(() => {
    if (lastAdded.count === seenAdd) return;
    const timer = setTimeout(() => setSeenAdd(lastAdded.count), ADDED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [lastAdded.count, seenAdd]);
  const justAdded = lastAdded.count !== seenAdd ? items.find((item) => item.key === lastAdded.key) : null;
  const bump = justAdded ? lastAdded.count : 0;

  // Keep keyboard focus on the control that replaces the one just pressed.
  function minimize() {
    flushSync(() => setPanelMinimized(true));
    expandRef.current?.focus({ preventScroll: true });
  }

  function expand() {
    flushSync(() => setPanelMinimized(false));
    minimizeRef.current?.focus({ preventScroll: true });
  }

  function openSheet() {
    setSheetKey((key) => key + 1);
    setSheetOpen(true);
  }

  const checkout = () => navigate('/cart');

  return (
    <>
      {/* The panel, from xl. It sits just below the navbar. */}
      <aside
        aria-label={t('cartPanel.title')}
        inert={!panelShown}
        className={`fixed right-4 top-[5.25rem] z-40 hidden max-h-[calc(100dvh-6.25rem)] w-[22.5rem] flex-col rounded-card border border-border bg-surface/85 shadow-2xl backdrop-blur-xl transition-[translate,opacity] duration-500 ease-drawer xl:flex ${
          panelShown ? '' : 'pointer-events-none translate-x-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-text">{t('cartPanel.title')}</h2>
            <CartRestaurant restaurant={restaurant} />
          </div>
          <button
            ref={minimizeRef}
            type="button"
            onClick={minimize}
            aria-label={t('cartPanel.minimize')}
            title={t('cartPanel.minimize')}
            className="-mr-1.5 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-primary-300"
          >
            <PanelRightClose size={18} />
          </button>
        </header>
        <CartLines />
        <CartFooter deliveryFee={deliveryFee} onCheckout={checkout} />
      </aside>

      {/* The folded panel, from xl. */}
      <button
        ref={expandRef}
        type="button"
        onClick={expand}
        inert={!folded}
        aria-label={t('cartPanel.expand', { count: itemCount, total: formatPrice(subtotal) })}
        className={`fixed right-6 bottom-6 z-40 hidden cursor-pointer items-center gap-3 rounded-pill border border-border bg-surface/90 py-3 pr-5 pl-4 text-text shadow-glow backdrop-blur-xl transition-[translate,opacity,border-color] duration-500 ease-drawer hover:border-primary-500/60 xl:flex ${
          folded ? '' : 'pointer-events-none translate-x-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <ChevronLeft size={18} className="text-text-muted" />
        <CartIcon count={itemCount} bump={bump} />
        <AddedOr item={justAdded} className="max-w-56 pl-1 font-medium">
          {t('cartPanel.title')}
        </AddedOr>
        <span className="font-semibold tabular-nums text-primary-300">{formatPrice(subtotal)}</span>
      </button>

      {/* The bar, below xl. */}
      <button
        type="button"
        onClick={openSheet}
        inert={!hasItems}
        className={`fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg cursor-pointer items-center gap-4 rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-3.5 font-semibold text-white shadow-glow-lg transition-[translate,opacity,scale] duration-500 ease-drawer active:scale-[0.98] xl:hidden ${
          hasItems ? '' : 'pointer-events-none translate-y-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <CartIcon count={itemCount} bump={bump} onGradient />
        <AddedOr item={justAdded} className="flex-1 text-left">
          {t('cartPanel.view')}
        </AddedOr>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </button>

      {/* The sheet the bar opens. */}
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} labelledBy={sheetTitleId} className="sm:max-w-md">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 id={sheetTitleId} className="font-display text-xl font-semibold text-text">
              {t('cartPanel.title')}
            </h2>
            <CartRestaurant restaurant={restaurant} />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label={t('itemDialog.close')}
            className="-mr-1.5 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-primary-300"
          >
            <X size={20} />
          </button>
        </header>
        <CartLines key={sheetKey} />
        <CartFooter deliveryFee={deliveryFee} onCheckout={checkout} />
      </Modal>
    </>
  );
}

// Which restaurant the cart is from, as a link when it's another one.
function CartRestaurant({ restaurant }) {
  const { t } = useTranslation();
  const { restaurantId, restaurantName } = useCart();
  if (!restaurantId) return null;

  if (restaurantId === restaurant.id) {
    return <p className="truncate text-sm text-text-muted">{restaurantName}</p>;
  }
  return (
    <p className="truncate text-sm text-text-muted">
      {t('cartPanel.from')}{' '}
      <Link to={`/restaurant/${restaurantId}`} className="font-medium text-primary-300 hover:text-primary-400">
        {restaurantName}
      </Link>
    </p>
  );
}

// The cart icon with the number of items, which hops when bump changes.
function CartIcon({ count, bump, onGradient = false }) {
  return (
    <span key={bump} className={`relative flex flex-shrink-0 ${bump ? 'cart-bump' : ''}`}>
      <ShoppingBag size={20} />
      <span
        className={`absolute -top-2 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums ${
          onGradient ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
        }`}
      >
        {count}
      </span>
    </span>
  );
}

// "Added: <dish>" for a moment after an add, otherwise children.
function AddedOr({ item, className, children }) {
  const { t } = useTranslation();
  return (
    <span className={`min-w-0 truncate ${className}`}>
      {item ? (
        <span key={item.key} className="fade-up-in inline-flex max-w-full items-center gap-1.5">
          <Check size={16} strokeWidth={3} className="flex-shrink-0" />
          <span className="truncate">{t('cartPanel.added', { name: item.name })}</span>
        </span>
      ) : (
        <span className="fade-up-in">{children}</span>
      )}
    </span>
  );
}

function CartLines() {
  const { t } = useTranslation();
  const { items, lastAdded } = useCart();
  // Lines that were there when the list appeared don't grow in, and only
  // adds after that light up.
  const [initialKeys] = useState(() => new Set(items.map((item) => item.key)));
  const [initialAddCount] = useState(lastAdded.count);
  const [leaving, setLeaving] = useState(() => new Set());
  const listRef = useRef(null);
  const lineRefs = useRef(new Map());

  // Scroll the added line into view once it has grown in. Only the list
  // scrolls, never the page.
  useEffect(() => {
    if (lastAdded.count === initialAddCount) return;
    const timer = setTimeout(() => {
      const list = listRef.current;
      const line = lineRefs.current.get(lastAdded.key);
      if (!list || !line) return;
      const top = line.offsetTop;
      const bottom = top + line.offsetHeight;
      if (top < list.scrollTop) {
        list.scrollTo({ top, behavior: 'smooth' });
      } else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' });
      }
    }, 340);
    return () => clearTimeout(timer);
  }, [lastAdded, initialAddCount]);

  if (items.length === 0) {
    return <p className="px-5 py-6 text-sm text-text-muted">{t('cart.empty')}</p>;
  }

  return (
    <ul ref={listRef} className="relative flex-1 overflow-y-auto overscroll-contain px-3">
      {items.map((item) => (
        <CartLine
          key={item.key}
          ref={(node) => {
            if (node) lineRefs.current.set(item.key, node);
            else lineRefs.current.delete(item.key);
          }}
          item={item}
          enter={!initialKeys.has(item.key)}
          flash={lastAdded.key === item.key && lastAdded.count > initialAddCount ? lastAdded.count : 0}
          leaving={leaving.has(item.key)}
          onLeave={() => setLeaving((current) => new Set(current).add(item.key))}
          onLeft={() =>
            setLeaving((current) => {
              const next = new Set(current);
              next.delete(item.key);
              return next;
            })
          }
        />
      ))}
    </ul>
  );
}

// One line: the dish, its options, its price and how many. Removing it
// shrinks it away first (.cart-line in index.css).
function CartLine({ ref, item, enter, flash, leaving, onLeave, onLeft }) {
  const { t, formatPrice } = useTranslation();
  const { updateQuantity, removeItem } = useCart();
  const options = formatOptions(item.options);

  function remove() {
    onLeave();
    setTimeout(() => {
      removeItem(item.key);
      onLeft();
    }, 240);
  }

  // The hover color is added per button: two hover:text classes on one
  // element don't override each other in class order.
  const stepClass =
    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-35';

  return (
    <li ref={ref} data-leaving={leaving || undefined} className={`cart-line ${enter ? 'cart-line-enter' : ''}`}>
      <div>
        <div className="relative flex gap-3 rounded-xl px-2 py-3">
          {flash > 0 && (
            <span key={flash} aria-hidden="true" className="cart-line-flash pointer-events-none absolute inset-0 rounded-xl" />
          )}
          <FoodImage
            src={item.image}
            alt=""
            iconSize={16}
            className="relative h-12 w-12 flex-shrink-0 rounded-lg object-cover"
          />
          <div className="relative min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium leading-snug text-text">{item.name}</p>
              <p className="text-sm font-semibold tabular-nums text-text">{formatPrice(item.price * item.quantity)}</p>
            </div>
            {options && <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{options}</p>}
            <div className="mt-1.5 inline-flex items-center rounded-pill border border-border bg-bg/50">
              {item.quantity === 1 ? (
                <button
                  type="button"
                  onClick={remove}
                  aria-label={t('cart.remove', { name: item.name })}
                  className={`${stepClass} hover:text-danger`}
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  aria-label={t('cart.decrease', { name: item.name })}
                  className={`${stepClass} hover:text-primary-300`}
                >
                  <Minus size={13} />
                </button>
              )}
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-text">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                disabled={item.quantity >= MAX_QUANTITY}
                aria-label={t('cart.increase', { name: item.name })}
                className={`${stepClass} hover:text-primary-300`}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function CartFooter({ deliveryFee, onCheckout }) {
  const { t, formatPrice } = useTranslation();
  const { subtotal, items } = useCart();
  const total = subtotal + (deliveryFee ?? 0);

  return (
    <div className="border-t border-border px-5 pt-3 pb-4">
      <dl className="mb-3 flex flex-col gap-1 text-sm text-text-muted">
        <div className="flex justify-between">
          <dt>{t('cart.subtotal')}</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        {deliveryFee !== null && (
          <div className="flex justify-between">
            <dt>{t('cart.deliveryFee')}</dt>
            <dd className="tabular-nums">{deliveryFee === 0 ? t('cart.freeDelivery') : formatPrice(deliveryFee)}</dd>
          </div>
        )}
      </dl>
      <button
        type="button"
        onClick={onCheckout}
        disabled={items.length === 0}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 ${primaryButtonClass}`}
      >
        <span>{t('cartPanel.checkout')}</span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </button>
    </div>
  );
}

export default CartPanel;
