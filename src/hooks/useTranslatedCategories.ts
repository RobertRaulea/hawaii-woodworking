import { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

type Category = {
  name: string;
  name_ro?: string;
  name_en?: string;
  name_de?: string;
  [key: string]: any;
};

export const useTranslatedCategories = <T extends Category>(categories: T[]): T[] => {
  const { language } = useLanguage();

  return useMemo(() => {
    return categories.map(category => {
      const translatedName = 
        category[`name_${language}`] || 
        category.name_ro || 
        category.name || 
        '';

      return {
        ...category,
        name: translatedName,
      };
    });
  }, [categories, language]);
};
