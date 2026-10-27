export const demoPhotos = [
  { key: 'shelves', photo: 'photo-1494438639946-1ebd1d20bf85' },
  { key: 'table', photo: 'photo-1533090161767-e6ffed986c88' },
  { key: 'room', photo: 'photo-1538688525198-9b88f6f53126' },
  { key: 'sofa', photo: 'photo-1555041469-a586c61ea9bc' },
  { key: 'chair', photo: 'photo-1592078615290-033ee584e267' },
  { key: 'decor', photo: 'photo-1513506003901-1e6a229e2d15' },
] as const;

const collections = [
  { name: 'Raft din lemn', category: 'Rafturi', image: 'shelves', price: 120 },
  { name: 'Masuta artizanala', category: 'Mese', image: 'table', price: 250 },
  { name: 'Consola pentru living', category: 'Mobilier', image: 'room', price: 350 },
  { name: 'Bancheta pentru casa', category: 'Mobilier', image: 'sofa', price: 280 },
  { name: 'Scaun cu finisaj natural', category: 'Scaune', image: 'chair', price: 180 },
  { name: 'Decor pentru casa', category: 'Decoratiuni', image: 'decor', price: 45 },
] as const;
const finishes = ['Natur', 'Nuc', 'Stejar', 'Miere', 'Nordic'] as const;

export const demoProducts = collections.flatMap((collection, group) =>
  finishes.map((finish, variant) => ({
    demoKey: `demo-v1-${group + 1}-${variant + 1}`,
    sku: `DEMO-${String(group * finishes.length + variant + 1).padStart(3, '0')}`,
    name: `${collection.name} ${finish} [DEMO]`,
    category: collection.category,
    price: collection.price + variant * 15,
    imageKey: collection.image,
    description: `Produs demonstrativ pentru testarea magazinului Hawaii. Varianta ${finish}. Fotografie ilustrativa; nu este un produs oferit spre vanzare reala. Plata este simulata si nu se expediaza niciun colet.`,
    stock: 100,
  })),
);

export const demoImageUrl = (photo: string): string =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=480&q=55`;
