import { useState, useRef, useEffect, useCallback } from 'react';
import type React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { ProductThumb } from '../ProductThumb';
import {
 Command,
 CommandEmpty,
 CommandGroup,
 CommandInput,
 CommandItem,
 CommandList,
} from '@/components/ui/command';
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
 const [isOpen, setIsOpen] = useState(false);
 const [search, setSearch] = useState('');
 const containerRef = useRef<HTMLDivElement>(null);

 const close = useCallback(() => {
 setIsOpen(false);
 setSearch('');
 }, []);

 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
 close();
 onBlur?.();
 }
 };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, [close, onBlur]);

 const handleSelect = (opt: string) => {
 onChange(opt);
 close();
 };

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
 e.preventDefault();
 setIsOpen(true);
 return;
 }
 if (isOpen && e.key === 'Escape') {
 e.preventDefault();
 close();
 }
 };

 return (
 <div ref={containerRef} className="relative">
 <Command label={label} className="h-auto overflow-visible bg-transparent">
 <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 tracking-wide uppercase">
 {label}
 {required && <span className="text-red-500 ml-0.5">*</span>}
 <CommandInput
 bare
 id={id}
 autoComplete="off"
 disabled={disabled}
 placeholder={value || placeholder}
 value={isOpen ? search : value}
 onValueChange={(next) => {
 setSearch(next);
 if (!isOpen) setIsOpen(true);
 }}
 onFocus={() => {
 setIsOpen(true);
 setSearch('');
 }}
 onKeyDown={handleKeyDown}
 className={`mt-1.5 h-auto w-full rounded-md border px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200 bg-white dark:bg-stone-900 ${
 error ? 'border-red-400 focus:ring-red-400/40' : 'border-stone-300 dark:border-stone-600 '
 } ${disabled ? 'bg-stone-100 dark:bg-stone-800 cursor-not-allowed' : ''}`}
 />
 </label>
 <ChevronsUpDown
 className={`pointer-events-none absolute right-3 top-[2.4rem] h-4 w-4 text-stone-400 dark:text-stone-500 transition-transform ${
 isOpen ? 'rotate-180' : ''
 }`}
 />
 {isOpen && (
 <CommandList className="absolute z-50 mt-1 max-h-60 w-full rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-lg">
 <CommandEmpty className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500 ">
 Niciun rezultat
 </CommandEmpty>
 <CommandGroup>
 {options.map((opt) => (
 <CommandItem
 key={opt}
 value={opt}
 onSelect={() => handleSelect(opt)}
 onMouseDown={(e) => e.preventDefault()}
 className={cn(
 'cursor-pointer px-3 py-2 text-sm transition-colors data-[selected=true]:bg-amber-50 dark:data-[selected=true]:bg-amber-950/60 data-[selected=true]:text-amber-900 dark:data-[selected=true]:text-amber-300',
 opt === value
 ? 'bg-amber-100/50 dark:bg-amber-900/40 text-stone-900 dark:text-stone-50 '
 : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800',
 )}
 >
 {optionImages ? (
 <span className="flex items-center gap-2.5">
 <ProductThumb
 src={optionImages.get(opt)}
 alt={opt}
 className="h-8 w-8"
 />
 {opt}
 </span>
 ) : (
 opt
 )}
 </CommandItem>
 ))}
 </CommandGroup>
 </CommandList>
 )}
 </Command>
 {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{error}</p>}
 </div>
 );
};
