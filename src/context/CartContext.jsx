import { createContext, useContext, useState } from 'react';
import { MAX_QUANTITY, lineKey, sumPrices } from '../services/menuOptions';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState(null);
  // One line per dish and set of options:
  // { key, id, name, image, price, options, quantity }. price is for one,
  // options included; options as in services/menuOptions.js.
  const [items, setItems] = useState([]);
  // The line added last, with a count that goes up on every add, so the cart
  // panel can point it out.
  const [lastAdded, setLastAdded] = useState({ key: null, count: 0 });
  // Whether the customer folded the cart panel away (see CartPanel).
  const [panelMinimized, setPanelMinimized] = useState(false);

  const hasItems = items.length > 0;
  const currentRestaurantId = hasItems ? restaurantId : null;

  // Adding from another restaurant empties the cart first; the dish dialog
  // warns about that before the customer adds.
  function addItem(restaurant, menuItem, { options = [], quantity = 1 } = {}) {
    const key = lineKey(menuItem.id, options);
    const switching = currentRestaurantId !== null && currentRestaurantId !== restaurant.id;
    // A new cart shows its panel again, even if the last one was folded away.
    if (!hasItems || switching) setPanelMinimized(false);

    setRestaurantId(restaurant.id);
    setRestaurantName(restaurant.name);
    setItems((prev) => {
      const current = switching ? [] : prev;
      if (current.some((i) => i.key === key)) {
        return current.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QUANTITY) } : i
        );
      }
      const price = sumPrices([menuItem.price, ...options.map((o) => o.price)]);
      return [...current, { key, id: menuItem.id, name: menuItem.name, image: menuItem.image, price, options, quantity }];
    });
    setLastAdded((prev) => ({ key, count: prev.count + 1 }));
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQuantity(key, quantity) {
    if (quantity <= 0) {
      removeItem(key);
      return;
    }
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY) } : i)));
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = sumPrices(items.map((i) => i.price * i.quantity));

  const value = {
    restaurantId: currentRestaurantId,
    restaurantName: hasItems ? restaurantName : null,
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    lastAdded,
    panelMinimized,
    setPanelMinimized,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
