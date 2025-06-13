import React, { useState } from 'react';
import { SEO } from '../../components/SEO/SEO';
import test from "../../../assets/CatalogAssets/test.jpeg";
import test1 from "../../../assets/CatalogAssets/test (1).jpeg";
import test2 from "../../../assets/CatalogAssets/test (2).jpeg";
import test3 from "../../../assets/CatalogAssets/test (3).jpeg";
import test4 from "../../../assets/CatalogAssets/test (4).jpeg";
import test5 from "../../../assets/CatalogAssets/test (5).jpeg";

interface CatalogImage {
  src: string;
  alt: string;
  title: string;
}

export const Catalog: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<CatalogImage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean[]>(new Array(6).fill(true));

  // Array of imported test images with metadata
  const images: CatalogImage[] = [
    { src: test, alt: "Woodwork Item 1", title: "Platou 5 locasuri" },
    { src: test1, alt: "Woodwork Item 2", title: "Tava lemn" },
    { src: test2, alt: "Woodwork Item 3", title: "Tava 4 locasuri" },
    { src: test3, alt: "Woodwork Item 4", title: "Icoana" },
    { src: test4, alt: "Woodwork Item 5", title: "Icoana pe CNC" },
    { src: test5, alt: "Woodwork Item 6", title: "Icoana Iisus" },
  ];

  const handleImageLoad = (index: number) => {
    setIsLoading(prev => {
      const newState = [...prev];
      newState[index] = false;
      return newState;
    });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            {/* Loading skeleton */}
            {isLoading[index] && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            <div className="aspect-w-4 aspect-h-3">
              <img
                src={image.src}
                alt={image.alt}
                onLoad={() => handleImageLoad(index)}
                className={`w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110 ${
                  isLoading[index] ? 'opacity-0' : 'opacity-100'
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
