import type React from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
 className={`${className} transition-all duration-500 ease-in-out`}
 />
 {images.length > 1 && (
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
 {images.map((_, idx) => (
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
 </div>
 );
};
