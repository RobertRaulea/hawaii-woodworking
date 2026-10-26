import type React from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '@/components/ui/button';

export const ThankYou: React.FC = () => {
 const { t } = useTranslation();
 const { clearCart } = useCart();

 useEffect(() => {
 clearCart();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 return (
 <div className="max-w-2xl mx-auto px-6 lg:px-8 py-20 lg:py-28 text-center">
 <div className="animate-fade-in-up">
 <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-8">
 <Check className="w-8 h-8 text-emerald-500" strokeWidth={2} />
 </div>
 <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 dark:text-stone-50 mb-4">{t('thankYou.title')}</h1>
 <p className="text-stone-500 dark:text-stone-400 text-base leading-relaxed mb-10 max-w-md mx-auto">
 {t('thankYou.message')}
 </p>
 <Button
 asChild
 variant="outline"
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50 transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 >
 <Link to="/">{t('thankYou.backToHome')}</Link>
 </Button>
 </div>
 </div>
 );
};
