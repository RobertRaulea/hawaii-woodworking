import * as React from 'react';

import {
 Select,
 SelectContent,
 SelectGroup,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn.utils';

export interface OptionSelectOption {
 value: string;
 label: React.ReactNode;
 disabled?: boolean;
}

export interface OptionSelectProps {
 id?: string;
 value: string;
 onValueChange: (value: string) => void;
 options: ReadonlyArray<OptionSelectOption>;
 placeholder?: string;
 disabled?: boolean;
 invalid?: boolean;
 className?: string;
 wrapperClassName?: string;
 name?: string;
 required?: boolean;
 autoComplete?: string;
 'aria-label'?: string;
 'aria-labelledby'?: string;
 'aria-describedby'?: string;
}

// Radix SelectItem forbids an empty-string value; '' maps both ways through
// this sentinel so callers can keep '' for "no selection"/"all".
const EMPTY_SENTINEL = '__empty__';

const toInternal = (value: string) => (value === '' ? EMPTY_SENTINEL : value);
const toExternal = (value: string) => (value === EMPTY_SENTINEL ? '' : value);

const OptionSelect = ({
 id,
 value,
 onValueChange,
 options,
 placeholder,
 disabled,
 invalid,
 className,
 wrapperClassName,
 name,
 required,
 autoComplete,
 'aria-label': ariaLabel,
 'aria-labelledby': ariaLabelledby,
 'aria-describedby': ariaDescribedby,
}: OptionSelectProps) => {
 const handleChange = (next: string) => onValueChange(toExternal(next));

 // When '' is a real option, the sentinel item stays selectable; otherwise
 // pass no value so the placeholder renders instead of an empty trigger.
 const hasEmptyOption = options.some((option) => option.value === '');
 const internalValue =
 value === undefined || (value === '' && !hasEmptyOption)
 ? undefined
 : toInternal(value);

 return (
 <div className={cn('relative', wrapperClassName)}>
 <Select
 value={internalValue}
 autoComplete={autoComplete}
 onValueChange={handleChange}
 disabled={disabled}
 name={name}
 required={required}
 >
 <SelectTrigger
 id={id}
 aria-label={ariaLabel}
 aria-labelledby={ariaLabelledby}
 aria-describedby={ariaDescribedby}
 aria-invalid={invalid ? true : undefined}
 className={cn(
 'data-[placeholder]:text-stone-400 dark:data-[placeholder]:text-stone-500',
 invalid && 'border-destructive',
 className
 )}
 >
 <SelectValue placeholder={placeholder} />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 {options.map((option) => (
 <SelectItem
 key={toInternal(option.value)}
 value={toInternal(option.value)}
 disabled={option.disabled}
 >
 {option.label}
 </SelectItem>
 ))}
 </SelectGroup>
 </SelectContent>
 </Select>
 </div>
 );
};

export { OptionSelect };
