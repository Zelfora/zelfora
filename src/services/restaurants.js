import { supabase } from '../supabaseClient';

// Restaurants and their menus. Who may read and change what is decided by the
// RLS policies and grants in supabase/restaurant_owners.sql.

// Saves an owner's changes to their restaurant and returns the updated row,
// with is_open (a computed column, see restaurant_owners.sql). Owners may only
// change the columns granted there. Throws on failure, also when RLS matched
// no row.
export async function updateRestaurant(id, fields) {
  const { data, error } = await supabase
    .from('restaurants')
    .update(fields)
    .eq('id', id)
    .select('*, is_open')
    .single();
  if (error) throw error;
  return data;
}

// A restaurant's menu in the order its owner chose; dishes they never moved
// come last.
export async function fetchMenu(restaurantId) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('position', { nullsFirst: false })
    .order('created_at');
  if (error) throw error;
  return data;
}

// Translation key for why a restaurant can't take orders right now: its owner
// paused them, or it's outside its opening hours.
export function closedNoticeKey(restaurant) {
  return restaurant.accepting_orders ? 'restaurant.closedNotice' : 'restaurant.pausedNotice';
}
