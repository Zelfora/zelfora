import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';

// orderable is false when an owner previews their unpublished restaurant.
function MenuItemCard({ item, restaurant, orderable = true }) {
  const { addItem } = useCart();
  const { t, formatPrice } = useTranslation();

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface/70 p-3 backdrop-blur-md transition-colors hover:border-primary-500/50">
      <FoodImage
        src={item.image}
        alt={item.name}
        iconSize={24}
        className="h-20 w-20 flex-shrink-0 rounded-[calc(var(--radius-card)-0.35rem)] object-cover"
      />
      <div className="flex-1">
        <h4 className="font-display font-semibold text-text">{item.name}</h4>
        <p className="text-sm text-text-muted">{item.description}</p>
        <p className="mt-1 font-semibold text-primary-300">{formatPrice(item.price)}</p>
      </div>
      {orderable && (
        <button
          aria-label={t('menuItem.add', { name: item.name })}
          onClick={() => addItem(restaurant, item)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-glow transition-transform hover:scale-110"
        >
          <Plus size={18} />
        </button>
      )}
    </div>
  );
}

export default MenuItemCard;
