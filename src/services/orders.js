import { supabase } from '../supabaseClient';

// Order statuses and their next step. supabase/orders.sql allows one step
// forward at a time, or cancelling before delivery.
export const NEXT_STATUS = {
  placed: 'preparing',
  preparing: 'delivering',
  delivering: 'delivered',
};

export const ACTIVE_STATUSES = Object.keys(NEXT_STATUS);
export const FINISHED_STATUSES = ['delivered', 'cancelled'];

export function isActiveOrder(order) {
  return ACTIVE_STATUSES.includes(order.status);
}

// Short reference an owner and customer can say on the phone.
export function orderNumber(order) {
  return order.id.slice(0, 6).toUpperCase();
}

// Message for an error from placing or updating an order. The database
// triggers send a hint such as "restaurant_closed"; see orders.sql.
export function orderErrorMessage(err, { t, has }) {
  const key = `orderError.${err?.hint}`;
  return has(key) ? t(key, { name: err.details }) : t('orderError.generic');
}

// Calls onChange(row, eventType) for every new or changed order matching
// filter, such as 'restaurant_id=eq.<id>'. RLS decides which rows are sent.
// onStatus gets the channel status ('SUBSCRIBED', 'CHANNEL_ERROR', ...).
// Returns a function that stops listening.
export function subscribeToOrders(filter, onChange, onStatus) {
  // A fresh topic for every subscription: removing a channel is async, and
  // reusing its topic (as a StrictMode remount does) returns the old channel.
  const channel = supabase
    .channel(`orders:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        onChange(payload.new, payload.eventType);
      }
    })
    .subscribe((status) => onStatus?.(status));

  return () => {
    supabase.removeChannel(channel);
  };
}
