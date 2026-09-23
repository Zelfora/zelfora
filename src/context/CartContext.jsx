import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState(null);
  const [items, setItems] = useState([]); // { id, name, price, quantity }

  function addItem(restaurant, menuItem) {
    if (restaurantId && restaurantId !== restaurant.id) {
      const confirmed = window.confirm(
        `Je winkelwagen bevat al gerechten van ${restaurantName}. Wil je deze leegmaken en verder gaan met ${restaurant.name}?`
      );
      if (!confirmed) return;
      setItems([]);
    }

    setRestaurantId(restaurant.id);
    setRestaurantName(restaurant.name);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) {
        return prev.map((i) => (i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: menuItem.id, name: menuItem.name, price: Number(menuItem.price), quantity: 1 }];
    });
  }

  function removeItem(itemId) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      if (next.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return next;
    });
  }

  function updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
  }

  function clearCart() {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const value = {
    restaurantId,
    restaurantName,
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
