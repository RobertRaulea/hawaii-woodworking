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
      <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-stone-900 mb-8">Our Catalog</h1>
      {catalogLoading && <p className="mb-6 text-gray-600">Loading catalog images...</p>}
      {!catalogLoading && images.length === 0 && (
        <p className="mb-6 text-gray-600">Catalog images are not available yet.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image) => (
          <div 
            key={image.name}
            className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            {/* Loading skeleton */}
            {!loadedImageNames[image.name] && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            <div className="aspect-w-4 aspect-h-3">
              <img
                src={image.src}
                alt={image.alt}
                onLoad={() => handleImageLoad(image.name)}
                className={`w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110 ${
                  !loadedImageNames[image.name] ? 'opacity-0' : 'opacity-100'
                }`}
                loading="lazy"
              />
            </div>
            
            {/* Hover overlay with title */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-end">
              <div className="p-4 w-full transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-white font-semibold text-lg">{image.title}</h3>
                <p className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full h-auto">
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl"
              onClick={() => setSelectedImage(null)}
            >
              Close ×
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 text-white rounded-b-lg">
              <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
