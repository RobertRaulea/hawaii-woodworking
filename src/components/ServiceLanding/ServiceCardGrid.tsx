import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn.utils';
import type { LandingPage } from '../../../shared/seo/marketing';

const CARD_EMOJI: Record<string, string> = {
 '/servicii/prelucrare-cnc-lemn': '⚙️',
 '/produse-personalizate': '🎁',
 '/servicii/debitare-circular': '🪚',
 '/servicii/panouri-lemn-masiv-lamela-continua': '🪵',
 '/products': '🛒',
};

interface ServiceCardGridProps {
 cards: LandingPage['cards'];
 className?: string;
}

export const ServiceCardGrid: React.FC<ServiceCardGridProps> = ({ cards, className }) => {
 if (!cards || cards.length === 0) {
 return null;
 }
 const hasFeatured = cards.length % 3 === 2;

 return (
 <ul className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6', className)}>
 {cards.map((card, index) => {
 const emoji = CARD_EMOJI[card.href] ?? '🪵';
 const featured = hasFeatured && index === 0;
 return (
 <li
 key={card.href}
 className={cn('h-full motion-safe:animate-fade-in-up', featured && 'sm:col-span-2 lg:col-span-2')}
 style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
 >
 <Link
 to={card.href}
 className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white/70 p-6 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out hover:-translate-y-1 hover:border-amber-600/70 hover:bg-white/90 hover:shadow-[0_18px_45px_-18px_rgba(180,120,40,0.5)] motion-safe:hover:-rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-stone-700/60 dark:bg-stone-900/50 dark:hover:border-amber-500/60 dark:hover:bg-stone-900/70 dark:hover:shadow-[0_18px_45px_-15px_rgba(217,160,60,0.3)] sm:p-7"
 >
 <span
 aria-hidden="true"
 className="pointer-events-none absolute -left-1/2 bottom-0 top-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:translate-x-[450%] dark:via-amber-300/15"
 />
 <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-600/20 transition-transform duration-300 motion-safe:group-hover:scale-110 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">
 <span aria-hidden="true" className="text-xl leading-none motion-safe:group-hover:animate-wiggle">
 {emoji}
 </span>
 </span>
 <span
 className={cn(
 'mt-5 font-serif text-xl font-medium leading-snug text-foreground sm:text-2xl',
 featured && 'lg:text-3xl',
 )}
 >
 {card.title}
 </span>
 <span className="mt-3 flex-1 text-sm leading-6 text-stone-600 dark:text-stone-300">
 {card.body}
 </span>
 <span className="mt-6 flex items-center justify-between gap-4">
 <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 transition-colors group-hover:text-amber-600 dark:text-amber-300 dark:group-hover:text-amber-200">
 {card.linkLabel}
 </span>
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-700/30 text-amber-700 transition-[transform,border-color,background-color,color] duration-300 group-hover:translate-x-1 group-hover:border-amber-600 group-hover:bg-amber-600 group-hover:text-white dark:border-amber-400/30 dark:text-amber-300 dark:group-hover:border-amber-400 dark:group-hover:bg-amber-500 dark:group-hover:text-stone-900">
 <ArrowRight aria-hidden="true" className="h-4 w-4" />
 </span>
 </span>
 </Link>
 </li>
 );
 })}
 </ul>
 );
};
