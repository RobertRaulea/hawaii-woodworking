import React, { useMemo, useState } from 'react';
import { SEO } from '../../components/SEO/SEO';
import { useSiteAssets } from '../../hooks/useSiteAssets';

interface CatalogImage {
  name: string;
  src: string;
  alt: string;
  title: string;
}

const metadataByFileName: Record<string, { alt: string; title: string }> = {
  'test.jpeg': { alt: 'Woodwork Item 1', title: 'Platou 5 locasuri' },
  'test (1).jpeg': { alt: 'Woodwork Item 2', title: 'Tava lemn' },
  'test (2).jpeg': { alt: 'Woodwork Item 3', title: 'Tava 4 locasuri' },
  'test (3).jpeg': { alt: 'Woodwork Item 4', title: 'Icoana' },
  'test (4).jpeg': { alt: 'Woodwork Item 5', title: 'Icoana pe CNC' },
  'test (5).jpeg': { alt: 'Woodwork Item 6', title: 'Icoana Iisus' },
};

const displayOrder = [
  'test.jpeg',
  'test (1).jpeg',
  'test (2).jpeg',
  'test (3).jpeg',
  'test (4).jpeg',
  'test (5).jpeg',
];

export const Catalog: React.FC = () => {
  const { assets: catalogAssets, loading: catalogLoading } = useSiteAssets('catalog');
  const [selectedImage, setSelectedImage] = useState<CatalogImage | null>(null);

  const [loadedImageNames, setLoadedImageNames] = useState<Record<string, boolean>>({});

  const images = useMemo<CatalogImage[]>(() => {
    return displayOrder
      .map((name) => {
        const asset = catalogAssets.find((item) => item.name === name);
        if (!asset) {
          return null;
        }

        const metadata = metadataByFileName[name] ?? {
          alt: 'Woodwork catalog item',
          title: name,
        };

        return {
          name,
          src: asset.url,
          alt: metadata.alt,
          title: metadata.title,
        };
      })
      .filter((image): image is CatalogImage => image !== null);
  }, [catalogAssets]);

  const handleImageLoad = (name: string) => {
    setLoadedImageNames((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const pageTitle = "Catalog Lucrări din Lemn - Hawaii Woodworking";
  const pageDescription = "Vizualizați portofoliul nostru de lucrări din lemn: icoane, platouri, tăvi și alte obiecte personalizate create prin prelucrare CNC și artizanat. Inspirați-vă pentru proiectul dumneavoastră.";
  const pageKeywords = [
    'catalog lemn',
    'portofoliu tâmplărie',
    'icoane lemn românia',
    'platouri lemn servire',
    'tăvi lemn personalizate',
    'lucrări cnc lemn',
    'proiecte lemn masiv'
  ];

  return (
    <>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
      <div className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 mb-3">Catalogul Nostru</h1>
        <p className="text-stone-500 text-base">Portofoliu de lucrări din lemn realizate în atelierul nostru</p>
      </div>
      {catalogLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin"></div>
        </div>
      )}
      {!catalogLoading && images.length === 0 && (
        <p className="text-stone-400 text-sm py-12 text-center">Imaginile din catalog nu sunt disponibile momentan.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {images.map((image) => (
          <div 
            key={image.name}
            className="group relative overflow-hidden rounded-lg cursor-pointer aspect-[4/3]"
            onClick={() => setSelectedImage(image)}
          >
            {/* Loading skeleton */}
            {!loadedImageNames[image.name] && (
              <div className="absolute inset-0 bg-stone-100 animate-pulse rounded-lg" />
            )}
            
            <img
              src={image.src}
              alt={image.alt}
              onLoad={() => handleImageLoad(image.name)}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
                !loadedImageNames[image.name] ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
            />
            
            {/* Hover overlay with title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-end">
              <div className="p-5 w-full">
                <h3 className="font-serif text-white font-medium text-lg">{image.title}</h3>
                <p className="text-white/60 text-xs mt-1">
                  Click pentru a vedea detalii
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for full-size image view */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-8 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full h-auto animate-scale-in">
            <button
              className="absolute -top-12 right-0 text-white/60 hover:text-white text-sm font-medium tracking-wide transition-colors duration-200"
              onClick={() => setSelectedImage(null)}
            >
              Închide ×
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="w-full h-auto rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-lg">
              <h3 className="font-serif text-xl font-medium">{selectedImage.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
