import type React from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '../../components/SEO/SEO';
import { useSiteAssets } from '../../hooks/useSiteAssets';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomWork } from './customWork.types';
import { buildWorkImages } from './customWork.utils';
import { WorkCard } from './WorkCard';
import { WorkDetailDialog } from './WorkDetailDialog';

const metadataByFileName: Record<string, { alt: string; title: string }> = {
 'test.jpeg': { alt: 'Platou din lemn cu cinci locașuri', title: 'Platou 5 locașuri' },
 'test (1).jpeg': { alt: 'Tavă lucrată din lemn', title: 'Tavă din lemn' },
 'test (2).jpeg': { alt: 'Tavă din lemn cu patru locașuri', title: 'Tavă 4 locașuri' },
 'test (3).jpeg': { alt: 'Icoană sculptată în lemn', title: 'Icoană' },
 'test (4).jpeg': { alt: 'Icoană realizată prin prelucrare CNC', title: 'Icoană pe CNC' },
 'test (5).jpeg': { alt: 'Icoană cu reprezentarea lui Iisus', title: 'Icoană Iisus' },
};

const displayOrder = [
 'test.jpeg',
 'test (1).jpeg',
 'test (2).jpeg',
 'test (3).jpeg',
 'test (4).jpeg',
 'test (5).jpeg',
];

export const Catalog: React.FC = () => {
 const { assets, loading } = useSiteAssets('catalog');
 const { t } = useTranslation();
 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
 const displayOrderIndex = useMemo(
 () => new Map(displayOrder.map((name, index) => [name, index])),
 []
 );

 const works = useMemo<CustomWork[]>(() => {
 return assets
 .map((asset) => {
 const legacyMetadata = metadataByFileName[asset.name];
 return {
 ...asset,
 title: asset.title ?? legacyMetadata?.title ?? asset.name.replace(/\.[^/.]+$/, ''),
 alt: legacyMetadata?.alt ?? asset.title ?? asset.name,
 images: buildWorkImages(asset),
 };
 })
 .sort((first, second) => {
 const firstIndex = displayOrderIndex.get(first.name) ?? Number.MAX_SAFE_INTEGER;
 const secondIndex = displayOrderIndex.get(second.name) ?? Number.MAX_SAFE_INTEGER;
 return firstIndex === secondIndex
 ? first.title.localeCompare(second.title)
 : firstIndex - secondIndex;
 });
 }, [assets, displayOrderIndex]);

 const selectedWork = selectedIndex === null ? null : works[selectedIndex] ?? null;

 const stepWork = (direction: 1 | -1) => {
 setSelectedIndex((current) => {
 if (current === null || works.length === 0) return current;
 return (current + direction + works.length) % works.length;
 });
 };

 const pageTitle = t('seo.catalogTitle');
 const pageDescription = t('seo.catalogDescription');

 return (
 <>
 <SEO title={pageTitle} description={pageDescription} keywords={['lucrări la comandă', 'portofoliu lemn', 'Hawaii Woodworking']} />
 <main className="relative min-h-[70vh] overflow-hidden bg-[#f5f1e9] dark:bg-[#1a1511]">
 <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#927b5e_0.65px,transparent_0.65px)] [background-size:15px_15px]" />
 <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16 lg:px-12 lg:py-20">
 <header className="mb-10 grid gap-6 border-b border-stone-300/80 dark:border-stone-700/80 pb-8 md:mb-14 md:grid-cols-[1fr_auto] md:items-end">
 <div>
 <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300 ">
 Hawaii Woodworking · Atelier Sibiu
 </p>
 <h1 className="max-w-3xl font-serif text-4xl font-medium leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
 {t('customWork.title')}
 </h1>
 <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {t('customWork.subtitle')}
 </p>
 <Button asChild variant="outline" className="mt-5 h-auto w-fit rounded-full border-amber-700/60 bg-transparent px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 hover:bg-amber-700/10 hover:text-amber-700 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200">
 <Link to="/produse-personalizate">{t('nav.customProducts')}</Link>
 </Button>
 </div>
 </header>

 {loading ? (
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 3 }, (_, index) => (
 <Skeleton key={index} className="aspect-[4/5] bg-stone-200/80 dark:bg-stone-700/80 sm:aspect-[4/3]" />
 ))}
 </div>
 ) : works.length === 0 ? (
 <p className="py-20 text-center font-serif text-xl text-muted-foreground">{t('customWork.empty')}</p>
 ) : (
 <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
 {works.map((work, index) => (
 <WorkCard
 key={work.id}
 work={work}
 index={index}
 onSelect={() => setSelectedIndex(index)}
 />
 ))}
 </div>
 )}
 </div>
 </main>

 <WorkDetailDialog
 work={selectedWork}
 previousWorkTitle={
 selectedIndex === null || works.length === 0
 ? undefined
 : works[(selectedIndex - 1 + works.length) % works.length]?.title
 }
 nextWorkTitle={
 selectedIndex === null || works.length === 0
 ? undefined
 : works[(selectedIndex + 1) % works.length]?.title
 }
 onOpenChange={(open) => {
 if (!open) setSelectedIndex(null);
 }}
 onPreviousWork={() => stepWork(-1)}
 onNextWork={() => stepWork(1)}
 />
 </>
 );
};
