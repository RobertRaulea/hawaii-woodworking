import type React from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Mail, Phone } from 'lucide-react';
import { SEO } from '../SEO/SEO';
import { ServiceCardGrid } from './ServiceCardGrid';
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
 <div
 aria-hidden="true"
 className="pointer-events-none absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-amber-400/25 blur-3xl dark:bg-amber-500/10"
 />
 <div
 aria-hidden="true"
 className="pointer-events-none absolute -left-40 top-[45%] h-[28rem] w-[28rem] rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-600/[0.07]"
 />
 <svg
 aria-hidden="true"
 viewBox="0 0 200 200"
 fill="none"
 className="pointer-events-none absolute right-4 top-4 hidden w-36 text-amber-700/20 dark:text-amber-400/20 sm:block lg:right-12 lg:top-10 lg:w-52"
 >
 <circle cx="150" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
 <circle cx="150" cy="50" r="14" stroke="currentColor" strokeWidth="1" />
 <path d="M150 8v84M108 50h84" stroke="currentColor" strokeWidth="1" />
 <circle cx="150" cy="50" r="3" fill="currentColor" />
 <path
 d="M12 158h52l18-18h48l18 18h22v30"
 stroke="currentColor"
 strokeWidth="1.5"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <circle cx="12" cy="158" r="3.5" fill="currentColor" />
 <circle cx="170" cy="188" r="3.5" fill="currentColor" />
 </svg>
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

 <header className="mb-12 md:mb-16">
 <p className="inline-flex items-center gap-2.5 rounded-full border border-amber-700/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
 <span
 aria-hidden="true"
 className="h-1.5 w-1.5 rounded-full bg-amber-600 motion-safe:animate-pulse dark:bg-amber-400"
 />
 {content.eyebrow}
 </p>
 <h1 className="mt-6 max-w-4xl text-balance font-serif text-4xl font-medium leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
 {content.heading}
 </h1>
 <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 dark:text-stone-300 sm:text-lg">
 {content.intro}
 </p>
 <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
 <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
 <a href={BUSINESS.phoneHref} aria-label={BUSINESS.phoneDisplay}>
 <Phone className="size-4" />
 {copy.contact.callLabel}: {BUSINESS.phoneDisplay}
 </a>
 </Button>
 <Button variant="brand" asChild size="lg" className="w-full sm:w-auto">
 <a href={emailHref} aria-label={BUSINESS.email}>
 <Mail className="size-4" />
 {copy.contact.emailLabel}
 </a>
 </Button>
 </div>
 <div
 aria-hidden="true"
 className="mt-10 h-px bg-gradient-to-r from-amber-600/50 via-stone-300/70 to-transparent dark:from-amber-500/40 dark:via-stone-700/70"
 />
 </header>

 {content.cards && content.cards.length > 0 && (
 <section aria-label={content.heading} className="mb-14 md:mb-20">
 <ServiceCardGrid cards={content.cards} />
 </section>
 )}

 <div className="space-y-14 md:space-y-20">
 {content.sections.map((section) => (
 <section key={section.heading}>
 <div
 aria-hidden="true"
 className="mb-10 h-px bg-gradient-to-r from-amber-600/40 via-stone-300/60 to-transparent dark:from-amber-500/30 dark:via-stone-700/60"
 />
 <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
 <div>
 <h2 className="font-serif text-2xl font-medium text-foreground lg:text-3xl">
 {section.heading}
 </h2>
 <span
 aria-hidden="true"
 className="mt-4 block h-px w-12 bg-amber-600/60 dark:bg-amber-400/50"
 />
 </div>
 <div className="mt-6 lg:mt-0">
 {section.paragraphs?.map((paragraph) => (
 <p
 key={paragraph}
 className="mt-4 max-w-prose text-sm leading-7 text-stone-600 first:mt-0 dark:text-stone-300 sm:text-base"
 >
 {paragraph}
 </p>
 ))}
 {section.bullets && section.bullets.length > 0 && (
 <ul className="mt-5 space-y-3 rounded-2xl border border-stone-300/70 bg-white/60 p-5 backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-900/40 sm:p-6">
 {section.bullets.map((bullet) => (
 <li
 key={bullet}
 className="flex gap-3 text-sm leading-6 text-stone-700 dark:text-stone-300 sm:text-base"
 >
 <span
 aria-hidden="true"
 className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
 >
 <Check className="h-3.5 w-3.5" />
 </span>
 {bullet}
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 </section>
 ))}

 <section>
 <div
 aria-hidden="true"
 className="mb-10 h-px bg-gradient-to-r from-amber-600/40 via-stone-300/60 to-transparent dark:from-amber-500/30 dark:via-stone-700/60"
 />
 <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
 <h2 className="font-serif text-2xl font-medium text-foreground lg:text-3xl">
 {content.faqTitle}
 </h2>
 <Accordion
 type="single"
 collapsible
 className="mt-6 rounded-2xl border border-stone-300/70 bg-white/60 px-4 py-1 backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-900/40 sm:px-6 lg:mt-0"
 >
 {content.faqs.map((faq, index) => (
 <AccordionItem
 key={faq.question}
 value={`faq-${index}`}
 className="border-stone-200/80 last:border-b-0 dark:border-stone-700/70"
 >
 <AccordionTrigger className="text-left text-base text-stone-900 dark:text-stone-100">
 {faq.question}
 </AccordionTrigger>
 <AccordionContent className="text-sm leading-7 text-stone-600 dark:text-stone-300 sm:text-base">
 {faq.answer}
 </AccordionContent>
 </AccordionItem>
 ))}
 </Accordion>
 </div>
 </section>

 <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 p-6 text-stone-100 shadow-soft-lg sm:p-10 lg:p-14">
 <div
 aria-hidden="true"
 className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl"
 />
 <div
 aria-hidden="true"
 className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#f5efe4_0.7px,transparent_0.7px)] [background-size:16px_16px]"
 />
 <div className="relative">
 <h2 className="font-serif text-3xl font-medium text-stone-50 lg:text-4xl">
 {content.ctaTitle}
 </h2>
 <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
 {content.ctaBody}
 </p>
 <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
 <Button
 asChild
 variant="secondary"
 size="lg"
 className="w-full bg-white text-stone-900 hover:bg-stone-100 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200 sm:w-auto"
 >
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
 <p className="mt-4 text-xs text-stone-400">{BUSINESS.email}</p>
 </div>
 </section>
 </div>
 </div>
 </div>
 </>
 );
};
