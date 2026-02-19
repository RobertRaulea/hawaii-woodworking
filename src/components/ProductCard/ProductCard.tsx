import type React from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ImageCarousel } from '../ImageCarousel';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrls?: string[] | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, imageUrls, id }) => {
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
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${id}`} className="block">
        <ImageCarousel
          images={displayImages}
          alt={name}
          className="w-full h-64 object-cover"
          initialIndex={initialIndex}
        />
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 truncate" title={name}>{name}</h3>
          <p className="text-amber-700 font-medium text-lg">{price.toFixed(2)} RON</p>
        </div>
      </Link>
      <div className="p-6 pt-0">
        <button
          onClick={() =>
            addItem({
              id,
              name,
              price,
              image: coverImage || 'https://placehold.co/100x100?text=No+Image',
            })
          }
          className="w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors"
        >
          Adaugă în Coș
        </button>
      </div>
    </div>
  );
};
