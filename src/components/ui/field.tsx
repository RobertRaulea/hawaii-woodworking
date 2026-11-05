import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/cn.utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    data-slot="field-set"
    className={cn(
      'flex flex-col gap-6',
      'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
      className
    )}
    {...props}
  />
));
FieldSet.displayName = 'FieldSet';

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement> & { variant?: 'legend' | 'label' }
>(({ className, variant = 'legend', ...props }, ref) => (
  <legend
    ref={ref}
    data-slot="field-legend"
    data-variant={variant}
    className={cn(
      'mb-3 font-medium',
      'data-[variant=legend]:text-base',
      'data-[variant=label]:text-sm',
      className
    )}
    {...props}
  />
));
FieldLegend.displayName = 'FieldLegend';

// Tailwind v3: the registry's `@container/field-group` is replaced by
// viewport breakpoints (`md:`) because no container-queries plugin is installed.
const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="field-group"
    className={cn(
      'group/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
      className
    )}
    {...props}
  />
));
FieldGroup.displayName = 'FieldGroup';

const fieldVariants = cva(
  'group/field data-[invalid=true]:text-destructive flex w-full gap-3',
  {
    variants: {
      orientation: {
        vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
        horizontal: [
          'flex-row items-center',
          '[&>[data-slot=field-label]]:flex-auto',
          'has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start',
        ],
        responsive: [
          'md:flex-row md:items-center md:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto',
          'md:[&>[data-slot=field-label]]:flex-auto',
          'md:has-[>[data-slot=field-content]]:items-start md:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  }
);

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof fieldVariants>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    data-slot="field"
    data-orientation={orientation}
    className={cn(fieldVariants({ orientation }), className)}
    {...props}
  />
));
Field.displayName = 'Field';

const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="field-content"
    className={cn(
      'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
      className
    )}
    {...props}
  />
));
FieldContent.displayName = 'FieldContent';

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label> & { variant?: 'default' | 'caps' }
>(({ className, variant = 'default', ...props }, ref) => (
  <Label
    ref={ref}
    data-slot="field-label"
    className={cn(
      variant === 'default' && [
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>[data-slot=field]]:p-4',
        // Tailwind v3: `has-data-[state=checked]:` (v4 shorthand) needs the explicit `has-[[...]]` form.
        'has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary dark:has-[[data-state=checked]]:bg-primary/10',
      ],
      variant === 'caps' &&
        'block w-full text-xs font-medium uppercase leading-4 tracking-wide text-stone-500 dark:text-stone-400 mb-1.5',
      className
    )}
    {...props}
  />
));
FieldLabel.displayName = 'FieldLabel';

const FieldTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="field-label"
    className={cn(
      'flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50',
      className
    )}
    {...props}
  />
));
FieldTitle.displayName = 'FieldTitle';

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="field-description"
    className={cn(
      'text-muted-foreground text-sm font-normal leading-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
      // Tailwind v3: v4's `nth-last-2:` is written as an arbitrary variant.
      '[&:nth-last-child(2)]:-mt-1 last:mt-0 [[data-variant=legend]+&]:-mt-1.5',
      '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
      className
    )}
    {...props}
  />
));
FieldDescription.displayName = 'FieldDescription';

const FieldSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="field-separator"
    data-content={!!children}
    className={cn(
      'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
      className
    )}
    {...props}
  >
    <Separator className="absolute inset-0 top-1/2" />
    {children && (
      <span
        className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
        data-slot="field-separator-content"
      >
        {children}
      </span>
    )}
  </div>
));
FieldSeparator.displayName = 'FieldSeparator';

const FieldError = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    errors?: Array<{ message?: string } | undefined>;
  }
>(({ className, children, errors, ...props }, ref) => {
  const content = React.useMemo(() => {
    if (children) {
      return children;
    }

    // Registry rendered an empty role="alert" for `errors={[]}`; ignore entries without a message.
    const messages = (errors ?? []).filter((error) => error?.message);

    if (messages.length === 0) {
      return null;
    }

    if (messages.length === 1) {
      return messages[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((error, index) => (
          <li key={index}>{error?.message}</li>
        ))}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="alert"
      data-slot="field-error"
      className={cn('text-destructive text-sm font-normal', className)}
      {...props}
    >
      {content}
    </div>
  );
});
FieldError.displayName = 'FieldError';

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
