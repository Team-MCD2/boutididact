/**
 * Catalogue de secours utilisé si Hiboutik est injoignable
 * ou non encore configuré.
 *  -> Les IDs sont préfixés "fallback-" pour ne JAMAIS être envoyés
 *     à Hiboutik en checkout réel (le BFF refuserait).
 */
export const FALLBACK_CATEGORIES = [
  { id: 'fallback-burgers', name: 'Burgers' },
  { id: 'fallback-sides', name: 'Accompagnements' },
  { id: 'fallback-drinks', name: 'Boissons' },
  { id: 'fallback-desserts', name: 'Desserts' },
];

export const FALLBACK_PRODUCTS = [
  { id: 'fallback-1', categoryId: 'fallback-burgers', name: 'Le Classique', price: 8.5, taxRate: 10, emoji: '🍔', desc: 'Boeuf, Cheddar, Salade, Tomate' },
  { id: 'fallback-2', categoryId: 'fallback-burgers', name: 'Double Cheese', price: 10.5, taxRate: 10, emoji: '🧀', desc: 'Double Boeuf, Double Cheddar' },
  { id: 'fallback-3', categoryId: 'fallback-burgers', name: 'Bacon Smash', price: 11, taxRate: 10, emoji: '🥓', desc: 'Boeuf Smash, Bacon fumé, Oignons BBQ' },
  { id: 'fallback-4', categoryId: 'fallback-burgers', name: 'Chicken Crispy', price: 9.5, taxRate: 10, emoji: '🍗', desc: 'Poulet frit croustillant, Mayo épicée' },
  { id: 'fallback-5', categoryId: 'fallback-sides', name: 'Frites Maison', price: 3, taxRate: 10, emoji: '🍟', desc: 'Pommes de terre fraîches' },
  { id: 'fallback-6', categoryId: 'fallback-sides', name: 'Onion Rings', price: 4, taxRate: 10, emoji: '🧅', desc: "Beignets d'oignons croustillants" },
  { id: 'fallback-7', categoryId: 'fallback-sides', name: 'Cheddar Fries', price: 4.5, taxRate: 10, emoji: '🧀', desc: 'Frites avec sauce cheddar' },
  { id: 'fallback-8', categoryId: 'fallback-drinks', name: 'Coca-Cola', price: 2.5, taxRate: 20, emoji: '🥤', desc: 'Canette 33cl' },
  { id: 'fallback-9', categoryId: 'fallback-drinks', name: 'Ice Tea Pêche', price: 2.5, taxRate: 20, emoji: '🧃', desc: 'Canette 33cl' },
  { id: 'fallback-10', categoryId: 'fallback-drinks', name: 'Eau Minérale', price: 2, taxRate: 5.5, emoji: '💧', desc: 'Bouteille 50cl' },
  { id: 'fallback-11', categoryId: 'fallback-desserts', name: 'Tiramisu', price: 4.5, taxRate: 10, emoji: '🍮', desc: 'Fait maison, café et mascarpone' },
  { id: 'fallback-12', categoryId: 'fallback-desserts', name: 'Cheesecake', price: 5, taxRate: 10, emoji: '🍰', desc: 'Coulis fruits rouges' },
  { id: 'fallback-13', categoryId: 'fallback-desserts', name: 'Glace Vanille', price: 3.5, taxRate: 10, emoji: '🍨', desc: '2 boules artisanales' },
];
