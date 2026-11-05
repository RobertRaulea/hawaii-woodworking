import { useState } from 'react';
import type React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { ProductThumb } from '../ProductThumb';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/cn.utils';

interface SearchableSelectProps {
  label: string;
  id: string;
  options: readonly string[];
  optionImages?: ReadonlyMap<string, string | null | undefined>;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  id,
  options,
  optionImages,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder = 'Selectează...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  // Controlled so the list opens with the chosen option highlighted and scrolled into view.
  const [highlighted, setHighlighted] = useState(value);
  const labelId = `${id}-label`;
  const hasLabel = label.trim().length > 0;

  const handleOpenChange = (next: boolean) => {
    if (next) setHighlighted(value);
    setOpen(next);
    if (!next) onBlur?.();
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    handleOpenChange(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      handleOpenChange(true);
    }
  };

  return (
    <div>
      <label
        id={labelId}
        htmlFor={id}
        className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <Popover modal open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-labelledby={hasLabel ? labelId : undefined}
            aria-label={hasLabel ? undefined : placeholder}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-white dark:bg-stone-900 px-3.5 py-2.5 text-left text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800',
              error
                ? 'border-red-400 focus-visible:ring-red-400/40'
                : 'border-input focus-visible:border-ring focus-visible:ring-ring/40',
            )}
          >
            <span
              className={cn(
                'truncate',
                value
                  ? 'text-stone-900 dark:text-stone-50'
                  : 'text-stone-400 dark:text-stone-500',
              )}
            >
              {value || placeholder}
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-stone-400 dark:text-stone-500"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] rounded-md p-0"
        >
          <Command
            label={label}
            value={highlighted}
            onValueChange={setHighlighted}
            className="bg-transparent"
          >
            <CommandInput placeholder="Caută..." autoComplete="off" />
            <CommandList className="max-h-60">
              <CommandEmpty>Niciun rezultat</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => handleSelect(opt)}
                    className={cn(
                      'cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-amber-50 dark:data-[selected=true]:bg-amber-950/60 data-[selected=true]:text-amber-900 dark:data-[selected=true]:text-amber-300',
                      opt === value && 'bg-amber-100/50 dark:bg-amber-900/40 font-medium',
                    )}
                  >
                    {optionImages && (
                      <ProductThumb src={optionImages.get(opt)} alt="" className="size-8" />
                    )}
                    <span className="flex-1">{opt}</span>
                    {opt === value && <Check className="ml-auto" aria-hidden="true" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
