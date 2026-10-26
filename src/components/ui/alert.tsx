import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn.utils';

const alertVariants = cva(
 'relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5',
 {
 variants: {
 variant: {
 default: 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-foreground',
 warning: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 [&>svg]:text-amber-800 dark:[&>svg]:text-amber-300',
 destructive: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 [&>svg]:text-red-700 dark:[&>svg]:text-red-400',
 success: 'border-green-300 bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 [&>svg]:text-green-700 dark:[&>svg]:text-green-400',
 info: 'border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 [&>svg]:text-stone-600 dark:[&>svg]:text-stone-300',
 },
 },
 defaultVariants: {
 variant: 'default',
 },
 }
);

const Alert = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
 <div
 ref={ref}
 role="alert"
 className={cn(alertVariants({ variant }), className)}
 {...props}
 />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
 ({ className, ...props }, ref) => (
 <h5
 ref={ref}
 className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
 {...props}
 />
 )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn('text-sm [&_p]:leading-relaxed', className)}
 {...props}
 />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
