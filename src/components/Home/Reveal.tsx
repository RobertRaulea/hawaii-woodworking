import type React from 'react';
import type { ElementType } from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/utils/cn.utils';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  as?: ElementType;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  as,
}) => {
  const Component: ElementType = as ?? 'div';
  const { ref, inView } = useInView<Element>({ threshold: 0.15, once: true });

  return (
    <Component
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
};
