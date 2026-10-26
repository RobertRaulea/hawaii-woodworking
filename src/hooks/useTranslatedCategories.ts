import { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

type Category = {
 name: string;
 name_ro?: string;
 name_en?: string;
 name_de?: string;
};

const translatedField = (item: object, key: string): string | undefined => {
 const value = (item as Record<string, unknown>)[key];
 return typeof value === 'string' && value !== '' ? value : undefined;
};

export const useTranslatedCategories = <T extends Category>(categories: T[]): T[] => {
 const { language } = useLanguage();

 return useMemo(() => {
 return categories.map(category => {
 const translatedName =
 translatedField(category, `name_${language}`) ||
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
