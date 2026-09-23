// src/App.jsx
import React, { useState } from 'react';
import { mockRestaurants } from './mockData';
import './index.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter restaurants op basis van zoekopdracht
  const filteredRestaurants = mockRestaurants.filter(res =>
    res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* MODERNE NAVBAR */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4757', cursor: 'pointer' }}>
          Zelfora<span style={{ color: '#2f3542' }}>.nl</span>
        </div>
        
        <input 
          type="text" 
          placeholder="Zoek naar restaurants of gerechten..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.6rem 1.5rem', width: '350px', borderRadius: '20px',
            border: '1px solid #e0e0e0', backgroundColor: '#f1f2f6', outline: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ cursor: 'pointer', fontSize: '1.2rem' }}>🛒 <span style={{ fontSize: '0.9rem', backgroundColor: '#ff4757', color: 'white', padding: '2px 6px', borderRadius: '50%' }}>0</span></div>
          <button style={{
            padding: '0.6rem 1.2rem', borderRadius: '20px', border: 'none',
            backgroundColor: '#2f3542', color: 'white', fontWeight: 'bold', cursor: 'pointer'
          }}>
            Inloggen
          </button>
        </div>
      </nav>

      {/* HOOFDPAGINA CONTENT */}
      <main style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Aanbevolen restaurants</h2>
        
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem'
        }}>
          {filteredRestaurants.map((restaurant) => (
            <div 
              key={restaurant.id} 
              style={{
                backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onClick={() => alert(`Je hebt geklikt op ${restaurant.name}! Volgende stap is het menu openen.`)}
            >
              <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>{restaurant.name}</h3>
                  <span style={{ backgroundColor: '#ffeaa7', padding: '2px 6px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    ⭐ {restaurant.rating}
                  </span>
                </div>
                <p style={{ color: '#747d8c', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{restaurant.cuisine}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#2f3542', borderTop: '1px solid #f1f2f6', paddingTop: '0.5rem' }}>
                  <span>⏱️ {restaurant.deliveryTime}</span>
                  <span>🛵 €{restaurant.deliveryFee.toFixed(2)} bezorging</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
