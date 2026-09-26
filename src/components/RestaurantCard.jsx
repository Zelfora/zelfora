import { Link, useLocation } from 'react-router-dom';
import { Clock, Bike, Search } from 'lucide-react';
import StarRating from './StarRating';
import FoodImage from './FoodImage';
import { useTranslation } from '../context/LanguageContext';

const MAX_SHOWN_DISHES = 3;

// matchedDishes: the dishes ({ id, name }) that matched the home page search.
// The restaurant page scrolls to them and lights them up (RestaurantDetail).
// Its back button returns to from: the home page with the search.
function RestaurantCard({ restaurant, matchedDishes = [] }) {
  const { t, formatPrice } = useTranslation();
  const location = useLocation();
  const hiddenDishes = matchedDishes.length - MAX_SHOWN_DISHES;

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      state={{
        from: location,
        searchMatches: matchedDishes.length > 0 ? matchedDishes.map((dish) => dish.id) : undefined,
      }}
      className="group block overflow-hidden rounded-card border border-border bg-surface/70 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-primary-500/60 hover:shadow-glow"
    >
      <div className="relative">
        <FoodImage
          src={restaurant.image}
          alt={restaurant.name}
          className={`h-44 w-full object-cover ${restaurant.is_open === false ? 'opacity-50 grayscale' : ''}`}
        />
        {restaurant.is_open === false && (
          <span className="absolute left-3 top-3 rounded-pill border border-border bg-bg-elevated/90 px-3 py-1 text-xs font-semibold text-text backdrop-blur-md">
            {t('restaurant.closedBadge')}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-text">{restaurant.name}</h3>
          <StarRating rating={restaurant.rating} />
        </div>
        <p className="mb-3 text-sm text-text-muted">{restaurant.cuisine}</p>
        {matchedDishes.length > 0 && (
          <p className="mb-3 flex items-start gap-1.5 text-sm text-text">
            <Search size={14} className="mt-[3px] flex-shrink-0 text-primary-300" />
            <span>
              {matchedDishes
                .slice(0, MAX_SHOWN_DISHES)
                .map((dish) => dish.name)
                .join(', ')}
              {hiddenDishes > 0 && (
                <span className="text-text-muted"> {t('home.moreDishes', { count: hiddenDishes })}</span>
              )}
            </span>
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-text-muted">
          {/* The delivery time is optional for owners. */}
          {restaurant.delivery_time ? (
            <span className="flex items-center gap-1">
              <Clock size={16} className="text-accent-400" />
              {restaurant.delivery_time}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1">
            <Bike size={16} className="text-accent-400" />
            {t('restaurant.deliveryFee', { fee: formatPrice(restaurant.delivery_fee) })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default RestaurantCard;
