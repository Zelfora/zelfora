import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function Orders() {
  const { user } = useAuth();
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

  if (loading) {
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">Bestellingen laden...</main>;
  }

  if (orders.length === 0) {
    return (
      <main className="px-4 py-16 text-center text-text-muted md:px-8">
        Je hebt nog geen bestellingen geplaatst.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-text">Mijn bestellingen</h1>
      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-card border border-border bg-surface/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-text">{order.restaurants?.name ?? 'Restaurant'}</p>
              <span className="rounded-pill bg-surface px-2 py-1 text-xs text-text-muted">{order.status}</span>
            </div>
            <p className="text-sm text-text-muted">{new Date(order.created_at).toLocaleString('nl-NL')}</p>
            <ul className="mt-2 text-sm text-text-muted">
              {order.items.map((item) => (
                <li key={item.menu_item_id}>
                  {item.quantity}x {item.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold text-primary-300">€{Number(order.total).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Orders;
