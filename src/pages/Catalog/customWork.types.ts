import type { SiteAsset } from '../../types/siteAsset.types';

export interface CustomWork extends SiteAsset {
 alt: string;
 title: string;
 images: string[];
}
