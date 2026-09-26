import { Plus } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import FoodImage from './FoodImage';
import { optionGroups } from '../services/menuOptions';

// A dish on the restaurant page. Clicking anywhere on it opens the dish
// dialog (MenuItemDialog) through onOpen: the button on the name stretches
// over the whole card. orderable is false while the restaurant can't take
// orders: it's closed, or an owner is previewing their unpublished restaurant.
// highlighted: it matched the home page search, so it lights up for a moment.
function MenuItemCard({ item, orderable = true, highlighted = false, onOpen }) {
  const { t, formatPrice } = useTranslation();
  const soldOut = item.available === false;
  const hasOptions = optionGroups(item).length > 0;

  return (
    <div
      data-highlighted={highlighted || undefined}
      className={`group relative flex items-center gap-4 rounded-card border border-border bg-surface/70 p-3 backdrop-blur-md transition-[border-color,box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 hover:border-primary-500/50 hover:shadow-glow active:scale-[0.99] has-focus-visible:border-primary-400 has-focus-visible:ring-2 has-focus-visible:ring-primary-400 ${
        soldOut ? 'opacity-60' : ''
      } ${highlighted ? 'menu-card-flash' : ''}`}
    >
      <FoodImage
        src={item.image}
        alt={item.name}
        iconSize={24}
        className="h-20 w-20 flex-shrink-0 rounded-[calc(var(--radius-card)-0.35rem)] object-cover"
      />
      <div className="min-w-0 flex-1">
        <h4 className="font-display font-semibold text-text">
          <button
            type="button"
            onClick={() => onOpen(item)}
            aria-haspopup="dialog"
            className="cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
          >
            {item.name}
          </button>
        </h4>
        <p className="text-sm text-text-muted">{item.description}</p>
        <p className="mt-1 font-semibold text-primary-300">
          {formatPrice(item.price)}
          {hasOptions && !soldOut && (
            <span className="ml-2 text-xs font-normal text-text-faint">{t('menuItem.customizable')}</span>
          )}
        </p>
      </div>
      {soldOut ? (
        <span className="flex-shrink-0 rounded-pill border border-border px-3 py-1 text-xs font-semibold text-text-muted">
          {t('menuItem.soldOut')}
        </span>
      ) : (
        orderable && (
          // A mouse and touch shortcut to the same dialog; keyboards and
          // screen readers use the name button. It sits above the stretched
          // button (z-10): scaling on hover lifts it over that button anyway,
          // so it needs its own click handler.
          <span
            aria-hidden="true"
            onClick={() => onOpen(item)}
            className="relative z-10 flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-glow transition-[scale,rotate,box-shadow] duration-200 group-hover:scale-110 group-active:scale-95 hover:rotate-90 hover:scale-125 hover:shadow-glow-lg active:scale-95"
          >
            <Plus size={20} />
          </span>
        )
      )}
    </div>
  );
}

export default MenuItemCard;
