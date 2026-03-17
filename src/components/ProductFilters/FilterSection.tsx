import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-stone-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-1 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-medium text-stone-900 text-sm uppercase tracking-wide">
          {title}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-stone-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 pb-4' : 'max-h-0'
        }`}
      >
        <div className="px-1">{children}</div>
      </div>
    </div>
  );
};
