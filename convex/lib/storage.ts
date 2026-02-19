import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Resolve an array of storage IDs to their public URLs.
 * Filters out any IDs whose URL could not be resolved.
 */
export const resolveImageUrls = async (
  ctx: QueryCtx,
  storageIds: Id<"_storage">[] | undefined
): Promise<string[]> => {
  if (!storageIds || storageIds.length === 0) return [];

  const urls = await Promise.all(
    storageIds.map((id) => ctx.storage.getUrl(id))
  );

  return urls.filter(
    (url): url is string => typeof url === "string" && url.length > 0
  );
};

/**
 * Given an array of siteAsset documents, resolve each storageId to a URL.
 * Returns only assets whose URL resolved successfully.
 */
export const resolveAssetUrls = async <
  T extends { storageId: Id<"_storage"> }
>(
  ctx: QueryCtx,
  assets: T[]
): Promise<(T & { url: string })[]> => {
  const withUrls = await Promise.all(
    assets.map(async (asset) => {
      const url = await ctx.storage.getUrl(asset.storageId);
      if (!url) return null;
      return { ...asset, url };
    })
  );

  return withUrls.filter(
    (asset): asset is NonNullable<typeof asset> => asset !== null
  );
};
