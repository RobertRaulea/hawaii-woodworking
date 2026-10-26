import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils/cn.utils';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  initialIndex?: number;
}

const FALLBACK_IMAGE = 'https://placehold.co/800x800?text=Product+Image';
const SWIPE_THRESHOLD = 48;
const FLICK_VELOCITY = 0.4; // px per ms — a fast short flick also turns the page
const WHEEL_THRESHOLD = 24;
const WHEEL_COOLDOWN_MS = 700;

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  alt,
  initialIndex = 0,
}) => {
  const { t } = useTranslation();
  const safeImages = images.length > 0 ? images : [FALLBACK_IMAGE];
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(initialIndex, 0), safeImages.length - 1)
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragStart = useRef<{ x: number; y: number; kind: 'touch' | 'mouse' } | null>(null);
  const swipeAxis = useRef<'h' | 'v' | null>(null);
  const lastMove = useRef<{ t: number; x: number } | null>(null);
  const didSwipe = useRef(false);
  const wheelAccum = useRef(0);
  const lastWheelNav = useRef(0);

  const hasMultiple = safeImages.length > 1;

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + safeImages.length) % safeImages.length);
    },
    [safeImages.length]
  );
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Every visual transform of the film strip goes through the DOM directly —
  // no React re-render per frame while dragging, so the motion stays fluid.
  const applyTrack = useCallback(
    (offsetPx: number, instant = false) => {
      const el = trackRef.current;
      if (!el) return;
      el.style.transitionDuration = instant ? '0ms' : '';
      el.style.transform = `translateX(calc(${-activeIndex * 100}% + ${offsetPx}px))`;
    },
    [activeIndex]
  );

  useEffect(() => {
    applyTrack(0);
  }, [applyTrack]);

  // Keep the active thumbnail scrolled into view in the rail.
  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, [activeIndex]);

  // Keyboard navigation while the lightbox is open (Escape is handled by Dialog).
  useEffect(() => {
    if (!lightboxOpen || !hasMultiple) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, hasMultiple, goPrev, goNext]);

  const beginDrag = (x: number, y: number, time: number, kind: 'touch' | 'mouse') => {
    if (!hasMultiple) return;
    dragStart.current = { x, y, kind };
    swipeAxis.current = null;
    lastMove.current = { t: time, x };
  };

  const moveDrag = (x: number, y: number, time: number) => {
    if (!dragStart.current) return;
    const dx = x - dragStart.current.x;
    const dy = y - dragStart.current.y;
    if (swipeAxis.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipeAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (swipeAxis.current === 'h') {
      applyTrack(dx, true);
      lastMove.current = { t: time, x };
    }
  };

  const endDrag = (x: number, time: number) => {
    if (!dragStart.current) return;
    const start = dragStart.current;
    dragStart.current = null;
    const el = trackRef.current;
    if (el) el.style.transitionDuration = '';
    if (swipeAxis.current !== 'h') return;

    const dx = x - start.x;
    const velocity = lastMove.current
      ? (x - lastMove.current.x) / Math.max(1, time - lastMove.current.t)
      : 0;
    const advance =
      Math.abs(dx) > SWIPE_THRESHOLD ||
      (Math.abs(velocity) > FLICK_VELOCITY && Math.abs(dx) > 8);

    if (advance) {
      didSwipe.current = true;
      if (dx < 0) goNext();
      else goPrev();
    } else {
      applyTrack(0);
    }
    swipeAxis.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) =>
    beginDrag(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp, 'touch');
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) =>
    moveDrag(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp);
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) =>
    endDrag(e.changedTouches[0].clientX, e.timeStamp);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasMultiple || e.button !== 0) return;
    e.preventDefault(); // no native image drag / text selection mid-gesture
    beginDrag(e.clientX, e.clientY, e.timeStamp, 'mouse');
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStart.current?.kind === 'mouse') endDrag(e.clientX, e.timeStamp);
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
    if (e.deltaX > 0) goNext();
    else goPrev();
  };

  const handleMainClick = () => {
    // A completed swipe also produces a click — swallow it once so the
    // lightbox does not open while paging through images.
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    setLightboxOpen(true);
  };

  const swipeHandlers = hasMultiple
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      }
    : {};

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
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main image */}
      <div className="group/gallery relative order-1 w-full sm:order-2 sm:flex-1 lg:h-full">
        <div
          className="relative aspect-[4/5] w-full cursor-zoom-in touch-pan-y select-none overflow-hidden rounded-xl bg-stone-100 sm:aspect-square lg:aspect-auto lg:h-full dark:bg-stone-800"
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY, e.timeStamp)}
          onMouseDown={handleMouseDown}
          onMouseUp={(e) => endDrag(e.clientX, e.timeStamp)}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onClick={handleMainClick}
          role="button"
          tabIndex={0}
          aria-label={t('product.viewFullscreen')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setLightboxOpen(true);
            }
          }}
          {...swipeHandlers}
        >
          <div
            ref={trackRef}
            className="flex h-full will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${-activeIndex * 100}%)` }}
          >
            {safeImages.map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt={`${alt} - ${index + 1}`}
                draggable={false}
                className="h-full w-full shrink-0 select-none object-cover"
              />
            ))}
          </div>
        </div>

        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              onClick={goPrev}
              className={cn(arrowButtonClass, 'left-3')}
              aria-label={t('product.previousImage')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={goNext}
              className={cn(arrowButtonClass, 'right-3')}
              aria-label={t('product.nextImage')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute bottom-3 left-3 rounded-full bg-stone-950/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {activeIndex + 1} / {safeImages.length}
            </span>
          </>
        )}

        <Button
          variant="ghost"
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-3 right-3 z-10 h-9 w-9 rounded-full bg-white/90 p-0 text-stone-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-stone-900/90 dark:text-stone-200 dark:hover:bg-stone-800 lg:opacity-0 lg:group-hover/gallery:opacity-100 lg:focus-visible:opacity-100"
          aria-label={t('product.viewFullscreen')}
        >
          <Expand className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          hideClose
          className="flex h-[100dvh] w-[100dvw] max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none border-0 bg-stone-950/95 p-0 backdrop-blur-md"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>

          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center p-4 sm:p-10"
            {...swipeHandlers}
          >
            <img
              key={`lightbox-${safeImages[activeIndex]}`}
              src={safeImages[activeIndex]}
              alt={`${alt} - ${activeIndex + 1}`}
              draggable={false}
              className="max-h-full max-w-full animate-scale-in select-none object-contain"
            />

            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-white/10 p-0 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 sm:left-6 lg:flex"
                  aria-label={t('product.previousImage')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 rounded-full border-0 bg-white/10 p-0 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20 sm:right-6 lg:flex"
                  aria-label={t('product.nextImage')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm sm:left-6 sm:top-6">
                  {activeIndex + 1} / {safeImages.length}
                </span>
              </>
            )}
          </div>

          {hasMultiple && (
            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-5 pt-1">
              {safeImages.map((src, index) => (
                <button
                  key={`lightbox-thumb-${src}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`${alt} - ${index + 1}`}
                  className={cn(
                    'h-14 w-14 shrink-0 overflow-hidden rounded-md border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:h-16 sm:w-16',
                    index === activeIndex
                      ? 'scale-110 border-amber-500 ring-2 ring-amber-500/60'
                      : 'scale-95 border-white/20 opacity-50 hover:scale-100 hover:opacity-100'
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
