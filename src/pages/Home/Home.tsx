import type React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hero } from '../../components/Hero';
import { Products } from '../Products/Products';
import { SEO } from '../../components/SEO/SEO';
import { useSiteAssets } from '../../hooks/useSiteAssets';
import { useLanguage } from '../../context/LanguageContext';
import { marketingCopy } from '../../../shared/seo/marketing';
import { organizationSchema, SITE_NAME, webSiteSchema } from '../../../shared/seo/seo.utils';
import { SITE_URL } from '../../constants/site.constants';

export const Home: React.FC = () => {
 const { assets: heroAssets } = useSiteAssets('hero');
 const { language } = useLanguage();
 const { t } = useTranslation();
 const servicesCopy = marketingCopy[language].pages.services;

 const heroBackgroundImage = heroAssets.find((asset) => asset.name !== 'WoodPhoto.jpg')?.url;

 const schema = {
 '@context': 'https://schema.org',
 '@graph': [
 webSiteSchema(SITE_URL, SITE_NAME, t('seo.homeDescription')),
 organizationSchema(SITE_URL),
 ],
 };

 return (
 <>
 <SEO
 title={t('seo.homeTitle')}
 description={t('seo.homeDescription')}
 keywords={[
 'cadouri din lemn personalizate',
 'decorațiuni restaurant lemn',
 'cadouri pentru părinți',
 'mobilier restaurant personalizat',
 'cadouri artizanale romania'
 ]}
 canonicalPath="/"
 schema={schema}
 />
 <Hero backgroundImage={heroBackgroundImage} />
 {/* Product listing directly on homepage */}
 <Products embedded />
 <section
 aria-labelledby="services-teaser"
 className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16"
 >
 <div className="border-t border-border pt-10">
 <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
 {servicesCopy.eyebrow}
 </p>
 <h2
 id="services-teaser"
 className="mt-3 font-serif text-2xl font-medium text-foreground lg:text-3xl"
 >
 {servicesCopy.heading}
 </h2>
 <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {servicesCopy.intro}
 </p>
 <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
 {servicesCopy.cards?.map((card) => (
 <li key={card.href}>
 <Link
 to={card.href}
 className="group flex h-full flex-col border border-border bg-card p-5 transition-colors hover:border-amber-700/60 dark:hover:border-amber-500/50 sm:p-6"
 >
 <span className="font-serif text-xl text-foreground">{card.title}</span>
 <span className="mt-3 flex-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{card.body}</span>
 <span className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 transition-colors group-hover:text-amber-600 dark:text-amber-300 dark:group-hover:text-amber-200">
 {card.linkLabel} →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 </section>
 </>
 );
};
