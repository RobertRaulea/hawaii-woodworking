import type React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Mail, Phone } from 'lucide-react';
import { SEO } from '../SEO/SEO';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
 BUSINESS,
 buildServiceSchema,
 canonicalUrl,
 mailtoHref,
} from '../../../shared/seo/seo.utils';
import { SITE_URL } from '../../constants/site.constants';
import type { LandingPage, MarketingCopy } from '../../../shared/seo/marketing';

interface ServiceLandingProps {
 copy: MarketingCopy;
 page: keyof MarketingCopy['pages'];
}

const buildSchema = (siteUrl: string, copy: MarketingCopy, content: LandingPage) => {
 const breadcrumbs = [
 { name: copy.crumbs.home, path: '/' },
 ...(content.path === '/servicii' ? [] : [{ name: copy.crumbs.services, path: '/servicii' }]),
 { name: content.crumb, path: content.path },
 ];
 if (content.kind === 'service') {
 return buildServiceSchema({
 siteUrl,
 name: content.heading,
 description: content.seoDescription,
 canonicalPath: content.path,
 breadcrumbs,
 });
 }
 return {
 '@context': 'https://schema.org',
 '@graph': [
 {
 '@type': 'WebPage',
 name: content.heading,
 description: content.seoDescription,
 url: canonicalUrl(siteUrl, content.path),
 },
 {
 '@type': 'BreadcrumbList',
 itemListElement: breadcrumbs.map((crumb, index) => ({
 '@type': 'ListItem',
 position: index + 1,
 name: crumb.name,
 item: canonicalUrl(siteUrl, crumb.path),
 })),
 },
 ],
 };
};

export const ServiceLanding: React.FC<ServiceLandingProps> = ({ copy, page }) => {
 const content = copy.pages[page];
 const schema = buildSchema(SITE_URL, copy, content);
 const emailHref = mailtoHref(BUSINESS.email, content.emailSubject, content.emailBody);
 const crumbs = [
 { label: copy.crumbs.home, to: '/' },
 ...(content.path === '/servicii' ? [] : [{ label: copy.crumbs.services, to: '/servicii' }]),
 ];

 return (
 <>
 <SEO
 title={content.seoTitle}
 description={content.seoDescription}
 canonicalPath={content.path}
 schema={schema}
 />
 <div className="relative overflow-hidden bg-[#f5f1e9] dark:bg-[#1a1511]">
 <div
 aria-hidden="true"
 className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#927b5e_0.65px,transparent_0.65px)] [background-size:15px_15px]"
 />
 <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-14 lg:px-12 lg:py-20">
 <nav aria-label="Breadcrumb" className="mb-8 lg:mb-10">
 <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
 {crumbs.map((crumb) => (
 <li key={crumb.to} className="flex items-center gap-x-1.5">
 <Link to={crumb.to} className="transition-colors hover:text-amber-700 dark:hover:text-amber-400">
 {crumb.label}
 </Link>
 <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
 </li>
 ))}
 <li aria-current="page" className="font-medium text-stone-900 dark:text-stone-100">
 {content.crumb}
 </li>
 </ol>
 </nav>

 <header className="mb-10 max-w-3xl border-b border-stone-300/80 pb-8 dark:border-stone-700/80 md:mb-14">
 <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
 {content.eyebrow}
 </p>
 <h1 className="font-serif text-3xl font-medium leading-[1.08] text-foreground sm:text-4xl lg:text-5xl">
 {content.heading}
 </h1>
 <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {content.intro}
 </p>
 </header>

 {content.cards && content.cards.length > 0 && (
 <section aria-label={content.heading} className="mb-12 md:mb-16">
 <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
 {content.cards.map((card) => (
 <li key={card.href}>
 <Link
 to={card.href}
 className="group flex h-full flex-col border border-stone-300/80 bg-white/60 p-5 transition-colors hover:border-amber-700/60 hover:bg-white/90 dark:border-stone-700/80 dark:bg-stone-900/40 dark:hover:border-amber-500/50 dark:hover:bg-stone-900/70 sm:p-6"
 >
 <span className="font-serif text-xl text-foreground sm:text-2xl">
 {card.title}
 </span>
 <span className="mt-3 flex-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
 {card.body}
 </span>
 <span className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 transition-colors group-hover:text-amber-600 dark:text-amber-300 dark:group-hover:text-amber-200">
 {card.linkLabel} →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </section>
 )}

 <div className="space-y-12 md:space-y-16">
 {content.sections.map((section) => (
 <section key={section.heading} className="max-w-3xl">
 <h2 className="font-serif text-2xl font-medium text-foreground lg:text-3xl">
 {section.heading}
 </h2>
 {section.paragraphs?.map((paragraph) => (
 <p key={paragraph} className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {paragraph}
 </p>
 ))}
 {section.bullets && section.bullets.length > 0 && (
 <ul className="mt-5 space-y-3">
 {section.bullets.map((bullet) => (
 <li key={bullet} className="flex gap-3 text-sm leading-6 text-stone-700 dark:text-stone-300 sm:text-base">
 <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700 dark:bg-amber-400" />
 {bullet}
 </li>
 ))}
 </ul>
 )}
 </section>
 ))}

 <section className="max-w-3xl">
 <h2 className="font-serif text-2xl font-medium text-foreground lg:text-3xl">
 {content.faqTitle}
 </h2>
 <Accordion type="single" collapsible className="mt-5">
 {content.faqs.map((faq, index) => (
 <AccordionItem key={faq.question} value={`faq-${index}`} className="border-stone-300/80 dark:border-stone-700/80">
 <AccordionTrigger className="text-left text-stone-900 dark:text-stone-100">
 {faq.question}
 </AccordionTrigger>
 <AccordionContent className="text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {faq.answer}
 </AccordionContent>
 </AccordionItem>
 ))}
 </Accordion>
 </section>

 <section className="border border-stone-300/80 bg-white/60 p-6 dark:border-stone-700/80 dark:bg-stone-900/40 sm:p-8">
 <h2 className="font-serif text-2xl font-medium text-foreground lg:text-3xl">
 {content.ctaTitle}
 </h2>
 <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {content.ctaBody}
 </p>
 <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
 <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
 <a href={BUSINESS.phoneHref} aria-label={`${copy.contact.callLabel}: ${BUSINESS.phoneDisplay}`}>
 <Phone className="size-4" />
 {copy.contact.callLabel}: {BUSINESS.phoneDisplay}
 </a>
 </Button>
 <Button variant="brand" asChild size="lg" className="w-full sm:w-auto">
 <a href={emailHref}>
 <Mail className="size-4" />
 {copy.contact.emailLabel}
 </a>
 </Button>
 </div>
 <p className="mt-3 text-xs text-muted-foreground">{BUSINESS.email}</p>
 </section>
 </div>
 </div>
 </div>
 </>
 );
};
