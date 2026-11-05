import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils/cn.utils';
import { stepCarousel } from '../ImageCarousel/carousel.utils';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  initialIndex?: number;
}

const FALLBACK_IMAGE = 'https://placehold.co/800x800?text=Product+Image';
const WHEEL_THRESHOLD = 24;
const WHEEL_COOLDOWN_MS = 700;

interface GalleryLightboxProps {
  onClose: () => void;
  images: string[];
  alt: string;
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

// Mounted only while the dialog is open, so the embla instance is created and
// destroyed with it and always starts on the current image.
const GalleryLightboxContent: React.FC<GalleryLightboxProps> = ({
  onClose,
  images,
  alt,
  activeIndex,
  onIndexChange,
}) => {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const startIndex = useRef(activeIndex).current;
  const hasMultiple = images.length > 1;
  const opts = useMemo(
    () => ({ loop: hasMultiple, watchDrag: hasMultiple, startIndex }),
    [hasMultiple, startIndex]
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => onIndexChange(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onIndexChange]);

  // Follow the shared index when a lightbox thumbnail is picked.
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== activeIndex) api.scrollTo(activeIndex);
  }, [api, activeIndex]);

  // Keyboard navigation (Escape is handled by Dialog).
  useEffect(() => {
    if (!hasMultiple) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stepCarousel(api, -1);
      if (e.key === 'ArrowRight') stepCarousel(api, 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasMultiple, api]);

  return (
    <>
      <DialogTitle className="sr-only">{alt}</DialogTitle>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={t('common.close')}
      >
        <X className="size-5" />
      </button>

      <div className="relative min-h-0 flex-1">
        <Carousel
          opts={opts}
          setApi={setApi}
          aria-label={alt}
          className="absolute inset-0"
        >
          <CarouselContent className="ml-0 h-full" viewportClassName="h-full">
            {images.map((src, index) => (
              <CarouselItem
                key={`lightbox-${src}-${index}`}
                className="flex h-full items-center justify-center p-4 sm:p-10"
              >
                <img
                  src={src}
                  alt={`${alt} - ${index + 1}`}
                  draggable={false}
                  className="max-h-full max-w-full animate-scale-in select-none object-contain"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              onClick={() => stepCarousel(api, -1)}
              className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 rounded-full border-0 bg-white/10 p-0 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 sm:left-6 lg:flex"
              aria-label={t('product.previousImage')}
            >
              <ChevronLeft className="size-6" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => stepCarousel(api, 1)}
              className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 rounded-full border-0 bg-white/10 p-0 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 sm:right-6 lg:flex"
              aria-label={t('product.nextImage')}
            >
              <ChevronRight className="size-6" />
            </Button>
            <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm sm:left-6 sm:top-6">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-5 pt-1">
          {images.map((src, index) => (
            <button
              key={`lightbox-thumb-${src}-${index}`}
              type="button"
              onClick={() => onIndexChange(index)}
              aria-label={`${alt} - ${index + 1}`}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-md border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-16 sm:w-16',
                index === activeIndex
                  ? 'scale-110 border-amber-500 ring-2 ring-amber-500/60'
                  : 'scale-95 border-white/20 opacity-50 hover:scale-100 hover:opacity-100'
              )}
            >
              <img src={src} alt="" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  alt,
  initialIndex = 0,
}) => {
  const { t } = useTranslation();
  const safeImages = images.length > 0 ? images : [FALLBACK_IMAGE];
  const hasMultiple = safeImages.length > 1;
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), safeImages.length - 1)
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wheelAccum = useRef(0);
  const lastWheelNav = useRef(0);
  // Embla starts at this slide; later index changes go through the api.
  const startIndex = useRef(activeIndex).current;

  const opts = useMemo(
    () => ({ loop: hasMultiple, watchDrag: hasMultiple, startIndex }),
    [hasMultiple, startIndex]
  );

  // Carousel -> state: swipe, drag, wheel and arrow buttons all end in a select.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // State -> carousel: thumbnails (and the lightbox) change the index. Jump
  // instead of animating while the lightbox covers the page.
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== activeIndex) {
      api.scrollTo(activeIndex, lightboxOpen);
    }
  }, [api, activeIndex, lightboxOpen]);

  // Keep the active thumbnail scrolled into view in the rail.
  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, [activeIndex]);

  const step = (direction: 1 | -1) => {
    if (api) stepCarousel(api, direction);
    else setActiveIndex((i) => (i + direction + safeImages.length) % safeImages.length);
  };

  // Two-finger horizontal swipe on a trackpad arrives as wheel deltaX.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = e.timeStamp;
    if (now - lastWheelNav.current < WHEEL_COOLDOWN_MS) {
      wheelAccum.current = 0;
      return;
    }
    wheelAccum.current += e.deltaX;
    if (Math.abs(wheelAccum.current) < WHEEL_THRESHOLD) return;
    wheelAccum.current = 0;
    lastWheelNav.current = now;
    step(e.deltaX > 0 ? 1 : -1);
  };

  const arrowButtonClass =
    'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white/90 p-0 text-stone-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-stone-900/90 dark:text-stone-200 dark:hover:bg-stone-800 lg:flex lg:opacity-0 lg:group-hover/gallery:opacity-100 lg:focus-visible:opacity-100';

  return (
    <div className="flex flex-col gap-3 self-start sm:flex-row sm:items-start sm:gap-4 lg:self-stretch">
      {/* Thumbnail rail: small centered strip on mobile, vertical rail on desktop */}
      {hasMultiple && (
        <div className="order-2 flex justify-center sm:order-1 sm:block sm:w-20 sm:shrink-0">
          <div
            aria-label={alt}
            className="flex max-w-full gap-2 overflow-x-auto px-1 py-2 [scrollbar-width:thin] sm:max-h-[560px] sm:flex-col sm:items-center sm:gap-2.5 sm:overflow-y-auto sm:overflow-x-hidden sm:px-0 sm:py-2"
          >
            {safeImages.map((src, index) => (
              <button
                key={`${src}-${index}`}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                type="button"
                aria-current={index === activeIndex}
                aria-label={`${alt} - ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-stone-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-800 sm:h-[4.5rem] sm:w-[4.5rem]',
                  index === activeIndex
                    ? 'z-10 scale-110 border-amber-600 opacity-100 ring-2 ring-amber-500/60 dark:border-amber-500 sm:scale-105'
                    : 'scale-90 border-stone-200 opacity-60 hover:scale-100 hover:opacity-100 dark:border-stone-700 sm:scale-100'
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
        </div>
      )}

      {/* Main image */}
      <div className="group/gallery relative order-1 w-full sm:order-2 sm:flex-1 lg:h-full">
        <Carousel
          opts={opts}
          setApi={setApi}
          role="button"
          aria-roledescription={undefined}
          aria-label={t('product.viewFullscreen')}
          tabIndex={0}
          className="aspect-[4/5] w-full cursor-zoom-in select-none overflow-hidden rounded-xl bg-muted sm:aspect-square lg:aspect-auto lg:h-full"
          onWheel={handleWheel}
          // Embla swallows the click that ends a drag (capture phase), so this only
          // fires for a real tap.
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setLightboxOpen(true);
            }
          }}
        >
          <CarouselContent className="ml-0 h-full" viewportClassName="h-full">
            {safeImages.map((src, index) => (
              <CarouselItem key={`${src}-${index}`} className="h-full pl-0">
                <img
                  src={src}
                  alt={`${alt} - ${index + 1}`}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              onClick={() => step(-1)}
              className={cn(arrowButtonClass, 'left-3')}
              aria-label={t('product.previousImage')}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => step(1)}
              className={cn(arrowButtonClass, 'right-3')}
              aria-label={t('product.nextImage')}
            >
              <ChevronRight className="size-5" />
            </Button>
            <span className="absolute bottom-3 left-3 rounded-full bg-stone-950/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {activeIndex + 1} / {safeImages.length}
            </span>
          </>
        )}

        <Button
          variant="ghost"
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-3 right-3 z-10 size-9 rounded-full bg-white/90 p-0 text-stone-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-stone-900/90 dark:text-stone-200 dark:hover:bg-stone-800 lg:opacity-0 lg:group-hover/gallery:opacity-100 lg:focus-visible:opacity-100"
          aria-label={t('product.viewFullscreen')}
        >
          <Expand className="size-4" />
        </Button>
      </div>

      {/* Fullscreen lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          hideClose
          className="flex h-[100dvh] w-[100dvw] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none border-0 bg-stone-950/95 p-0 backdrop-blur-md"
        >
          <GalleryLightboxContent
            onClose={() => setLightboxOpen(false)}
            images={safeImages}
            alt={alt}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
