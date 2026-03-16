import React from 'react';
import { Wrench } from 'lucide-react';

interface UnderConstructionProps {
  expectedDate?: string;
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({ expectedDate }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-8">
          <Wrench className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-stone-900 mb-4">
          Site Under Construction
        </h1>
        <p className="text-stone-500 text-base leading-relaxed">
          We're working hard to bring you something amazing!
        </p>
        {expectedDate && (
          <p className="mt-3 text-xs text-stone-400 tracking-wide uppercase">
            Expected completion: {expectedDate}
          </p>
        )}
        <div className="mt-10">
          <span className="inline-flex items-center px-6 py-2.5 border border-stone-900 text-sm font-medium rounded-md text-stone-900">
            Check back soon!
          </span>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
