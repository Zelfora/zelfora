import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Bike } from 'lucide-react';
import { supabase } from '../supabaseClient';
import StarRating from '../components/StarRating';
import MenuItemCard from '../components/MenuItemCard';
import MenuItemDialog from '../components/MenuItemDialog';
import CartPanel from '../components/CartPanel';
import FoodImage from '../components/FoodImage';
import OpeningHoursList from '../components/OpeningHoursList';
import PageMessage from '../components/PageMessage';
import { noticeClass } from '../components/formHelpers';
import { useTranslation } from '../context/LanguageContext';
import { closedNoticeKey, fetchMenu } from '../services/restaurants';

// How long the dishes that matched the home page search stay lit: the length
// of .menu-card-flash in index.css.
const SEARCH_FLASH_MS = 4000;

async function fetchRestaurant(id) {
  const { data, error } = await supabase.from('restaurants').select('*, is_open').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

function RestaurantDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, formatPrice } = useTranslation();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  // The dish in the dialog. It stays set after closing, so the dialog can
  // animate out; openCount starts every open afresh.
  const [dialog, setDialog] = useState({ item: null, open: false, openCount: 0 });
  // The ids of the dishes that matched the home page search, when the page
  // was opened from a search result (RestaurantCard). Once the menu shows,
  // they light up for a moment and the page scrolls to the first.
  const [searchMatches, setSearchMatches] = useState(() => location.state?.searchMatches ?? null);
  const menuRef = useRef(null);

  function openDish(item) {
    setDialog((current) => ({ item, open: true, openCount: current.openCount + 1 }));
  }

  function closeDish() {
    setDialog((current) => ({ ...current, open: false }));
  }

  useEffect(() => {
    // The cart panel links to another restaurant's page, so an answer can
    // arrive after the page moved on; ignore it then.
    let ignore = false;
    async function load() {
      setStatus('loading');
      try {
        const [restaurantData, menuData] = await Promise.all([fetchRestaurant(id), fetchMenu(id)]);
        if (ignore) return;
        setRestaurant(restaurantData);
        setMenu(menuData);
        setStatus('ready');
      } catch (error) {
        console.error(error);
        if (!ignore) setStatus('error');
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  // Point the search matches out only once, not again after a reload or when
  // coming back to this page.
  useEffect(() => {
    if (location.state?.searchMatches) {
      navigate(location.pathname, { replace: true, state: { from: location.state.from } });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (status !== 'ready' || !searchMatches) return;
    const first = menuRef.current?.querySelector('[data-highlighted]');
    if (first) {
      // Start at the top, so the scroll shows where the dish is on the page,
      // and end with its middle at a third of the screen: near the top, with
      // some of the menu above it still in view.
      window.scrollTo(0, 0);
      const { top, height } = first.getBoundingClientRect();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: top + height / 2 - window.innerHeight / 3,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
    const timer = setTimeout(() => setSearchMatches(null), SEARCH_FLASH_MS);
    return () => clearTimeout(timer);
  }, [status, searchMatches]);

  if (status === 'loading') {
    return <PageMessage>{t('common.loading')}</PageMessage>;
  }

  if (status === 'error') {
    return <PageMessage tone="error">{t('restaurant.loadFailed')}</PageMessage>;
  }

  if (!restaurant) {
    return (
      <PageMessage>
        <p className="mb-4 text-lg">{t('restaurant.notFound')}</p>
        <Link to="/" className="font-semibold text-primary-300 hover:text-primary-400">
          &larr; {t('restaurant.backHome')}
        </Link>
      </PageMessage>
    );
  }

  const categories = [...new Set(menu.map((item) => item.category))];
  // Only the owner can load an unpublished restaurant; customers get "not found".
  const preview = restaurant.published === false;
  const closed = !preview && !restaurant.is_open;
  let orderNotice = null;
  if (preview) orderNotice = t('itemDialog.preview');
  else if (closed) orderNotice = t(closedNoticeKey(restaurant));

  return (
    <main>
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <FoodImage src={restaurant.image} alt={restaurant.name} iconSize={48} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        {/* Back to the home page, with the search when it came from there (RestaurantCard). */}
        <Link
          to={location.state?.from ?? '/'}
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
            {restaurant.delivery_time && (
              <span className="flex items-center gap-1">
                <Clock size={16} className="text-accent-400" />
                {restaurant.delivery_time}
              </span>
            )}
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
            <div className={`mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${noticeClass}`}>
              <p>{t('restaurant.previewNotice')}</p>
              <Link to="/partner" className="flex-shrink-0 font-semibold text-primary-300 hover:text-primary-400">
                {t('restaurant.previewManage')} &rarr;
              </Link>
            </div>
          )}

          {closed && <p className={`mb-8 ${noticeClass}`}>{orderNotice}</p>}

          <h2 className="mb-4 font-display text-2xl font-semibold text-text">{t('restaurant.menu')}</h2>

          <div ref={menuRef} className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="mb-3 font-display text-lg font-semibold text-primary-300">
                  {category || t('partner.menu.uncategorized')}
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {menu
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        orderable={!orderNotice}
                        highlighted={searchMatches?.includes(item.id)}
                        onOpen={openDish}
                      />
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
