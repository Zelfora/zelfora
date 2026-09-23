// src/mockData.js

export const mockRestaurants = [
  {
    id: "1",
    name: "The Burger Club",
    cuisine: "Burgers & Fastfood",
    rating: 4.8,
    deliveryTime: "15-25 min",
    deliveryFee: 2.50,
    image: "https://picsum.photos/seed/zelfora-burgerclub/640/360",
    description: "Sappige burgers van 100% Nederlands rundvlees, dagelijks vers gemaakt.",
    tags: ["Populair", "Fastfood"],
    address: "Kalverstraat 12, Amsterdam"
  },
  {
    id: "2",
    name: "Sushi Hana",
    cuisine: "Japans & Sushi",
    rating: 4.6,
    deliveryTime: "25-40 min",
    deliveryFee: 3.50,
    image: "https://picsum.photos/seed/zelfora-sushihana/640/360",
    description: "Verse sushi en Japanse klassiekers, elke dag met de hand gerold.",
    tags: ["Sushi", "Gezond"],
    address: "Nieuwendijk 44, Amsterdam"
  },
  {
    id: "3",
    name: "Pizzeria da Luigi",
    cuisine: "Italiaans & Pizza",
    rating: 4.7,
    deliveryTime: "20-30 min",
    deliveryFee: 1.99,
    image: "https://picsum.photos/seed/zelfora-daluigi/640/360",
    description: "Authentieke Italiaanse pizza's uit de houtoven, zoals oma ze maakte.",
    tags: ["Pizza", "Italiaans"],
    address: "Utrechtsestraat 7, Amsterdam"
  },
  {
    id: "4",
    name: "Green Bowl",
    cuisine: "Salades & Gezond",
    rating: 4.5,
    deliveryTime: "10-20 min",
    deliveryFee: 1.50,
    image: "https://picsum.photos/seed/zelfora-greenbowl/640/360",
    description: "Verse salades en bowls vol groenten, granen en eiwitten.",
    tags: ["Vegetarisch", "Gezond"],
    address: "Ferdinand Bolstraat 88, Amsterdam"
  },
  {
    id: "5",
    name: "Taco Fiesta",
    cuisine: "Mexicaans",
    rating: 4.4,
    deliveryTime: "20-35 min",
    deliveryFee: 2.25,
    image: "https://picsum.photos/seed/zelfora-tacofiesta/640/360",
    description: "Straatvoedsel-stijl taco's en burrito's, stevig gekruid.",
    tags: ["Mexicaans", "Spicy"],
    address: "Javastraat 21, Amsterdam"
  }
];

export const mockMenus = {
  "1": [
    { id: "b1", name: "Classic Cheese", price: 12.50, description: "Met sappige rundvleesburger, cheddar en onze geheime saus.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-b1/300/200" },
    { id: "b2", name: "Crispy Chicken", price: 11.95, description: "Krokante kipfilet met milde chilimayonaise en sla.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-b2/300/200" },
    { id: "b3", name: "Portie Friet", price: 4.00, description: "Krokante frietjes met keuze uit huisgemaakte sauzen.", category: "Bijgerechten", image: "https://picsum.photos/seed/zelfora-b3/300/200" }
  ],
  "2": [
    { id: "s1", name: "Salmon Box (12 stuks)", price: 18.50, description: "6 Sake Maki, 4 Salmon Nigiri, 2 Salmon Sashimi.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-s1/300/200" },
    { id: "s2", name: "Spicy Tuna Roll", price: 9.00, description: "Tonijn, avocado, komkommer met pittige mayonaise.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-s2/300/200" },
    { id: "s3", name: "Miso Soep", price: 3.50, description: "Traditionele Japanse misosoep met tofu en wakame.", category: "Voorgerechten", image: "https://picsum.photos/seed/zelfora-s3/300/200" }
  ],
  "3": [
    { id: "p1", name: "Pizza Margherita", price: 9.50, description: "Verse tomatensaus, mozzarella en verse basilicum.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-p1/300/200" },
    { id: "p2", name: "Pizza Picante", price: 13.00, description: "Tomatensaus, mozzarella en pittige Italiaanse salami.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-p2/300/200" },
    { id: "p3", name: "Bruschetta", price: 6.50, description: "Geroosterd brood met tomaat, knoflook en olijfolie.", category: "Voorgerechten", image: "https://picsum.photos/seed/zelfora-p3/300/200" }
  ],
  "4": [
    { id: "g1", name: "Buddha Bowl", price: 11.00, description: "Quinoa, avocado, kikkererwten, geroosterde groenten en tahin.", category: "Bowls", image: "https://picsum.photos/seed/zelfora-g1/300/200" },
    { id: "g2", name: "Caesar Salade", price: 9.50, description: "Romaine sla, gegrilde kip, parmezaan en huisgemaakte dressing.", category: "Salades", image: "https://picsum.photos/seed/zelfora-g2/300/200" }
  ],
  "5": [
    { id: "t1", name: "Tacos al Pastor (3 stuks)", price: 10.50, description: "Gemarineerd varkensvlees, ananas, koriander en ui.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-t1/300/200" },
    { id: "t2", name: "Burrito Supreme", price: 12.00, description: "Rijst, bonen, kaas, guacamole en gegrild vlees naar keuze.", category: "Hoofdgerechten", image: "https://picsum.photos/seed/zelfora-t2/300/200" }
  ]
};
