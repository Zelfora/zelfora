import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function Cart() {
  const { restaurantId, restaurantName, items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
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
        <p className="text-text-muted">Je winkelwagen is leeg.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="mb-2 font-display text-2xl font-semibold text-text">Winkelwagen</h1>
      <p className="mb-6 text-sm text-text-muted">{restaurantName}</p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-card border border-border bg-surface/70 p-3"
          >
            <div className="flex-1">
              <p className="font-medium text-text">{item.name}</p>
              <p className="text-sm text-text-muted">€{item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-text">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text transition-colors hover:border-primary-500"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-text-faint transition-colors hover:text-red-400"
              aria-label={`${item.name} verwijderen`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-text">
        <span>Totaal</span>
        <span>€{subtotal.toFixed(2)}</span>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        disabled={placing}
        className="mt-6 w-full rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-3 font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        {placing ? 'Bestelling plaatsen...' : 'Plaats bestelling'}
      </button>
    </main>
  );
}

export default Cart;
