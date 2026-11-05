import type { CarouselApi } from '@/components/ui/carousel';

// Step one slide in either direction. Embla only wraps when it can loop (it
// silently disables loop when the slides do not fill the viewport enough, e.g.
// with 2 full-width images), so wrap manually to keep circular navigation.
export const stepCarousel = (api: CarouselApi, direction: 1 | -1) => {
  if (!api) return;
  if (direction === 1) {
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  } else if (api.canScrollPrev()) {
    api.scrollPrev();
  } else {
    api.scrollTo(api.scrollSnapList().length - 1);
  }
};
