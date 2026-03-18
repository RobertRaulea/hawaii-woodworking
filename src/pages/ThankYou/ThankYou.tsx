import type React from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';

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
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-8">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 mb-4">{t('thankYou.title')}</h1>
        <p className="text-stone-500 text-base leading-relaxed mb-10 max-w-md mx-auto">
          {t('thankYou.message')}
        </p>
        <Link
          to="/"
          className="inline-block border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-8 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
        >
          {t('thankYou.backToHome')}
        </Link>
      </div>
    </div>
  );
};
