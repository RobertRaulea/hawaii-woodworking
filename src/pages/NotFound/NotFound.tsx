import type React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PackageSearch } from 'lucide-react';
import { SEO } from '../../components/SEO/SEO';
import { Button } from '@/components/ui/button';

export const NotFound: React.FC = () => {
 const { t } = useTranslation();

 return (
 <>
 <SEO title={t('errors.pageNotFound')} noindex />
 <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
 <PackageSearch className="size-12 text-stone-300 dark:text-stone-600" strokeWidth={1.5} />
 <h1 className="mt-5 font-serif text-2xl font-medium text-foreground lg:text-4xl">
 {t('errors.pageNotFound')}
 </h1>
 <p className="mt-3 max-w-md text-sm text-muted-foreground">
 {t('errors.notFoundDescription')}
 </p>
 <Button asChild variant="secondary" className="mt-7">
 <Link to="/">{t('errors.goHome')}</Link>
 </Button>
 </div>
 </>
 );
};
