import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../convex/_generated/dataModel.js';
import { api } from '../convex/_generated/api.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

type AssetDefinition = {
  category: 'catalog' | 'hero' | 'logo';
  name: string;
  relativePath: string;
};

type ProductWithLegacyImages = {
  _id: Id<'products'>;
  name: string;
  images?: string[];
  imageStorageIds?: Id<'_storage'>[];
};

type UploadResponse = {
  storageId?: Id<'_storage'>;
};

const DEFAULT_LOCAL_CONVEX_URL = 'http://127.0.0.1:3210';
const CONVEX_URL =
  !process.env.VITE_CONVEX_URL || process.env.VITE_CONVEX_URL.includes('your-project')
    ? DEFAULT_LOCAL_CONVEX_URL
    : process.env.VITE_CONVEX_URL;

const projectRoot = process.cwd();
const argv = process.argv.slice(2);
const skipProducts = argv.includes('--skip-products');
const skipSiteAssets = argv.includes('--skip-site-assets');

const siteAssetDefinitions: AssetDefinition[] = [
  {
    category: 'catalog',
    name: 'test.jpeg',
    relativePath: 'assets/CatalogAssets/test.jpeg',
  },
  {
    category: 'catalog',
    name: 'test (1).jpeg',
    relativePath: 'assets/CatalogAssets/test (1).jpeg',
  },
  {
    category: 'catalog',
    name: 'test (2).jpeg',
    relativePath: 'assets/CatalogAssets/test (2).jpeg',
  },
  {
    category: 'catalog',
    name: 'test (3).jpeg',
    relativePath: 'assets/CatalogAssets/test (3).jpeg',
  },
  {
    category: 'catalog',
    name: 'test (4).jpeg',
    relativePath: 'assets/CatalogAssets/test (4).jpeg',
  },
  {
    category: 'catalog',
    name: 'test (5).jpeg',
    relativePath: 'assets/CatalogAssets/test (5).jpeg',
  },
  {
    category: 'hero',
    name: 'WoodPhoto.jpg',
    relativePath: 'assets/HeroAssets/WoodPhoto.jpg',
  },
  {
    category: 'logo',
    name: 'hawaii-logo.svg',
    relativePath: 'assets/hawaii-logo.svg',
  },
];

const mimeTypeByExtension: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

const resolveMimeType = (filename: string): string => {
  const extension = path.extname(filename).toLowerCase();
  return mimeTypeByExtension[extension] ?? 'application/octet-stream';
};

const uploadBufferToConvexStorage = async (
  buffer: Buffer,
  contentType: string,
  generateUploadUrl: () => Promise<string>
): Promise<Id<'_storage'>> => {
  const uploadUrl = await generateUploadUrl();

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const body = (await response.json()) as UploadResponse;
  if (!body.storageId || typeof body.storageId !== 'string') {
    throw new Error('Convex upload response did not include a storageId');
  }

  return body.storageId;
};

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

(async () => {
  try {
    const convex = new ConvexHttpClient(CONVEX_URL);

    console.log(`Using Convex URL: ${CONVEX_URL}`);

    const products = (await convex.query(api.products.getAll, {})) as ProductWithLegacyImages[];

    const productStorageIdsByImageName = new Map<string, Id<'_storage'>>();
    let linkedProductsCount = 0;

    if (!skipProducts) {
      const allLegacyImageNames = new Set<string>();
      for (const product of products) {
        if (isNonEmptyStringArray(product.images)) {
          product.images.forEach((imageName) => allLegacyImageNames.add(imageName));
        }
      }

      console.log(`Uploading ${allLegacyImageNames.size} unique product image files...`);
      for (const imageName of allLegacyImageNames) {
        const imagePath = path.resolve(projectRoot, 'assets/ProductsAssets', imageName);
        const fileBuffer = await fs.readFile(imagePath);
        const storageId = await uploadBufferToConvexStorage(
          fileBuffer,
          resolveMimeType(imageName),
          () => convex.mutation(api.products.generateProductImageUploadUrl, {})
        );

        productStorageIdsByImageName.set(imageName, storageId);
        console.log(`✓ Uploaded product image: ${imageName}`);
      }

      console.log('Linking uploaded product images to products...');
      for (const product of products) {
        const imageNames = isNonEmptyStringArray(product.images) ? product.images : [];
        const desiredImageStorageIds = imageNames
          .map((imageName) => productStorageIdsByImageName.get(imageName))
          .filter((id): id is Id<'_storage'> => typeof id === 'string');

        const existingImageStorageIds = product.imageStorageIds ?? [];
        const missingImageStorageIds = desiredImageStorageIds.filter(
          (id) => !existingImageStorageIds.includes(id)
        );

        try {
          for (const storageId of missingImageStorageIds) {
            await convex.mutation(api.products.addProductImage, {
              productId: product._id,
              storageId,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed linking images for product ${product.name} (${product._id}). ${message}`
          );
        }

        linkedProductsCount += 1;
        console.log(
          `✓ Linked ${missingImageStorageIds.length}/${desiredImageStorageIds.length} images for product: ${product.name}`
        );
      }
    } else {
      console.log('Skipping product image upload/linking phase (--skip-products).');
    }

    let uploadedSiteAssetsCount = 0;

    if (!skipSiteAssets) {
      console.log(`Uploading ${siteAssetDefinitions.length} site assets (catalog/hero/logo)...`);
      for (const asset of siteAssetDefinitions) {
        try {
          const assetPath = path.resolve(projectRoot, asset.relativePath);
          const fileBuffer = await fs.readFile(assetPath);

          const storageId = await uploadBufferToConvexStorage(
            fileBuffer,
            resolveMimeType(asset.name),
            () => convex.mutation(api.siteAssets.generateAssetUploadUrl, {})
          );

          await convex.mutation(api.siteAssets.saveSiteAsset, {
            name: asset.name,
            category: asset.category,
            storageId,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed site asset upload/save for [${asset.category}] ${asset.name}. ${message}`
          );
        }

        uploadedSiteAssetsCount += 1;
        console.log(`✓ Uploaded site asset: [${asset.category}] ${asset.name}`);
      }
    } else {
      console.log('Skipping site assets phase (--skip-site-assets).');
    }

    console.log('');
    console.log('✅ Image migration complete');
    console.log(`- Product files uploaded: ${productStorageIdsByImageName.size}`);
    console.log(`- Products linked: ${linkedProductsCount}`);
    console.log(`- Site assets uploaded: ${uploadedSiteAssetsCount}`);
    console.log('');
    console.log('Next step: run the frontend and verify Home, Catalog, Products, and Product pages.');
  } catch (error) {
    console.error('❌ Image migration failed.');
    console.error(error);
    process.exit(1);
  }
})();
