import * as React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

import { cn } from '@/utils/cn.utils';

const Spinner = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <Loader2
      ref={ref}
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
);
Spinner.displayName = 'Spinner';

export { Spinner };
