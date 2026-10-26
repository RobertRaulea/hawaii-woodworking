import type React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../../components/SEO/SEO';
import { useSiteAssets } from '../../hooks/useSiteAssets';
import type { SiteAsset } from '../../types/siteAsset.types';
import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogClose,
 DialogContent,
 DialogDescription,
} from '@/components/ui/dialog';

interface CustomWork extends SiteAsset {
 alt: string;
 title: string;
}

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
 const { t, i18n } = useTranslation();
 const [selectedWork, setSelectedWork] = useState<CustomWork | null>(null);
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

 const formatPrice = (price: number) =>
 new Intl.NumberFormat(i18n.language, {
 style: 'currency',
 currency: 'RON',
 maximumFractionDigits: 2,
 }).format(price);

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
 <h1 className="max-w-3xl font-serif text-4xl font-medium leading-[1.08] text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl">
 {t('customWork.title')}
 </h1>
 <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300sm:text-base">
 {t('customWork.subtitle')}
 </p>
 </div>
 <span className="w-fit border-l-2 border-amber-700 pl-4 font-serif text-sm italic text-stone-600 dark:text-stone-300 ">
 {String(works.length).padStart(2, '0')} {t('customWork.projects')}
 </span>
 </header>

 {loading ? (
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 3 }, (_, index) => (
 <div key={index} className="aspect-[4/5] animate-pulse bg-stone-200/80 dark:bg-stone-700/80 " />
 ))}
 </div>
 ) : works.length === 0 ? (
 <p className="py-20 text-center font-serif text-xl text-stone-500 dark:text-stone-400 ">{t('customWork.empty')}</p>
 ) : (
 <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
 {works.map((work, index) => (
 <article
 key={work.id}
 className="group animate-fade-in-up"
 style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
 >
 <button
 type="button"
 onClick={() => setSelectedWork(work)}
 className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
 aria-label={`${t('customWork.viewDetails')}: ${work.title}`}
 >
 <div className="relative aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-700 ">
 <img
 src={work.url}
 alt={work.alt}
 className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
 loading="lazy"
 />
 <span className="absolute left-3 top-3 bg-[#f5f1e9]/95 dark:bg-[#1a1511]/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-700 dark:text-stone-300 ">
 {t('customWork.madeToOrder')}
 </span>
 </div>
 <div className="flex items-start justify-between gap-4 border-b border-stone-300 dark:border-stone-700 py-4">
 <div>
 <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50 sm:text-2xl">{work.title}</h2>
 <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 {work.description || t('customWork.legacyDescription')}
 </p>
 </div>
 <span className="shrink-0 pt-1 text-right text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300 sm:text-sm">
 {work.price === undefined ? t('customWork.priceOnRequest') : formatPrice(work.price)}
 </span>
 </div>
 </button>
 </article>
 ))}
 </div>
 )}
 </div>
 </main>

 <Dialog
 open={selectedWork !== null}
 onOpenChange={(open) => {
 if (!open) setSelectedWork(null);
 }}
 >
 {selectedWork && (
 <DialogContent
 hideClose
 aria-label={selectedWork.title}
 className="grid max-h-[90vh] w-full max-w-5xl gap-0 overflow-auto border-0 bg-[#f5f1e9] dark:bg-[#1a1511] p-0 sm:rounded-none md:grid-cols-[1.2fr_0.8fr]"
 >
 <DialogDescription className="sr-only">
 {selectedWork.description || t('customWork.legacyDescription')}
 </DialogDescription>
 <img src={selectedWork.url} alt={selectedWork.alt} className="max-h-[55vh] w-full object-contain bg-stone-950 md:max-h-[80vh]" />
 <div className="flex flex-col justify-center p-6 sm:p-9">
 <DialogClose asChild>
 <Button
 type="button"
 variant="ghost"
 className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-900/80 p-0 text-xl text-white transition hover:bg-stone-900 hover:text-white"
 aria-label={t('customWork.close')}
 >
 ×
 </Button>
 </DialogClose>
 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300 ">{t('customWork.madeToOrder')}</p>
 <h2 className="mt-3 font-serif text-3xl leading-tight text-stone-900 dark:text-stone-50 ">{selectedWork.title}</h2>
 <p className="mt-5 text-sm leading-7 text-stone-600 dark:text-stone-300 ">
 {selectedWork.description || t('customWork.legacyDescription')}
 </p>
 <p className="mt-7 border-t border-stone-300 dark:border-stone-700 pt-5 text-sm font-semibold text-stone-900 dark:text-stone-50 ">
 {t('customWork.price')}: {selectedWork.price === undefined ? t('customWork.priceOnRequest') : formatPrice(selectedWork.price)}
 </p>
 </div>
 </DialogContent>
 )}
 </Dialog>
 </>
 );
};
