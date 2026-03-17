import React from 'react';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface UnderConstructionProps {
  expectedDate?: string;
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({ expectedDate }) => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-6 relative"
      style={{
        backgroundImage: 'url(/images/wood-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="text-center max-w-md relative z-10">
        <div className="w-16 h-16 rounded-full bg-amber-500/90 flex items-center justify-center mx-auto mb-8">
          <WrenchScrewdriverIcon className="h-7 w-7 text-white" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-white mb-4">
          Site Under Construction
        </h1>
        <p className="text-stone-200 text-base leading-relaxed">
          We're working hard to bring you something amazing!
        </p>
        {expectedDate && (
          <p className="mt-3 text-xs text-stone-300 tracking-wide uppercase">
            Expected completion: {expectedDate}
          </p>
        )}
        <div className="mt-10">
          <span className="inline-flex items-center px-6 py-2.5 border border-white text-sm font-medium rounded-md text-white hover:bg-white/10 transition-colors">
            Check back soon!
          </span>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
