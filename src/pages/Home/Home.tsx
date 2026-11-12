import type React from 'react';
import { useTranslation } from 'react-i18next';
import { HomeStory } from '../../components/Home/HomeStory';
import { Reveal } from '../../components/Home/Reveal';
import { Products } from '../Products/Products';
import { SEO } from '../../components/SEO/SEO';
import { ServiceCardGrid } from '../../components/ServiceLanding/ServiceCardGrid';
import { useLanguage } from '../../context/LanguageContext';
import { marketingCopy } from '../../../shared/seo/marketing';
import { organizationSchema, SITE_NAME, webSiteSchema } from '../../../shared/seo/seo.utils';
import { SITE_URL } from '../../constants/site.constants';

export const Home: React.FC = () => {
 const { language } = useLanguage();
 const { t } = useTranslation();
 const servicesCopy = marketingCopy[language].pages.services;

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
 <HomeStory />
 {/* Product listing directly on homepage */}
 <section id="produse" className="scroll-mt-20">
 <Products embedded />
 </section>
 <section
 aria-labelledby="services-teaser"
 className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16"
 >
 <div className="border-t border-border pt-10">
 <Reveal>
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
 </Reveal>
 <Reveal delay={150}>
 <ServiceCardGrid cards={servicesCopy.cards} className="mt-8" />
 </Reveal>
 </div>
 </section>
 </>
 );
};
