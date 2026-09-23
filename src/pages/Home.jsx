import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import RestaurantCard from '../components/RestaurantCard';
import { useTranslation } from '../context/LanguageContext';

function Home() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('restaurants').select('*').order('name');
      if (!error) setRestaurants(data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredRestaurants = restaurants.filter((res) =>
    res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="relative mb-8 max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="text"
          placeholder={t('home.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-pill border border-border bg-surface py-2.5 pl-11 pr-4 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
        />
      </div>

      <h2 className="mb-6 font-display text-2xl font-semibold text-text">{t('home.featured')}</h2>

      {loading ? (
        <p className="text-text-muted">{t('home.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>

          {filteredRestaurants.length === 0 && (
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
