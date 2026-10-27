'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { requireTestEnvironment } from './lib/environment';
import { demoImageUrl, demoPhotos } from './lib/demoProducts';

const downloadImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !type || !['image/jpeg', 'image/png', 'image/webp'].includes(type) || !response.body) {
    throw new Error('Demo image download failed or is not a supported image.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 250000) {
      await reader.cancel();
      throw new Error('Demo image exceeds 250 KB.');
    }
    chunks.push(new Uint8Array(value));
  }
  if (!size) throw new Error('Demo image is empty.');
  return new Blob(chunks, { type });
};

export const seed = internalAction({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: number }> => {
    requireTestEnvironment();
    const existing = await ctx.runQuery(internal.demoData.assets, {});
    const known = new Set(existing.map((asset) => asset.key));
    for (const photo of demoPhotos) {
      if (known.has(photo.key)) continue;
      const sourceUrl = demoImageUrl(photo.photo);
      const storageId = await ctx.storage.store(await downloadImage(sourceUrl));
      await ctx.runMutation(internal.demoData.rememberAsset, {
        key: photo.key, storageId, sourceUrl, licenseUrl: 'https://unsplash.com/license',
      });
    }
    return ctx.runMutation(internal.demoData.insertCatalog, {});
  },
});
