import { useState, useEffect } from 'react';

interface PriceFilterProps {
  minPrice: number;
  maxPrice: number;
  selectedMin: number;
  selectedMax: number;
  onPriceChange: (min: number, max: number) => void;
}

export const PriceFilter: React.FC<PriceFilterProps> = ({
  minPrice,
  maxPrice,
  selectedMin,
  selectedMax,
  onPriceChange,
}) => {
  const [localMin, setLocalMin] = useState(selectedMin);
  const [localMax, setLocalMax] = useState(selectedMax);

  useEffect(() => {
    setLocalMin(selectedMin);
    setLocalMax(selectedMax);
  }, [selectedMin, selectedMax]);

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, localMax);
    setLocalMin(newMin);
    onPriceChange(newMin, localMax);
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, localMin);
    setLocalMax(newMax);
    onPriceChange(localMin, newMax);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minPrice;
    handleMinChange(value);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || maxPrice;
    handleMaxChange(value);
  };

  return (
    <div className="space-y-4">
      <div className="px-2">
        <div className="relative pt-1">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={localMin}
            onChange={(e) => handleMinChange(parseInt(e.target.value))}
            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-20"
            style={{
              background: 'transparent',
            }}
          />
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={localMax}
            onChange={(e) => handleMaxChange(parseInt(e.target.value))}
            className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none z-20"
            style={{
              background: 'transparent',
            }}
          />
          <div className="relative w-full h-2 bg-stone-200 rounded-full">
            <div
              className="absolute h-2 bg-amber-500 rounded-full"
              style={{
                left: `${((localMin - minPrice) / (maxPrice - minPrice)) * 100}%`,
                right: `${100 - ((localMax - minPrice) / (maxPrice - minPrice)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-600 mb-1">Min</label>
          <input
            type="number"
            value={localMin}
            onChange={handleMinInputChange}
            min={minPrice}
            max={localMax}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-600 mb-1">Max</label>
          <input
            type="number"
            value={localMax}
            onChange={handleMaxInputChange}
            min={localMin}
            max={maxPrice}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>{minPrice} RON</span>
        <span>{maxPrice} RON</span>
      </div>
    </div>
  );
};
