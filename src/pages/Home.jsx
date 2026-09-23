import { useState } from 'react';
import { Search } from 'lucide-react';
import { mockRestaurants } from '../mockData';
import RestaurantCard from '../components/RestaurantCard';

function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRestaurants = mockRestaurants.filter((res) =>
    res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="relative mb-8 max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="text"
          placeholder="Zoek naar restaurants of gerechten..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-pill border border-border bg-surface py-2.5 pl-11 pr-4 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow"
        />
      </div>

      <h2 className="mb-6 font-display text-2xl font-semibold text-text">Aanbevolen restaurants</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <p className="mt-12 text-center text-text-muted">Geen restaurants gevonden voor &quot;{searchQuery}&quot;.</p>
      )}
    </main>
  );
}

export default Home;
