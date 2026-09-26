import { useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import OrderStatusBadge from './OrderStatusBadge';
import { primaryButtonClass, secondaryButtonClass } from './formHelpers';
import { NEXT_STATUS, deliveredSameDay, isActiveOrder, orderErrorMessage, orderNumber } from '../services/orders';

const cardClass = 'rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md';

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

// The portal's Orders tab: new orders, orders in progress, and the history.
// ordersState comes from useOwnerOrders, which the portal keeps running.
function PartnerOrders({ ordersState, published }) {
  const { t } = useTranslation();
  const { orders, status, connection, historyHasMore, loadMoreHistory, updateStatus } = ordersState;

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

  return (
    <div className="flex flex-col gap-6">
      {connection !== 'connecting' && (
        <p className="flex items-center gap-2 text-xs text-text-faint">
          <span className={`h-2 w-2 rounded-full ${connection === 'live' ? 'bg-accent-400' : 'bg-warn-400'}`} />
          {t(connection === 'live' ? 'partner.orders.live' : 'partner.orders.notLive')}
        </p>
      )}

      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">
          {t('partner.orders.new')} <span className="font-normal text-text-faint">({placed.length})</span>
        </h2>
        {placed.length === 0 ? (
          <p className="text-sm text-text-muted">
            {t(published ? 'partner.orders.noneNew' : 'partner.orders.noneUnpublished')}
          </p>
        ) : (
          <OrderList orders={placed} onUpdate={updateStatus} />
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">
          {t('partner.orders.inProgress')} <span className="font-normal text-text-faint">({inProgress.length})</span>
        </h2>
        {inProgress.length === 0 ? (
          <p className="text-sm text-text-muted">{t('partner.orders.noneInProgress')}</p>
        ) : (
          <OrderList orders={inProgress} onUpdate={updateStatus} />
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-4 font-display text-lg font-semibold text-text">{t('partner.orders.history')}</h2>
        {finished.length === 0 ? (
          <p className="text-sm text-text-muted">{t('partner.orders.noneHistory')}</p>
        ) : (
          <OrderList orders={finished} onUpdate={updateStatus} />
        )}
        {historyHasMore && (
          <button type="button" onClick={loadMoreHistory} className={`mt-4 ${secondaryButtonClass}`}>
            {t('partner.orders.loadMore')}
          </button>
        )}
      </section>
    </div>
  );
}

function OrderList({ orders, onUpdate }) {
  return (
    <ul className="flex flex-col gap-4">
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

  const itemsTotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <li
      className={`rounded-card border p-4 ${
        order.status === 'placed' ? 'border-warn-400/60 bg-warn-400/5' : 'border-border bg-bg/40'
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
        <p className="mb-3 rounded-card border border-border bg-surface px-3 py-2 text-sm text-text">
          <span className="font-semibold">{t('partner.orders.note')}:</span> {order.note}
        </p>
      )}

      <ul className="mb-3 divide-y divide-border text-sm">
        {order.items.map((item) => (
          <li key={item.menu_item_id} className="flex justify-between gap-3 py-1.5">
            <span className="text-text">
              <span className="font-semibold">{item.quantity}×</span> {item.name}
            </span>
            <span className="text-text-muted">{formatPrice(Number(item.price) * item.quantity)}</span>
          </li>
        ))}
      </ul>

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

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

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
    </li>
  );
}

export default PartnerOrders;
