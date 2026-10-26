import type React from 'react';

import { cn } from '@/utils/cn.utils';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
 return (
 <div
 className={cn('animate-pulse rounded-md bg-stone-200 dark:bg-stone-700 ', className)}
 {...props}
 />
 );
};

export { Skeleton };
