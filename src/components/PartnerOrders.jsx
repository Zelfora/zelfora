import { useId, useState } from 'react';
import { ChevronDown, LayoutGrid, List, MapPin, Phone } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import FormMessage from './FormMessage';
import OrderStatusBadge from './OrderStatusBadge';
import { cardClass, primaryButtonClass, secondaryButtonClass } from './formHelpers';
import { NEXT_STATUS, deliveredSameDay, isActiveOrder, orderErrorMessage, orderNumber } from '../services/orders';
import { formatOptions, sumPrices } from '../services/menuOptions';

const TIME = { hour: '2-digit', minute: '2-digit' };
const DATE_AND_TIME = { day: 'numeric', month: 'short', ...TIME };

const cancelButtonClass =
  'rounded-pill border border-border px-5 py-2.5 font-medium text-text transition-colors hover:border-danger hover:text-danger disabled:opacity-60';

// Button labels for moving an order on, by its current status.
const ADVANCE_LABEL = {
  placed: 'partner.orders.accept',
  preparing: 'partner.orders.markDelivering',
  delivering: 'partner.orders.markDelivered',
};

// An order's card is edged in its status color (as in OrderStatusBadge), so
// orders being prepared and orders on their way stand apart in a group.
const CARD_STATUS_CLASS = {
  placed: 'border-warn-400/60 bg-warn-400/5',
  preparing: 'border-primary-400/50 bg-primary-500/5',
  delivering: 'border-accent-400/50 bg-accent-400/5',
};

const VIEW_OPTIONS = [
  { view: 'list', Icon: List, label: 'partner.orders.viewList' },
  { view: 'tiles', Icon: LayoutGrid, label: 'partner.orders.viewTiles' },
];

// The portal's Orders tab: new orders, orders in progress, and the history,
// as a list or as tiles. ordersState comes from useOwnerOrders, which the
// portal keeps running, and layout from useOrdersLayout.
function PartnerOrders({ ordersState, layout, published }) {
  const { t } = useTranslation();
  const { orders, status, connection, historyHasMore, loadMoreHistory, updateStatus } = ordersState;
  const { view, collapsed, setView, toggleGroup } = layout;

  if (status === 'loading') {
    return <p className="text-sm text-text-muted">{t('common.loading')}</p>;
  }
  if (status === 'error') {
    return <p className="text-sm text-danger">{t('partner.orders.loadFailed')}</p>;
  }

  const byOldest = (a, b) => a.created_at.localeCompare(b.created_at);
  const placed = orders.filter((order) => order.status === 'placed').sort(byOldest);
  const inProgress = orders
    .filter((order) => order.status === 'preparing' || order.status === 'delivering')
    .sort(byOldest);
  const finished = orders.filter((order) => !isActiveOrder(order)).sort((a, b) => byOldest(b, a));
  const tiles = view === 'tiles';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        {connection !== 'connecting' && (
          <p className="flex items-center gap-2 text-xs text-text-faint">
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${connection === 'live' ? 'bg-accent-400' : 'bg-warn-400'}`}
            />
            {t(connection === 'live' ? 'partner.orders.live' : 'partner.orders.notLive')}
          </p>
        )}
        <ViewSwitch view={view} onChange={setView} />
      </div>

      {/* New orders can't be folded away, so none go unnoticed. */}
      <OrderGroup title={t('partner.orders.new')} count={placed.length}>
        {placed.length === 0 ? (
          <p className="text-sm text-text-muted">
            {t(published ? 'partner.orders.noneNew' : 'partner.orders.noneUnpublished')}
          </p>
        ) : (
          <OrderList orders={placed} tiles={tiles} onUpdate={updateStatus} />
        )}
      </OrderGroup>

      <OrderGroup
        title={t('partner.orders.inProgress')}
        count={inProgress.length}
        collapsed={collapsed.includes('inProgress')}
        onToggle={() => toggleGroup('inProgress')}
      >
        {inProgress.length === 0 ? (
          <p className="text-sm text-text-muted">{t('partner.orders.noneInProgress')}</p>
        ) : (
          <OrderList orders={inProgress} tiles={tiles} onUpdate={updateStatus} />
        )}
      </OrderGroup>

      <OrderGroup
        title={t('partner.orders.history')}
        collapsed={collapsed.includes('history')}
        onToggle={() => toggleGroup('history')}
      >
        {finished.length === 0 ? (
          <p className="text-sm text-text-muted">{t('partner.orders.noneHistory')}</p>
        ) : (
          <OrderList orders={finished} tiles={tiles} onUpdate={updateStatus} />
        )}
        {historyHasMore && (
          <button type="button" onClick={loadMoreHistory} className={`mt-4 ${secondaryButtonClass}`}>
            {t('partner.orders.loadMore')}
          </button>
        )}
      </OrderGroup>
    </div>
  );
}

// List or tiles. On a phone the tiles are a single column, just like the
// list, so the switch only shows from md.
function ViewSwitch({ view, onChange }) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('partner.orders.view')}
      className="ml-auto hidden flex-shrink-0 gap-1 rounded-pill border border-border bg-surface/70 p-1 md:flex"
    >
      {VIEW_OPTIONS.map(({ view: option, Icon, label }) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          onClick={() => onChange(option)}
          className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
            view === option ? 'bg-primary-500/15 text-primary-300' : 'text-text-muted hover:text-text'
          }`}
        >
          <Icon size={16} />
          {t(label)}
        </button>
      ))}
    </div>
  );
}

// A group of orders on its own card. With onToggle, its heading is a button
// that folds the group down to just the heading.
function OrderGroup({ title, count, collapsed = false, onToggle, children }) {
  const contentId = useId();

  const heading = (
    <>
      {title}
      {count !== undefined && <span className="font-normal text-text-faint"> ({count})</span>}
    </>
  );

  return (
    <section className={cardClass}>
      <h2 className="font-display text-lg font-semibold text-text">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className="group flex w-full items-center justify-between gap-3 text-left"
          >
            <span>{heading}</span>
            <ChevronDown
              size={20}
              className={`flex-shrink-0 text-text-muted transition-transform group-hover:text-primary-300 motion-reduce:transition-none ${
                collapsed ? '-rotate-90' : ''
              }`}
            />
          </button>
        ) : (
          heading
        )}
      </h2>
      <div id={contentId} hidden={collapsed} className="mt-4">
        {children}
      </div>
    </section>
  );
}

// Tiles fill as many columns as fit. At 18rem or wider, a tile's two buttons
// stay side by side.
function OrderList({ orders, tiles, onUpdate }) {
  return (
    <ul className={tiles ? 'grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4' : 'flex flex-col gap-4'}>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onUpdate={onUpdate} />
      ))}
    </ul>
  );
}

function OrderCard({ order, onUpdate }) {
  const i18n = useTranslation();
  const { t, formatPrice, formatDate } = i18n;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = isActiveOrder(order);

  async function changeStatus(nextStatus) {
    if (nextStatus === 'cancelled') {
      const key = order.status === 'placed' ? 'partner.orders.confirmReject' : 'partner.orders.confirmCancel';
      if (!window.confirm(t(key, { number: orderNumber(order) }))) return;
    }
    setError('');
    setBusy(true);
    try {
      await onUpdate(order, nextStatus);
    } catch (err) {
      console.error(err);
      // PGRST116: no row matched, because the status had already changed.
      setError(err.code === 'PGRST116' ? t('partner.orders.changedElsewhere') : orderErrorMessage(err, i18n));
    } finally {
      setBusy(false);
    }
  }

  const itemsTotal = sumPrices(order.items.map((item) => Number(item.price) * item.quantity));

  return (
    <li
      className={`flex min-w-0 flex-col rounded-card border p-4 ${
        CARD_STATUS_CLASS[order.status] ?? 'border-border bg-bg/40'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-text">
            #{orderNumber(order)}
            {order.customer_name && <span className="font-sans font-normal text-text-muted"> · {order.customer_name}</span>}
          </p>
          <p className="text-xs text-text-faint">
            {t('orders.orderedAt', { date: formatDate(order.created_at, DATE_AND_TIME) })}
            {order.delivered_at && (
              <>
                {' · '}
                {t('orders.deliveredAt', {
                  date: formatDate(order.delivered_at, deliveredSameDay(order) ? TIME : DATE_AND_TIME),
                })}
              </>
            )}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {(order.phone || order.delivery_address) && (
        <div className="mb-3 flex flex-col gap-1 text-sm text-text">
          {order.delivery_address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 hover:text-primary-300"
            >
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-accent-400" />
              {order.delivery_address}
            </a>
          )}
          {order.phone && (
            <a href={`tel:${order.phone}`} className="flex items-center gap-2 hover:text-primary-300">
              <Phone size={16} className="flex-shrink-0 text-accent-400" />
              {order.phone}
            </a>
          )}
        </div>
      )}

      {order.note && (
        <p className="mb-3 rounded-card border border-border bg-surface px-3 py-2 text-sm break-words text-text">
          <span className="font-semibold">{t('partner.orders.note')}:</span> {order.note}
        </p>
      )}

      <ul className="mb-3 divide-y divide-border text-sm">
        {/* The same dish can be on an order twice, with other options. */}
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3 py-1.5">
            <span className="text-text">
              <span className="font-semibold">{item.quantity}×</span> {item.name}
              {item.options?.length > 0 && (
                <span className="block pl-5 text-text-muted">{formatOptions(item.options)}</span>
              )}
            </span>
            <span className="text-text-muted">{formatPrice(Number(item.price) * item.quantity)}</span>
          </li>
        ))}
      </ul>

      {/* In tiles of different heights, the totals and buttons line up at the bottom. */}
      <div className="mt-auto">
        <dl className="flex flex-col gap-0.5 text-sm text-text-muted">
          {Number(order.delivery_fee) > 0 && (
            <>
              <div className="flex justify-between">
                <dt>{t('cart.subtotal')}</dt>
                <dd>{formatPrice(itemsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('cart.deliveryFee')}</dt>
                <dd>{formatPrice(order.delivery_fee)}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between font-semibold text-text">
            <dt>{t('cart.total')}</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <FormMessage error={error} className="mt-3" />

        {active && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => changeStatus(NEXT_STATUS[order.status])}
              className={primaryButtonClass}
            >
              {t(ADVANCE_LABEL[order.status])}
            </button>
            <button type="button" disabled={busy} onClick={() => changeStatus('cancelled')} className={cancelButtonClass}>
              {t(order.status === 'placed' ? 'partner.orders.reject' : 'partner.orders.cancel')}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default PartnerOrders;
