import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';
import FormField from '../components/FormField';
import FormMessage from '../components/FormMessage';
import PageMessage from '../components/PageMessage';
import { cardClass, inputClass, noticeClass, primaryButtonClass, textareaClass } from '../components/formHelpers';
import { orderErrorMessage } from '../services/orders';
import { MAX_QUANTITY, formatOptions } from '../services/menuOptions';
import { closedNoticeKey } from '../services/restaurants';

const EMPTY_DETAILS = { customer_name: '', phone: '', delivery_address: '', note: '' };

function Cart() {
  const { restaurantId, restaurantName, items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const i18n = useTranslation();
  const { t, formatPrice } = i18n;
  const navigate = useNavigate();
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // The restaurant's current delivery fee and whether it's open, tagged with
  // its id so a previous cart's restaurant never shows.
  const [loadedRestaurant, setLoadedRestaurant] = useState({ id: null, data: null });
  const restaurant = restaurantId && loadedRestaurant.id === restaurantId ? loadedRestaurant.data : null;

  useEffect(() => {
    if (!restaurantId) return;
    let ignore = false;
    supabase
      .from('restaurants')
      .select('delivery_fee, accepting_orders, is_open')
      .eq('id', restaurantId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) console.error(loadError);
        if (!ignore) setLoadedRestaurant({ id: restaurantId, data });
      });
    return () => {
      ignore = true;
    };
  }, [restaurantId]);

  // Fill in the details from the customer's last order, without overwriting
  // anything they've typed already.
  useEffect(() => {
    let ignore = false;
    supabase
      .from('orders')
      .select('customer_name, phone, delivery_address')
      .eq('user_id', user.id)
      .not('delivery_address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (ignore || !data) return;
        setDetails((current) => ({
          ...current,
          customer_name: current.customer_name || data.customer_name || '',
          phone: current.phone || data.phone || '',
          delivery_address: current.delivery_address || data.delivery_address || '',
        }));
      });
    return () => {
      ignore = true;
    };
  }, [user.id]);

  function update(field) {
    return (e) => setDetails((current) => ({ ...current, [field]: e.target.value }));
  }

  const deliveryFee = restaurant ? Number(restaurant.delivery_fee) : null;
  const closed = restaurant ? !restaurant.is_open : false;

  // The database recomputes prices, the delivery fee and the total
  // (validate_order in orders.sql), and rejects the order if the restaurant
  // is closed or a dish is sold out.
  async function handlePlaceOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('orders').insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        items: items.map(({ id, name, price, quantity, options }) => ({ menu_item_id: id, name, price, quantity, options })),
        total: subtotal + (deliveryFee ?? 0),
        customer_name: details.customer_name.trim(),
        phone: details.phone.trim(),
        delivery_address: details.delivery_address.trim(),
        note: details.note.trim() || null,
      });
      if (insertError) throw insertError;
      clearCart();
      navigate('/orders');
    } catch (err) {
      console.error(err);
      setError(orderErrorMessage(err, i18n));
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return <PageMessage>{t('cart.empty')}</PageMessage>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-2 font-display text-2xl font-semibold text-text">{t('cart.title')}</h1>
      <p className="mb-6 text-sm text-text-muted">{restaurantName}</p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-card border border-border bg-surface/70 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text">{item.name}</p>
              {item.options.length > 0 && <p className="text-sm text-text-muted">{formatOptions(item.options)}</p>}
              <p className="text-sm text-text-muted">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                aria-label={t('cart.decrease', { name: item.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-text">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                disabled={item.quantity >= MAX_QUANTITY}
                aria-label={t('cart.increase', { name: item.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => removeItem(item.key)}
              className="text-text-faint transition-colors hover:text-danger"
              aria-label={t('cart.remove', { name: item.name })}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <dl className="mt-6 flex flex-col gap-1 border-t border-border pt-4 text-sm text-text-muted">
        <div className="flex justify-between">
          <dt>{t('cart.subtotal')}</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('cart.deliveryFee')}</dt>
          <dd>{deliveryFee === null ? '…' : deliveryFee === 0 ? t('cart.freeDelivery') : formatPrice(deliveryFee)}</dd>
        </div>
        <div className="mt-1 flex justify-between text-lg font-semibold text-text">
          <dt>{t('cart.total')}</dt>
          <dd>{formatPrice(subtotal + (deliveryFee ?? 0))}</dd>
        </div>
      </dl>

      <form onSubmit={handlePlaceOrder} className={`mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 ${cardClass}`}>
        <h2 className="font-display text-lg font-semibold text-text sm:col-span-2">{t('cart.detailsTitle')}</h2>

        <FormField label={t('cart.field.name')}>
          <input
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            value={details.customer_name}
            onChange={update('customer_name')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('cart.field.phone')}>
          <input
            name="phone"
            type="tel"
            required
            maxLength={30}
            autoComplete="tel"
            value={details.phone}
            onChange={update('phone')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('cart.field.address')} className="sm:col-span-2">
          <input
            name="address"
            required
            maxLength={200}
            autoComplete="street-address"
            placeholder={t('cart.field.addressPlaceholder')}
            value={details.delivery_address}
            onChange={update('delivery_address')}
            className={inputClass}
          />
        </FormField>

        <FormField label={t('cart.field.note')} optional className="sm:col-span-2">
          <textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder={t('cart.field.notePlaceholder')}
            value={details.note}
            onChange={update('note')}
            className={textareaClass}
          />
        </FormField>

        {closed && <p className={`sm:col-span-2 ${noticeClass}`}>{t(closedNoticeKey(restaurant))}</p>}
        <FormMessage error={error} className="sm:col-span-2" />

        <button
          type="submit"
          disabled={placing || closed}
          className={`mt-2 w-full sm:col-span-2 ${primaryButtonClass}`}
        >
          {placing ? t('cart.placing') : t('cart.placeOrder')}
        </button>
      </form>
    </main>
  );
}

export default Cart;
