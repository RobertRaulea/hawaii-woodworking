import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn.utils';

const buttonVariants = cva(
 "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium select-none transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
 {
 variants: {
 variant: {
 default: 'bg-primary text-primary-foreground shadow-sm hover:bg-amber-800',
 secondary: 'bg-stone-900 text-white shadow-sm hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
 soft: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shadow-sm hover:bg-stone-200 dark:hover:bg-stone-700',
 destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-red-700',
 outline:
 'border border-input bg-transparent shadow-sm hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-50',
 ghost: 'hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-50',
 link: 'text-primary underline-offset-4 hover:underline',
 },
 size: {
 default: 'min-h-11 px-4 py-2 text-sm',
 sm: 'min-h-9 rounded-lg px-3 text-xs',
 lg: 'min-h-12 px-6',
 xl: 'min-h-12 px-4 py-3 text-sm',
 '2xl': 'min-h-14 px-4 py-3 text-base font-semibold',
 icon: 'h-11 w-11',
 },
 },
 defaultVariants: {
 variant: 'default',
 size: 'default',
 },
 }
);

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
 const Comp = asChild ? Slot : 'button';
 return (
 <Comp
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 );
 }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
