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
  const [minInputVal, setMinInputVal] = useState(String(selectedMin));
  const [maxInputVal, setMaxInputVal] = useState(String(selectedMax));

  useEffect(() => {
    setLocalMin(selectedMin);
    setLocalMax(selectedMax);
    setMinInputVal(String(selectedMin));
    setMaxInputVal(String(selectedMax));
  }, [selectedMin, selectedMax]);

  const range = maxPrice - minPrice || 1;
  const leftPct = ((localMin - minPrice) / range) * 100;
  const rightPct = 100 - ((localMax - minPrice) / range) * 100;

  const handleMinSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value);
    const newMin = Math.min(raw, localMax - 1);
    setLocalMin(newMin);
    setMinInputVal(String(newMin));
    onPriceChange(newMin, localMax);
  };

  const handleMaxSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value);
    const newMax = Math.max(raw, localMin + 1);
    setLocalMax(newMax);
    setMaxInputVal(String(newMax));
    onPriceChange(localMin, newMax);
  };

  const commitMin = () => {
    const parsed = parseInt(minInputVal);
    const clamped = isNaN(parsed)
      ? minPrice
      : Math.max(minPrice, Math.min(parsed, localMax - 1));
    setLocalMin(clamped);
    setMinInputVal(String(clamped));
    onPriceChange(clamped, localMax);
  };

  const commitMax = () => {
    const parsed = parseInt(maxInputVal);
    const clamped = isNaN(parsed)
      ? maxPrice
      : Math.min(maxPrice, Math.max(parsed, localMin + 1));
    setLocalMax(clamped);
    setMaxInputVal(String(clamped));
    onPriceChange(localMin, clamped);
  };

  const thumbBase =
    'absolute w-full h-0 appearance-none bg-transparent cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:shadow-md';

  return (
    <div className="space-y-4">
      <div className="px-2.5 pt-1">
        <div className="relative h-5 flex items-center">
          <div className="absolute w-full h-1.5 bg-stone-200 rounded-full">
            <div
              className="absolute h-full bg-amber-500 rounded-full"
              style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
            />
          </div>

          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={1}
            value={localMin}
            onChange={handleMinSlider}
            className={`${thumbBase} ${localMin >= localMax - 1 ? 'z-30' : 'z-20'}`}
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={1}
            value={localMax}
            onChange={handleMaxSlider}
            className={`${thumbBase} z-20`}
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1.5 font-medium uppercase tracking-wide">Min</label>
          <input
            type="number"
            value={minInputVal}
            onChange={(e) => setMinInputVal(e.target.value)}
            onBlur={commitMin}
            onKeyDown={(e) => e.key === 'Enter' && commitMin()}
            min={minPrice}
            max={localMax - 1}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1.5 font-medium uppercase tracking-wide">Max</label>
          <input
            type="number"
            value={maxInputVal}
            onChange={(e) => setMaxInputVal(e.target.value)}
            onBlur={commitMax}
            onKeyDown={(e) => e.key === 'Enter' && commitMax()}
            min={localMin + 1}
            max={maxPrice}
            className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-400 px-1">
        <span>{minPrice} RON</span>
        <span>{maxPrice} RON</span>
      </div>
    </div>
  );
};
