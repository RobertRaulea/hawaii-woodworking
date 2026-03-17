import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { ImageCarousel } from '../ImageCarousel';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrls?: string[] | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, imageUrls, id }) => {
  const { t } = useTranslation();
  const { addItem } = useCart();

  const displayImages = useMemo(() => {
    return imageUrls ?? [];
  }, [imageUrls]);

  const coverImage =
    displayImages.length > 0
      ? (displayImages.find(
          (img) => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
        ) ?? displayImages[0])
      : null;

  const initialIndex = useMemo(() => {
    if (displayImages.length === 0) return 0;
    const mainImageIdx = displayImages.findIndex(
      (img) => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
    );
    return mainImageIdx !== -1 ? mainImageIdx : 0;
  }, [displayImages]);

  return (
    <div className="group bg-white rounded-lg overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-soft-lg transition-all duration-300">
      <Link to={`/product/${id}`} className="block">
        <div className="overflow-hidden">
          <ImageCarousel
            images={displayImages}
            alt={name}
            className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105"
            initialIndex={initialIndex}
          />
        </div>
        <div className="p-5 pb-3">
          <h3 className="font-serif text-lg font-medium text-stone-900 mb-1.5 truncate" title={name}>{name}</h3>
          <p className="text-amber-700 font-semibold text-base tracking-wide">{price.toFixed(2)} RON</p>
        </div>
      </Link>
      <div className="px-5 pb-5">
        <button
          onClick={() =>
            addItem({
              id,
              name,
              price,
              image: coverImage || 'https://placehold.co/100x100?text=No+Image',
            })
          }
          className="w-full border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
        >
          {t('product.addToCart')}
        </button>
      </div>
    </div>
  );
};
