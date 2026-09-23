import { Link } from 'react-router-dom';
import { Clock, Bike } from 'lucide-react';
import StarRating from './StarRating';

function RestaurantCard({ restaurant }) {
  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className="group block overflow-hidden rounded-card border border-border bg-surface/70 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-primary-500/60 hover:shadow-glow"
    >
      <img
        src={restaurant.image}
        alt={restaurant.name}
        className="h-44 w-full object-cover"
      />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-text">{restaurant.name}</h3>
          <StarRating rating={restaurant.rating} />
        </div>
        <p className="mb-3 text-sm text-text-muted">{restaurant.cuisine}</p>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={16} className="text-accent-400" />
            {restaurant.deliveryTime}
          </span>
          <span className="flex items-center gap-1">
            <Bike size={16} className="text-accent-400" />
            €{restaurant.deliveryFee.toFixed(2)} bezorging
          </span>
        </div>
      </div>
    </Link>
  );
}

export default RestaurantCard;
