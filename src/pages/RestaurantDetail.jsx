import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Bike } from 'lucide-react';
import { supabase } from '../supabaseClient';
import StarRating from '../components/StarRating';
import MenuItemCard from '../components/MenuItemCard';
import { useTranslation } from '../context/LanguageContext';

function RestaurantDetail() {
  const { id } = useParams();
  const { t, formatPrice } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: restaurantData }, { data: menuData }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', id).maybeSingle(),
        supabase.from('menu_items').select('*').eq('restaurant_id', id),
      ]);
      setRestaurant(restaurantData);
      setMenu(menuData ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <main className="px-4 py-16 text-center text-text-muted md:px-8">{t('common.loading')}</main>;
  }

  if (!restaurant) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8">
        <p className="mb-4 text-lg text-text-muted">{t('restaurant.notFound')}</p>
        <Link to="/" className="font-semibold text-primary-300 hover:text-primary-400">
          &larr; {t('restaurant.backHome')}
        </Link>
      </main>
    );
  }

  const categories = [...new Set(menu.map((item) => item.category))];

  return (
    <main>
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <Link
          to="/"
          className="absolute left-4 top-4 flex items-center gap-2 rounded-pill border border-border bg-bg-elevated/80 px-3 py-2 text-sm font-medium text-text backdrop-blur-md transition-colors hover:border-primary-500/60 hover:text-primary-300 md:left-8 md:top-6"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
        <h1 className="absolute bottom-4 left-4 font-display text-3xl font-bold text-text md:bottom-6 md:left-8 md:text-4xl">
          {restaurant.name}
        </h1>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-text-muted">
          <StarRating rating={restaurant.rating} />
          <span>{restaurant.cuisine}</span>
          <span className="flex items-center gap-1">
            <Clock size={16} className="text-accent-400" />
            {restaurant.delivery_time}
          </span>
          <span className="flex items-center gap-1">
            <Bike size={16} className="text-accent-400" />
            {t('restaurant.deliveryFee', { fee: formatPrice(restaurant.delivery_fee) })}
          </span>
        </div>

        <p className="mb-3 max-w-2xl text-text-muted">{restaurant.description}</p>
        <p className="mb-6 text-sm text-text-faint">{restaurant.address}</p>

        {restaurant.tags?.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2 className="mb-4 font-display text-2xl font-semibold text-text">{t('restaurant.menu')}</h2>

        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="mb-3 font-display text-lg font-semibold text-primary-300">{category}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {menu
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default RestaurantDetail;
