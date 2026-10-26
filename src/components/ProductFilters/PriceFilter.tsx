import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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

 return (
 <div className="space-y-4">
 <div className="px-2.5 pt-1">
 <Slider
 min={minPrice}
 max={maxPrice}
 step={1}
 value={[localMin, localMax]}
 minStepsBetweenThumbs={1}
 onValueChange={([newMin, newMax]) => {
 setLocalMin(newMin);
 setMinInputVal(String(newMin));
 setLocalMax(newMax);
 setMaxInputVal(String(newMax));
 onPriceChange(newMin, newMax);
 }}
 thumbLabels={['Minimum price', 'Maximum price']}
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label
 htmlFor="price-min"
 className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5 font-medium uppercase tracking-wide"
 >
 Min
 </Label>
 <Input
 id="price-min"
 type="number"
 value={minInputVal}
 onChange={(e) => setMinInputVal(e.target.value)}
 onBlur={commitMin}
 onKeyDown={(e) => e.key === 'Enter' && commitMin()}
 min={minPrice}
 max={localMax - 1}
 className="h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 px-3 py-2 text-sm"
 />
 </div>
 <div>
 <Label
 htmlFor="price-max"
 className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5 font-medium uppercase tracking-wide"
 >
 Max
 </Label>
 <Input
 id="price-max"
 type="number"
 value={maxInputVal}
 onChange={(e) => setMaxInputVal(e.target.value)}
 onBlur={commitMax}
 onKeyDown={(e) => e.key === 'Enter' && commitMax()}
 min={localMin + 1}
 max={maxPrice}
 className="h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 px-3 py-2 text-sm"
 />
 </div>
 </div>

 <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 px-1">
 <span>{minPrice} RON</span>
 <span>{maxPrice} RON</span>
 </div>
 </div>
 );
};
