import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn.utils';

const badgeVariants = cva(
 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40',
 {
 variants: {
 variant: {
 default: 'bg-primary text-primary-foreground',
 secondary: 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900',
 soft: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 ',
 destructive: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 ',
 warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 ',
 success: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 ',
 emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 ',
 blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ',
 yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 ',
 amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 ',
 stone: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 ',
 outline: 'border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 ',
 },
 },
 defaultVariants: {
 variant: 'default',
 },
 }
);

export interface BadgeProps
 extends React.HTMLAttributes<HTMLDivElement>,
 VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
 return (
 <div className={cn(badgeVariants({ variant }), className)} {...props} />
 );
};

export { Badge, badgeVariants };
