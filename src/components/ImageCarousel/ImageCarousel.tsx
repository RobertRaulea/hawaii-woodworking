import type React from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  initialIndex?: number;
  onPrevClick?: (e: React.MouseEvent) => void;
  onNextClick?: (e: React.MouseEvent) => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  className = 'w-full h-64 object-cover',
  initialIndex = 0,
  onPrevClick,
  onNextClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPrevClick?.(e);
    if (images.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNextClick?.(e);
    if (images.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const fallback = 'https://placehold.co/600x400?text=Product+Image';
  const currentSrc = images.length > 0 ? images[currentIndex] : fallback;

  return (
    <div className="relative group/carousel">
      <img
        src={currentSrc}
        alt={`${alt} - image ${currentIndex + 1}`}
        className={`${className} transition-all duration-300 ease-in-out`}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 z-10"
            aria-label="Previous Image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 z-10"
            aria-label="Next Image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};
