import { useEffect, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import RestaurantCard from '../components/RestaurantCard';
import { useTranslation } from '../context/LanguageContext';

// Case- and accent-insensitive, so "creme brulee" finds "Crème brûlée".
function normalize(text) {
  return (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function Home() {
  const { t } = useTranslation();
  // The search is also in the address (?q=), so Back from a restaurant, or a
  // reload, shows the same results. The input has its own state: the router
  // updates the address in a transition, and an input following it would
  // drop keystrokes.
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const location = useLocation();
  const navigationType = useNavigationType();
  const [locationKey, setLocationKey] = useState(location.key);
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  // Typing replaces the address. Any other change to it while the page is
  // open (the navbar logo, Back and Forward) sets the search.
  if (location.key !== locationKey) {
    setLocationKey(location.key);
    if (navigationType !== 'REPLACE') setSearchQuery(searchParams.get('q') ?? '');
  }

  function changeSearch(value) {
    setSearchQuery(value);
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
  }

  useEffect(() => {
    async function load() {
      // is_open is a computed column (restaurant_owners.sql). The dishes, in
      // menu order, are for the search.
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, is_open, menu_items(id, name)')
        .eq('published', true)
        .order('name')
        .order('position', { referencedTable: 'menu_items', nullsFirst: false })
        .order('created_at', { referencedTable: 'menu_items' });
      if (error) {
        console.error(error);
        setStatus('error');
        return;
      }
      // Open restaurants first; the sort is stable, so each group stays alphabetical.
      setRestaurants(data.sort((a, b) => Number(b.is_open) - Number(a.is_open)));
      setStatus('ready');
    }
    load();
  }, []);

  // A restaurant matches on its name, its cuisine or one of its dishes. The
  // matching dishes are shown on its card, and pointed out on its page.
  const query = normalize(searchQuery.trim());
  const results = restaurants.flatMap((restaurant) => {
    if (!query) return [{ restaurant, dishes: [] }];
    const dishes = restaurant.menu_items.filter((item) => normalize(item.name).includes(query));
    const matches =
      normalize(restaurant.name).includes(query) || normalize(restaurant.cuisine).includes(query);
    return matches || dishes.length > 0 ? [{ restaurant, dishes }] : [];
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="relative mb-8 max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="text"
          aria-label={t('home.searchLabel')}
          placeholder={t('home.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => changeSearch(e.target.value)}
          className="w-full rounded-pill border border-border bg-surface py-2.5 pl-11 pr-4 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
        />
      </div>

      <h2 className="mb-6 font-display text-2xl font-semibold text-text">{t('home.featured')}</h2>

      {status === 'loading' && <p className="text-text-muted">{t('home.loading')}</p>}
      {status === 'error' && <p className="text-danger">{t('home.loadFailed')}</p>}
      {status === 'ready' && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ restaurant, dishes }) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} matchedDishes={dishes} />
            ))}
          </div>

          {results.length === 0 && (
            <p className="mt-12 text-center text-text-muted">
              {t('home.noResults', { query: searchQuery })}
            </p>
          )}
        </>
      )}
    </main>
  );
}

export default Home;
