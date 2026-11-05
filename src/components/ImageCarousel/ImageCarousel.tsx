import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';
import { stepCarousel } from './carousel.utils';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  initialIndex?: number;
  onPrevClick?: (e: React.MouseEvent) => void;
  onNextClick?: (e: React.MouseEvent) => void;
}

const FALLBACK_IMAGE = 'https://placehold.co/600x400?text=Product+Image';

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  className = 'w-full h-64 object-cover',
  initialIndex = 0,
  onPrevClick,
  onNextClick,
}) => {
  const slides = images.length > 0 ? images : [FALLBACK_IMAGE];
  const hasMultiple = slides.length > 1;
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const opts = useMemo(
    () => ({ loop: hasMultiple, watchDrag: hasMultiple, startIndex: initialIndex }),
    [hasMultiple, initialIndex]
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPrevClick?.(e);
    stepCarousel(api, -1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNextClick?.(e);
    stepCarousel(api, 1);
  };

  // Only the current image and its neighbours are rendered: a catalog page
  // holds many cards and must not download every gallery image up front.
  const isNear = (index: number) =>
    index === currentIndex ||
    index === (currentIndex + 1) % slides.length ||
    index === (currentIndex - 1 + slides.length) % slides.length;

  return (
    <Carousel
      opts={opts}
      setApi={setApi}
      aria-label={alt}
      className="group/carousel"
    >
      <CarouselContent className="ml-0">
        {slides.map((src, index) => (
          <CarouselItem key={`${src}-${index}`} className="pl-0">
            {isNear(index) && (
              <img
                src={src}
                alt={`${alt} - image ${index + 1}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`${className} transition-all duration-500 ease-in-out`}
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 z-10 h-auto w-auto -translate-y-1/2 rounded-full bg-white/80 dark:bg-stone-900/80 p-1.5 text-stone-700 dark:text-stone-300 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 group-hover/carousel:opacity-100"
            aria-label="Previous Image"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleNext}
            className="absolute right-3 top-1/2 z-10 h-auto w-auto -translate-y-1/2 rounded-full bg-white/80 dark:bg-stone-900/80 p-1.5 text-stone-700 dark:text-stone-300 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 group-hover/carousel:opacity-100"
            aria-label="Next Image"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`block rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-5 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
};
