import type React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useSiteAssets } from '../../hooks/useSiteAssets';

export const Layout: React.FC = () => {
 const { i18n } = useTranslation();
 const language = i18n.resolvedLanguage ?? i18n.language;
 const skipLabel = language.startsWith('en')
 ? 'Skip to main content'
 : language.startsWith('de')
 ? 'Zum Hauptinhalt springen'
 : 'Sari la conținutul principal';
 const { assets: logoAssets } = useSiteAssets('logo');
 const logoSrc =
 logoAssets.find((asset) => asset.name !== 'hawaii-logo.svg')?.url ??
 '/images/hawaii-logo.svg';

 return (
 <div className="flex min-h-screen flex-col overflow-x-clip bg-stone-50 dark:bg-stone-950 ">
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-stone-900 focus:px-4 focus:py-3 focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-amber-500 dark:focus:bg-stone-100 dark:focus:text-stone-900"
 >
 {skipLabel}
 </a>
 <Header logoSrc={logoSrc} />
 <main id="main-content" tabIndex={-1} className="flex-grow">
 <Outlet />
 </main>
 <Footer />
 </div>
 );
};
