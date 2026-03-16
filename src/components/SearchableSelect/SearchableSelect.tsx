import { useState, useRef, useEffect, useCallback } from 'react';
import type React from 'react';

interface SearchableSelectProps {
  label: string;
  id: string;
  options: readonly string[];
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = search
    ? options.filter((opt) =>
        opt.toLowerCase().includes(search.toLowerCase())
      )
    : [...options];

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
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

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  const displayValue = isOpen ? search : value;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
        }
        autoComplete="off"
        disabled={disabled}
        placeholder={value || placeholder}
        value={displayValue}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors bg-white ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-stone-300'
        } ${disabled ? 'bg-stone-100 cursor-not-allowed' : ''}`}
        onFocus={() => {
          setIsOpen(true);
          setSearch('');
        }}
        onChange={(e) => {
          setSearch(e.target.value);
          setHighlightedIndex(0);
          if (!isOpen) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      <svg
        className={`pointer-events-none absolute right-3 top-[2.15rem] h-4 w-4 text-stone-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>

      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-400">
              Niciun rezultat
            </li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt}
                id={`${id}-option-${idx}`}
                role="option"
                aria-selected={opt === value}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  idx === highlightedIndex
                    ? 'bg-amber-50 text-amber-900'
                    : opt === value
                      ? 'bg-amber-100/50 text-stone-900'
                      : 'text-stone-700 hover:bg-stone-50'
                }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};
