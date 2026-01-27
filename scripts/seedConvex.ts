import 'dotenv/config';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const DEFAULT_LOCAL_CONVEX_URL = 'http://127.0.0.1:3210';

const resolveConvexUrl = (): string => {
  const url = process.env.VITE_CONVEX_URL;

  if (!url || url.includes('your-project')) {
    return DEFAULT_LOCAL_CONVEX_URL;
  }

  return url;
};

const CONVEX_URL = resolveConvexUrl();

const convex = new ConvexHttpClient(CONVEX_URL);

const force = process.argv.includes('--force');

type SeedProduct = {
  name: string;
  price: number;
  category: string;
  description: string;
  images: string[];
};

const products: SeedProduct[] = [
  {
    name: 'Koa Wood Serving Bowl',
    price: 249,
    category: 'Bowls',
    description: 'Hand-finished koa bowl with natural grain variation.',
    images: ['Screenshot_1.png', 'Screenshot_2.png'],
  },
  {
    name: 'Mango Wood Cutting Board',
    price: 129,
    category: 'Cutting Boards',
    description: 'Edge-grain mango wood board, oiled and ready for daily use.',
    images: ['Screenshot_2.png', 'Screenshot_3.png'],
  },
  {
    name: 'Ohia Coaster Set (4-pack)',
    price: 69,
    category: 'Home Goods',
    description: 'A set of four ohia coasters with smooth rounded edges.',
    images: ['Screenshot_3.png'],
  },
  {
    name: 'Koa Keepsake Box',
    price: 179,
    category: 'Boxes',
    description: 'Small keepsake box with a snug lid and satin finish.',
    images: ['Screenshot_4.png', 'Screenshot_5.png'],
  },
  {
    name: 'Minimalist Wall Shelf',
    price: 199,
    category: 'Furniture',
    description: 'Simple floating shelf, designed for small spaces.',
    images: ['Screenshot_6.png', 'Screenshot_7.png'],
  },
  {
    name: 'Walnut Charcuterie Board',
    price: 159,
    category: 'Cutting Boards',
    description: 'Wide walnut board designed for serving cheeses and cured meats.',
    images: ['Screenshot_5.png', 'Screenshot_1.png'],
  },
  {
    name: 'Handmade Wooden Candle Holder',
    price: 49,
    category: 'Home Goods',
    description: 'Minimal candle holder with a smooth satin finish.',
    images: ['Screenshot_7.png'],
  },
];

(async () => {
  try {
    const result = await convex.mutation(api.products.seedProducts, {
      force,
      products: products.map((p) => ({
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description,
        images: p.images,
      })),
    });

    if ('skipped' in result && result.skipped) {
      console.log(
        `Skipped seeding: found ${result.existing} existing products. Re-run with --force to replace them.`
      );
      return;
    }

    console.log(`Seed complete: inserted ${result.inserted} products.`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
