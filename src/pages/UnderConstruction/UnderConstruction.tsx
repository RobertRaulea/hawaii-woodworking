import React from 'react';
import { Wrench } from 'lucide-react';

interface UnderConstructionProps {
  expectedDate?: string;
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({ expectedDate }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="flex justify-center">
          <Wrench className="h-24 w-24 text-yellow-500 animate-bounce" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
          Site Under Construction
        </h1>
        <p className="mt-4 text-base text-gray-600 sm:text-lg md:text-xl">
          We're working hard to bring you something amazing!
        </p>
        {expectedDate && (
          <p className="mt-2 text-sm text-gray-500">
            Expected completion: {expectedDate}
          </p>
        )}
        <div className="mt-8">
          <div className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 transition-colors duration-300">
            Check back soon!
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
