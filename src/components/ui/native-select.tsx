import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/utils/cn.utils';

export interface NativeSelectProps
 extends React.SelectHTMLAttributes<HTMLSelectElement> {
 // Sizing and spacing for the outer wrapper (e.g. "w-full mt-1"). The
 // chevron is positioned relative to this wrapper, so margins that used to
 // live on the <select> belong here.
 wrapperClassName?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
 ({ className, wrapperClassName, children, ...props }, ref) => (
 <div className={cn('relative w-fit', wrapperClassName)}>
 <select
 ref={ref}
 className={cn(
 'min-h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-white dark:bg-stone-900 px-3.5 py-2.5 pr-9 text-sm text-stone-900 dark:text-stone-50 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800 aria-invalid:border-destructive',
 className
 )}
 {...props}
 >
 {children}
 </select>
 <ChevronDown
 aria-hidden="true"
 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
 />
 </div>
 )
);
NativeSelect.displayName = 'NativeSelect';

const NativeSelectOption = React.forwardRef<
 HTMLOptionElement,
 React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
 <option ref={ref} className={className} {...props} />
));
NativeSelectOption.displayName = 'NativeSelectOption';

const NativeSelectOptGroup = React.forwardRef<
 HTMLOptGroupElement,
 React.OptgroupHTMLAttributes<HTMLOptGroupElement>
>(({ className, ...props }, ref) => (
 <optgroup
 ref={ref}
 className={cn('bg-white dark:bg-stone-900', className)}
 {...props}
 />
));
NativeSelectOptGroup.displayName = 'NativeSelectOptGroup';

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup };
