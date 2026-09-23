// src/mockData.js

export const mockRestaurants = [
  {
    id: "1",
    name: "The Burger Club",
    cuisine: "Burgers & Fastfood",
    rating: 4.8,
    deliveryTime: "15-25 min",
    deliveryFee: 2.50,
    image: "https://unsplash.com"
  },
  {
    id: "2",
    name: "Sushi Hana",
    cuisine: "Japans & Sushi",
    rating: 4.6,
    deliveryTime: "25-40 min",
    deliveryFee: 3.50,
    image: "https://unsplash.com"
  },
  {
    id: "3",
    name: "Pizzeria da Luigi",
    cuisine: "Italiaans & Pizza",
    rating: 4.7,
    deliveryTime: "20-30 min",
    deliveryFee: 1.99,
    image: "https://unsplash.com"
  }
];

export const mockMenus = {
  "1": [
    { id: "b1", name: "Classic Cheese", price: 12.50, description: "Met sappige rundvleesburger, cheddar en onze geheime saus." },
    { id: "b2", name: "Crispy Chicken", price: 11.95, description: "Krokante kipfilet met milde chilimayonaise en sla." }
  ],
  "2": [
    { id: "s1", name: "Salmon Box (12 stuks)", price: 18.50, description: "6 Sake Maki, 4 Salmon Nigiri, 2 Salmon Sashimi." },
    { id: "s2", name: "Spicy Tuna Roll", price: 9.00, description: "Tonijn, avocado, komkommer met pittige mayonaise." }
  ],
  "3": [
    { id: "p1", name: "Pizza Margherita", price: 9.50, description: "Verse tomatensaus, mozzarella en verse basilicum." },
    { id: "p2", name: "Pizza Picante", price: 13.00, description: "Tomatensaus, mozzarella en pittige Italiaanse salami." }
  ]
};
