import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../context/LanguageContext';

function Cart() {
  const { restaurantId, restaurantName, items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const { t, formatPrice } = useTranslation();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  async function handlePlaceOrder() {
    setPlacing(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('orders').insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        items: items.map(({ id, name, price, quantity }) => ({ menu_item_id: id, name, price, quantity })),
        total: subtotal,
      });
      if (insertError) throw insertError;
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center md:px-8">
        <p className="text-text-muted">{t('cart.empty')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-2 font-display text-2xl font-semibold text-text">{t('cart.title')}</h1>
      <p className="mb-6 text-sm text-text-muted">{restaurantName}</p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-card border border-border bg-surface/70 p-3"
          >
            <div className="flex-1">
              <p className="font-medium text-text">{item.name}</p>
              <p className="text-sm text-text-muted">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label={t('cart.decrease', { name: item.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-text">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label={t('cart.increase', { name: item.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-text-faint transition-colors hover:text-danger"
              aria-label={t('cart.remove', { name: item.name })}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-text">
        <span>{t('cart.total')}</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={placing}
        className="mt-6 w-full rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-3 font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        {placing ? t('cart.placing') : t('cart.placeOrder')}
      </button>
    </main>
  );
}

export default Cart;
