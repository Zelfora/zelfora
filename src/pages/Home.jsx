import { useEffect, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    async function load() {
      // is_open is a computed column (restaurant_owners.sql). The dish names,
      // in menu order, are for the search.
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, is_open, menu_items(name)')
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
  // matching dishes are shown on its card.
  const query = normalize(searchQuery.trim());
  const results = restaurants.flatMap((restaurant) => {
    if (!query) return [{ restaurant, dishes: [] }];
    const dishes = restaurant.menu_items
      .map((item) => item.name)
      .filter((name) => normalize(name).includes(query));
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
          onChange={(e) => setSearchQuery(e.target.value)}
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
