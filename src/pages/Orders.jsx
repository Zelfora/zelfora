import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { orderNumber, subscribeToOrders } from '../services/orders';

function Orders() {
  const { user } = useAuth();
  const { t, formatPrice, formatDate } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, restaurants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setOrders(data);
      setLoading(false);
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

  if (loading) {
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">{t('orders.loading')}</main>;
  }

  if (orders.length === 0) {
    return (
      <main className="px-4 py-16 text-center text-text-muted md:px-8">
        {t('orders.empty')}
      </main>
    );
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
              {formatDate(order.created_at, { dateStyle: 'medium', timeStyle: 'short' })} · #{orderNumber(order)}
            </p>
            <ul className="mt-2 text-sm text-text-muted">
              {order.items.map((item) => (
                <li key={item.menu_item_id}>
                  {item.quantity}x {item.name}
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
