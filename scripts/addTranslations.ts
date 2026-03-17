import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("CONVEX_URL environment variable is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function addTranslationsToProducts() {
  console.log("Fetching all products...");
  const products = await client.query(api.products.getAll);
  
  console.log(`Found ${products.length} products`);
  
  for (const product of products) {
    console.log(`Updating product: ${product.name}`);
    
    await client.mutation(api.products.updateProduct, {
      id: product._id,
      name_ro: product.name_ro || product.name,
      name_en: product.name_en || `${product.name} (EN)`,
      name_de: product.name_de || `${product.name} (DE)`,
      description_ro: product.description_ro || product.description,
      description_en: product.description_en || product.description ? `${product.description} (EN)` : undefined,
      description_de: product.description_de || product.description ? `${product.description} (DE)` : undefined,
    });
  }
  
  console.log("✅ Products updated with translation fields");
}

async function addTranslationsToCategories() {
  console.log("Fetching all categories...");
  const categories = await client.query(api.categories.getAll);
  
  console.log(`Found ${categories.length} categories`);
  
  for (const category of categories) {
    console.log(`Updating category: ${category.name}`);
    
    await client.mutation(api.categories.update, {
      id: category._id,
      name: category.name,
      name_ro: category.name_ro || category.name,
      name_en: category.name_en || `${category.name} (EN)`,
      name_de: category.name_de || `${category.name} (DE)`,
    });
  }
  
  console.log("✅ Categories updated with translation fields");
}

async function main() {
  try {
    console.log("Starting translation migration...\n");
    
    await addTranslationsToProducts();
    console.log("");
    await addTranslationsToCategories();
    
    console.log("\n✅ Translation migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

main();
