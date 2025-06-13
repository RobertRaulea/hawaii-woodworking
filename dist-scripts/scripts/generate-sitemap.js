console.log('--- Sitemap script started ---');
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is not defined in the environment variables.');
}
// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SITE_URL = 'https://www.hawaiiproducts.ro';
async function generateSitemap() {
    console.log('Generating sitemap...');
    // Fetch all product IDs from Supabase
    const { data: products, error } = await supabase.from('products').select('id');
    if (error) {
        console.error('Error fetching products for sitemap:', error);
        return;
    }
    // Define static pages
    const staticPages = [
        { url: '/', changefreq: 'weekly', priority: 1.0 },
        { url: '/products', changefreq: 'weekly', priority: 0.9 },
        { url: '/catalog', changefreq: 'monthly', priority: 0.8 },
        { url: '/terms-and-conditions', changefreq: 'yearly', priority: 0.5 },
        { url: '/privacy-policy', changefreq: 'yearly', priority: 0.5 },
        { url: '/return-policy', changefreq: 'yearly', priority: 0.5 },
        { url: '/legal-information', changefreq: 'yearly', priority: 0.5 },
    ];
    // Generate dynamic product pages
    const productPages = products.map(product => ({
        url: `/product/${product.id}`,
        changefreq: 'monthly',
        priority: 0.7,
    }));
    const allPages = [...staticPages, ...productPages];
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
        .map(page => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
        .join('\n')}
</urlset>`;
    const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapXml);
    console.log(`Sitemap generated successfully with ${allPages.length} URLs at ${sitemapPath}`);
}
(async () => {
    try {
        await generateSitemap();
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
