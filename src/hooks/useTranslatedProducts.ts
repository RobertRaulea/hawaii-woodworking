import { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

type Product = {
  name: string;
  description?: string | null;
  name_ro?: string;
  name_en?: string;
  name_de?: string;
  description_ro?: string;
  description_en?: string;
  description_de?: string;
  [key: string]: any;
};

export const useTranslatedProducts = <T extends Product>(products: T[] | undefined): T[] => {
  const { language } = useLanguage();

  return useMemo(() => {
    if (!products) return [];

    return products.map(product => {
      const translatedName = 
        product[`name_${language}`] || 
        product.name_ro || 
        product.name || 
        '';
      
      const translatedDescription = 
        product[`description_${language}`] || 
        product.description_ro || 
        product.description || 
        null;

      return {
        ...product,
        name: translatedName,
        description: translatedDescription,
      };
    });
  }, [products, language]);
};

export const useTranslatedProduct = <T extends Product>(product: T | null | undefined): T | null => {
  const { language } = useLanguage();

  return useMemo(() => {
    if (!product) return null;

    const translatedName = 
      product[`name_${language}`] || 
      product.name_ro || 
      product.name || 
      '';
    
    const translatedDescription = 
      product[`description_${language}`] || 
      product.description_ro || 
      product.description || 
      null;

    return {
      ...product,
      name: translatedName,
      description: translatedDescription,
    };
  }, [product, language]);
};
