import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/utils/cn.utils';

interface SliderProps
 extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
 /** Optional aria-label for each thumb, in value order. */
 thumbLabels?: string[];
}

const Slider = React.forwardRef<
 React.ElementRef<typeof SliderPrimitive.Root>,
 SliderProps
>(({ className, thumbLabels, value, defaultValue, ...props }, ref) => {
 const thumbCount = (value ?? defaultValue ?? [0]).length || 1;
 return (
 <SliderPrimitive.Root
 ref={ref}
 className={cn(
 'relative flex w-full touch-none select-none items-center',
 className
 )}
 value={value}
 defaultValue={defaultValue}
 {...props}
 >
 <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700 ">
 <SliderPrimitive.Range className="absolute h-full bg-amber-500" />
 </SliderPrimitive.Track>
 {Array.from({ length: thumbCount }, (_, index) => (
 <SliderPrimitive.Thumb
 key={index}
 aria-label={thumbLabels?.[index]}
 className="block h-5 w-5 rounded-full border-2 border-amber-500 bg-white dark:bg-stone-900 shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
 />
 ))}
 </SliderPrimitive.Root>
 );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
