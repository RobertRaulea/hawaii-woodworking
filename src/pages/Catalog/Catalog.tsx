import React from 'react';
import test from "../../../assets/CatalogAssets/test.jpeg";
import test1 from "../../../assets/CatalogAssets/test (1).jpeg";
import test2 from "../../../assets/CatalogAssets/test (2).jpeg";
import test3 from "../../../assets/CatalogAssets/test (3).jpeg";
import test4 from "../../../assets/CatalogAssets/test (4).jpeg";
import test5 from "../../../assets/CatalogAssets/test (5).jpeg";

export const Catalog: React.FC = () => {
  // Array of imported test images
  const images = [
    test,
    test1,
    test2,
    test3,
    test4,
    test5,
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-stone-900 mb-8">Our Catalog</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="group relative overflow-hidden rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
          >
            <div className="aspect-w-1 aspect-h-1">
              <img
                src={image}
                alt={`Catalog item ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
};
