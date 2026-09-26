import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Bike } from 'lucide-react';
import { supabase } from '../supabaseClient';
import StarRating from '../components/StarRating';
import MenuItemCard from '../components/MenuItemCard';
import MenuItemDialog from '../components/MenuItemDialog';
import CartPanel from '../components/CartPanel';
import FoodImage from '../components/FoodImage';
import OpeningHoursList from '../components/OpeningHoursList';
import { useTranslation } from '../context/LanguageContext';

function RestaurantDetail() {
  const { id } = useParams();
  const { t, formatPrice } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  // The dish in the dialog. It stays set after closing, so the dialog can
  // animate out; openCount starts every open afresh.
  const [dialog, setDialog] = useState({ item: null, open: false, openCount: 0 });

  function openDish(item) {
    setDialog((current) => ({ item, open: true, openCount: current.openCount + 1 }));
  }

  function closeDish() {
    setDialog((current) => ({ ...current, open: false }));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: restaurantData }, { data: menuData }] = await Promise.all([
        supabase.from('restaurants').select('*, is_open').eq('id', id).maybeSingle(),
        // In the order the owner chose; items they never moved come last.
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', id)
          .order('position', { nullsFirst: false })
          .order('created_at'),
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
  // Only the owner can load an unpublished restaurant; customers get "not found".
  const preview = restaurant.published === false;
  const closed = !preview && !restaurant.is_open;
  let orderNotice = null;
  if (preview) orderNotice = t('itemDialog.preview');
  else if (closed) orderNotice = t(restaurant.accepting_orders ? 'restaurant.closedNotice' : 'restaurant.pausedNotice');

  return (
    <main>
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <FoodImage src={restaurant.image} alt={restaurant.name} iconSize={48} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <Link
          to="/"
          className="absolute left-4 top-4 flex items-center gap-2 rounded-pill border border-border bg-bg-elevated/80 px-3 py-2 text-sm font-medium text-text backdrop-blur-md transition-colors hover:border-primary-500/60 hover:text-primary-300 md:left-8 md:top-6"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
        {/* In the same frame as the menu below, so the name lines up with it
            and moves along when the cart panel opens. */}
        <div className="cart-shift absolute inset-x-0 bottom-4 md:bottom-6">
          <h1 className="mx-auto max-w-6xl px-4 font-display text-3xl font-bold text-text md:px-8 md:text-4xl">
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* Moves aside for the cart panel on wide screens (CartPanel). */}
      <div className="cart-shift">
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
  
          {restaurant.opening_hours && (
            <details className="mb-8" open={closed}>
              <summary className="mb-2 cursor-pointer text-sm font-semibold text-text hover:text-primary-300">
                {t('restaurant.openingHours')}
              </summary>
              <OpeningHoursList hours={restaurant.opening_hours} />
            </details>
          )}
  
          {preview && (
            <div className="mb-8 flex flex-col gap-2 rounded-card border border-warn-400/50 bg-warn-400/10 p-4 text-sm text-text sm:flex-row sm:items-center sm:justify-between">
              <p>{t('restaurant.previewNotice')}</p>
              <Link to="/partner" className="flex-shrink-0 font-semibold text-primary-300 hover:text-primary-400">
                {t('restaurant.previewManage')} &rarr;
              </Link>
            </div>
          )}
  
          {closed && (
            <p className="mb-8 rounded-card border border-warn-400/50 bg-warn-400/10 p-4 text-sm text-text">
              {t(restaurant.accepting_orders ? 'restaurant.closedNotice' : 'restaurant.pausedNotice')}
            </p>
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
                      <MenuItemCard key={item.id} item={item} orderable={!orderNotice} onOpen={openDish} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MenuItemDialog
        item={dialog.item}
        restaurant={restaurant}
        open={dialog.open}
        contentKey={dialog.openCount}
        notice={orderNotice}
        onClose={closeDish}
      />
      <CartPanel restaurant={restaurant} />
    </main>
  );
}

export default RestaurantDetail;
