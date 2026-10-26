import type React from 'react';
import { Package } from 'lucide-react';

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/**
 * Small square product thumbnail used across admin views to make products
 * easier to identify. Falls back to a neutral placeholder when the product
 * has no image (or is no longer available).
 */
export const ProductThumb: React.FC<ProductThumbProps> = ({
  src,
  alt,
  className = 'h-10 w-10',
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} shrink-0 rounded object-cover`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`flex ${className} shrink-0 items-center justify-center rounded bg-stone-200 dark:bg-stone-700`}
    >
      <Package className="h-1/2 w-1/2 text-stone-400 dark:text-stone-500" />
    </div>
  );
};
