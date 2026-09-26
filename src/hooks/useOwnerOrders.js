import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ACTIVE_STATUSES, FINISHED_STATUSES, isActiveOrder, subscribeToOrders } from '../services/orders';

const HISTORY_PAGE_SIZE = 20;

async function fetchActiveOrders(restaurantId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('status', ACTIVE_STATUSES);
  if (error) throw error;
  return data;
}

async function fetchFinishedOrders(restaurantId, offset) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('status', FINISHED_STATUSES)
    .order('created_at', { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE - 1);
  if (error) throw error;
  return data;
}

// Adds or replaces orders by id.
function mergeOrders(current, incoming) {
  const byId = new Map(current.map((order) => [order.id, order]));
  for (const order of incoming) byId.set(order.id, order);
  return [...byId.values()];
}

// A short two-tone chime for a new order. Browsers only play sound after the
// user has interacted with the page, which an owner in the portal has.
function playNewOrderSound() {
  try {
    const context = new AudioContext();
    [880, 1320].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.18;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
    setTimeout(() => context.close(), 1000);
  } catch {
    // No sound available; the order still shows up.
  }
}

// A restaurant's orders for its owner, kept up to date through Realtime.
// The portal uses this for all its tabs, so new orders arrive (with a chime)
// wherever the owner is. Active orders are all loaded; finished ones a page
// at a time.
export function useOwnerOrders(restaurantId) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [connection, setConnection] = useState('connecting'); // 'connecting' | 'live' | 'offline'
  const [historyHasMore, setHistoryHasMore] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [active, finished] = await Promise.all([
          fetchActiveOrders(restaurantId),
          fetchFinishedOrders(restaurantId, 0),
        ]);
        if (ignore) return;
        setOrders((current) => mergeOrders(current, [...active, ...finished]));
        setHistoryHasMore(finished.length === HISTORY_PAGE_SIZE);
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
  }, [restaurantId]);

  // Catches up on changes that Realtime may have missed: the active orders
  // and the most recently finished ones.
  const refresh = useCallback(async () => {
    try {
      const [active, finished] = await Promise.all([
        fetchActiveOrders(restaurantId),
        fetchFinishedOrders(restaurantId, 0),
      ]);
      setOrders((current) => mergeOrders(current, [...active, ...finished]));
    } catch (error) {
      console.error(error);
    }
  }, [restaurantId]);

  useEffect(() => {
    // Status callbacks from a channel that's being removed are ignored.
    let current = true;
    const unsubscribe = subscribeToOrders(
      `restaurant_id=eq.${restaurantId}`,
      (row, eventType) => {
        setOrders((existing) => mergeOrders(existing, [row]));
        if (eventType === 'INSERT') playNewOrderSound();
      },
      (channelStatus) => {
        if (!current) return;
        setConnection(channelStatus === 'SUBSCRIBED' ? 'live' : 'offline');
        if (channelStatus === 'SUBSCRIBED') refresh();
      }
    );
    return () => {
      current = false;
      unsubscribe();
    };
  }, [restaurantId, refresh]);

  // Orders that finished during this visit are the newest in the history, so
  // counting them in the offset keeps the next page in line.
  async function loadMoreHistory() {
    const offset = orders.filter((order) => !isActiveOrder(order)).length;
    try {
      const finished = await fetchFinishedOrders(restaurantId, offset);
      setOrders((current) => mergeOrders(current, finished));
      setHistoryHasMore(finished.length === HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error(error);
    }
  }

  // Moves an order to its next status, or cancels it. Only succeeds if nobody
  // changed it in the meantime (e.g. in another tab); otherwise it refreshes
  // and throws.
  async function updateStatus(order, nextStatus) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)
      .eq('status', order.status)
      .select()
      .single();
    if (error) {
      refresh();
      throw error;
    }
    setOrders((current) => mergeOrders(current, [data]));
  }

  return { orders, status, connection, historyHasMore, loadMoreHistory, updateStatus };
}
