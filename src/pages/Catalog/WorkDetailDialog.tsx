import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 Carousel,
 CarouselContent,
 CarouselItem,
 CarouselNext,
 CarouselPrevious,
} from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';
import {
 Dialog,
 DialogClose,
 DialogContent,
 DialogDescription,
 DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils/cn.utils';
import type { CustomWork } from './customWork.types';
import { formatWorkPrice } from './customWork.utils';

interface WorkDetailDialogProps {
 work: CustomWork | null;
 previousWorkTitle?: string;
 nextWorkTitle?: string;
 onOpenChange: (open: boolean) => void;
 onPreviousWork: () => void;
 onNextWork: () => void;
}

interface WorkDetailContentProps {
 work: CustomWork;
 previousWorkTitle?: string;
 nextWorkTitle?: string;
 onPreviousWork: () => void;
 onNextWork: () => void;
}

// Mounted fresh for each selected work (keyed by work id in the parent), so
// the carousel always starts on the cover photo and all state resets.
const WorkDetailContent: React.FC<WorkDetailContentProps> = ({
 work,
 previousWorkTitle,
 nextWorkTitle,
 onPreviousWork,
 onNextWork,
}) => {
 const { t } = useTranslation();
 const images = work.images;
 const hasMultiple = images.length > 1;
 const [api, setApi] = useState<CarouselApi>();
 const [currentIndex, setCurrentIndex] = useState(0);
 const thumbsRef = useRef<(HTMLButtonElement | null)[]>([]);
 const opts = useMemo(
 () => ({ loop: hasMultiple, watchDrag: hasMultiple }),
 [hasMultiple]
 );

 useEffect(() => {
 if (!api) return;
 const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
 api.on('select', onSelect);
 return () => {
 api.off('select', onSelect);
 };
 }, [api]);

 // Keep the active thumbnail visible inside the scrollable strip.
 useEffect(() => {
 thumbsRef.current[currentIndex]?.scrollIntoView({
 block: 'nearest',
 inline: 'nearest',
 });
 }, [currentIndex]);

 // Only the current image and its neighbours are rendered: a long gallery
 // must not download every photo when the dialog opens.
 const isNear = (index: number) =>
 index === currentIndex ||
 index === (currentIndex + 1) % images.length ||
 index === (currentIndex - 1 + images.length) % images.length;

 return (
 <>
 <DialogDescription className="sr-only">
 {work.description || t('customWork.legacyDescription')}
 </DialogDescription>

 <div className="relative flex h-[48dvh] min-h-0 flex-col bg-stone-950 md:h-full">
 <Carousel
 opts={opts}
 setApi={setApi}
 aria-label={work.title}
 className="min-h-0 flex-1"
 >
 <CarouselContent className="ml-0 h-full" viewportClassName="h-full">
 {images.map((src, index) => (
 <CarouselItem
 key={`${work.id}-photo-${index}`}
 className="flex h-full items-center justify-center pl-0"
 >
 {isNear(index) && (
 <img
 src={src}
 alt={index === 0 ? work.alt : `${work.alt} — ${index + 1}`}
 loading="lazy"
 decoding="async"
 draggable={false}
 className="max-h-full max-w-full select-none object-contain"
 />
 )}
 </CarouselItem>
 ))}
 </CarouselContent>
 {hasMultiple && (
 <>
 <CarouselPrevious
 aria-label={t('customWork.previousPhoto')}
 className="left-3 size-10 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white"
 />
 <CarouselNext
 aria-label={t('customWork.nextPhoto')}
 className="right-3 size-10 border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white"
 />
 <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
 {t('customWork.photoOf', {
 current: currentIndex + 1,
 total: images.length,
 })}
 </span>
 </>
 )}
 </Carousel>
 {hasMultiple && (
 <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-4 pt-2">
 {images.map((src, index) => (
 <button
 key={`${work.id}-thumb-${index}`}
 ref={(element) => {
 thumbsRef.current[index] = element;
 }}
 type="button"
 onClick={() => api?.scrollTo(index)}
 aria-label={`${work.title} — ${index + 1}`}
 aria-current={index === currentIndex}
 className={cn(
 'h-14 w-14 shrink-0 overflow-hidden rounded-md border transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-16 sm:w-16',
 index === currentIndex
 ? 'border-amber-500 ring-2 ring-amber-500/60'
 : 'border-white/20 opacity-50 hover:opacity-100'
 )}
 >
 <img
 src={src}
 alt=""
 loading="lazy"
 decoding="async"
 className="h-full w-full object-cover"
 />
 </button>
 ))}
 </div>
 )}
 </div>

 <div className="relative flex flex-col justify-center p-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 sm:p-9 md:overflow-y-auto">
 <DialogClose asChild>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="absolute right-3 top-3 z-20 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 hover:text-white"
 aria-label={t('customWork.close')}
 >
 <X className="size-5" />
 </Button>
 </DialogClose>
 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
 {t('customWork.madeToOrder')}
 </p>
 <DialogTitle className="mt-3 font-serif text-3xl font-medium leading-tight text-foreground">
 {work.title}
 </DialogTitle>
 <Separator className="my-5 bg-stone-300 dark:bg-stone-700" />
 <p className="text-sm leading-7 text-stone-600 dark:text-stone-300">
 {work.description || t('customWork.legacyDescription')}
 </p>
 <div className="mt-6 rounded-xl border border-amber-700/20 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-950/30">
 <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
 {t('customWork.pricePaid')}
 </p>
 <p className="mt-1 font-serif text-2xl text-amber-900 dark:text-amber-200 sm:text-3xl">
 {formatWorkPrice(work.price) ?? t('customWork.priceOnRequest')}
 </p>
 </div>
 <Button
 asChild
 variant="brand"
 className="mt-6 h-auto w-fit rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-amber-800"
 >
 <Link to="/produse-personalizate">{t('customWork.requestSimilar')}</Link>
 </Button>
 <div className="mt-7 flex items-center justify-between gap-3 border-t border-stone-300 pt-4 dark:border-stone-700">
 <Button
 type="button"
 variant="ghost"
 onClick={onPreviousWork}
 aria-label={
 previousWorkTitle
 ? `${t('customWork.previousWork')}: ${previousWorkTitle}`
 : t('customWork.previousWork')
 }
 className="h-auto gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300"
 >
 <ChevronLeft className="size-4" aria-hidden="true" />
 {t('customWork.previousWork')}
 </Button>
 <Button
 type="button"
 variant="ghost"
 onClick={onNextWork}
 aria-label={
 nextWorkTitle
 ? `${t('customWork.nextWork')}: ${nextWorkTitle}`
 : t('customWork.nextWork')
 }
 className="h-auto gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300"
 >
 {t('customWork.nextWork')}
 <ChevronRight className="size-4" aria-hidden="true" />
 </Button>
 </div>
 </div>
 </>
 );
};

export const WorkDetailDialog: React.FC<WorkDetailDialogProps> = ({
 work,
 previousWorkTitle,
 nextWorkTitle,
 onOpenChange,
 onPreviousWork,
 onNextWork,
}) => (
 <Dialog open={work !== null} onOpenChange={onOpenChange}>
 {work && (
 <DialogContent
 hideClose
 className="grid max-h-[100dvh] w-full max-w-5xl gap-0 overflow-y-auto border-0 bg-[#f5f1e9] p-0 dark:bg-[#1a1511] sm:rounded-none md:h-[86dvh] md:max-h-[86dvh] md:grid-cols-[1.15fr_0.85fr] md:overflow-hidden"
 >
 <WorkDetailContent
 key={work.id}
 work={work}
 previousWorkTitle={previousWorkTitle}
 nextWorkTitle={nextWorkTitle}
 onPreviousWork={onPreviousWork}
 onNextWork={onNextWork}
 />
 </DialogContent>
 )}
 </Dialog>
);
