import type { SiteAsset } from '../../types/siteAsset.types';

export const buildWorkImages = (
 asset: Pick<SiteAsset, 'url' | 'gallery'>
): string[] => [asset.url, ...(asset.gallery ?? [])];

export const formatWorkPrice = (
 price: number | undefined
): string | undefined =>
 price === undefined ? undefined : `${price.toFixed(2)} RON`;
