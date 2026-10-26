import * as React from 'react';

import { cn } from '@/utils/cn.utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
 ({ className, ...props }, ref) => {
 return (
 <textarea
 className={cn(
 'flex min-h-[80px] w-full rounded-md border border-input bg-white dark:bg-stone-900 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-50 shadow-sm transition-all duration-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800',
 className
 )}
 ref={ref}
 {...props}
 />
 );
 }
);
Textarea.displayName = 'Textarea';

export { Textarea };
