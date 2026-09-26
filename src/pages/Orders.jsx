import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import OrderStatusBadge from '../components/OrderStatusBadge';
import PageMessage from '../components/PageMessage';
import { deliveredSameDay, orderNumber, subscribeToOrders } from '../services/orders';
import { formatOptions } from '../services/menuOptions';

const DATE_AND_TIME = { dateStyle: 'medium', timeStyle: 'short' };

function Orders() {
  const { user } = useAuth();
  const { t, formatPrice, formatDate } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    async function loadOrders() {
      // Filter on user_id: restaurant owners can also read their restaurant's orders.
      const { data, error } = await supabase
        .from('orders')
        .select('*, restaurants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      setOrders(data);
      setStatus('ready');
    }
    loadOrders();
  }, [user.id]);

  // The restaurant updates the status from its portal; show it as it happens.
  useEffect(
    () =>
      subscribeToOrders(`user_id=eq.${user.id}`, (row) => {
        setOrders((current) => current.map((order) => (order.id === row.id ? { ...order, ...row } : order)));
      }),
    [user.id]
  );

  if (status === 'loading') {
    return <PageMessage>{t('orders.loading')}</PageMessage>;
  }

  if (status === 'error') {
    return <PageMessage tone="error">{t('orders.loadFailed')}</PageMessage>;
  }

  if (orders.length === 0) {
    return <PageMessage>{t('orders.empty')}</PageMessage>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">{t('orders.title')}</h1>
      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-card border border-border bg-surface/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold text-text">{order.restaurants?.name ?? t('orders.restaurantFallback')}</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-text-muted">
              {t('orders.orderedAt', { date: formatDate(order.created_at, DATE_AND_TIME) })} · #{orderNumber(order)}
            </p>
            {order.delivered_at && (
              <p className="text-sm text-text-muted">
                {t('orders.deliveredAt', {
                  date: formatDate(order.delivered_at, deliveredSameDay(order) ? { timeStyle: 'short' } : DATE_AND_TIME),
                })}
              </p>
            )}
            <ul className="mt-2 text-sm text-text-muted">
              {/* The same dish can be on an order twice, with other options. */}
              {order.items.map((item, index) => (
                <li key={index}>
                  {item.quantity}x {item.name}
                  {item.options?.length > 0 && <span className="text-text-faint"> ({formatOptions(item.options)})</span>}
                </li>
              ))}
            </ul>
            {Number(order.delivery_fee) > 0 && (
              <p className="mt-2 text-sm text-text-muted">
                {t('orders.deliveryFee', { fee: formatPrice(order.delivery_fee) })}
              </p>
            )}
            <p className="mt-2 font-semibold text-primary-300">{formatPrice(order.total)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Orders;
