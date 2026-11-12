import type React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Images } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { CustomWork } from './customWork.types';
import { formatWorkPrice } from './customWork.utils';

interface WorkCardProps {
 work: CustomWork;
 index: number;
 onSelect: () => void;
}

export const WorkCard: React.FC<WorkCardProps> = ({ work, index, onSelect }) => {
 const { t } = useTranslation();

 return (
 <article
 className="motion-safe:animate-fade-in-up"
 style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
 >
 <Card className="group relative h-full overflow-hidden border-stone-300/70 bg-white/70 shadow-none transition duration-300 hover:shadow-soft-lg dark:border-stone-700/70 dark:bg-stone-900/70">
 <div className="relative aspect-[4/5] overflow-hidden bg-stone-200 dark:bg-stone-800 sm:aspect-[4/3]">
 <img
 src={work.images[0] ?? work.url}
 alt={work.alt}
 className="h-full w-full object-cover transition duration-700 motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-within:scale-[1.04]"
 loading="lazy"
 />
 <Badge className="absolute left-3 top-3 bg-[#f5f1e9]/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-700 dark:bg-[#1a1511]/95 dark:text-stone-300">
 {t('customWork.madeToOrder')}
 </Badge>
 {work.images.length > 1 && (
 <Badge className="absolute right-3 top-3 gap-1 bg-stone-950/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
 <Images className="size-3" aria-hidden="true" />
 {t('customWork.photoCount', { count: work.images.length })}
 </Badge>
 )}
 <div
 aria-hidden="true"
 className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-stone-950/70 to-transparent p-4 pt-10 opacity-0 transition duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
 >
 <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white motion-safe:translate-y-1 motion-safe:transition motion-safe:duration-300 motion-safe:group-focus-within:translate-y-0 motion-safe:group-hover:translate-y-0">
 {t('customWork.viewDetails')}
 <ArrowRight className="size-3.5" />
 </span>
 </div>
 </div>
 <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
 <div className="min-w-0">
 <h2 className="font-serif text-xl text-foreground sm:text-2xl">{work.title}</h2>
 <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
 {work.description || t('customWork.legacyDescription')}
 </p>
 </div>
 <span className="shrink-0 pt-1 text-right text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300 sm:text-sm">
 {formatWorkPrice(work.price) ?? t('customWork.priceOnRequest')}
 </span>
 </div>
 <button
 type="button"
 onClick={onSelect}
 aria-label={`${t('customWork.viewDetails')}: ${work.title}`}
 className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 dark:focus-visible:ring-amber-400"
 />
 </Card>
 </article>
 );
};
