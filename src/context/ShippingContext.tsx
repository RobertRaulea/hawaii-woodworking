import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ShippingFormData, ShippingContextType } from '../types/shipping.types';

const STORAGE_KEY = 'shipping_data';

const ShippingContext = createContext<ShippingContextType | undefined>(undefined);

export const ShippingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shippingData, setShippingDataState] = useState<ShippingFormData | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (shippingData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shippingData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [shippingData]);

  const setShippingData = (data: ShippingFormData) => {
    setShippingDataState(data);
  };

  const clearShippingData = () => {
    setShippingDataState(null);
  };

  return (
    <ShippingContext.Provider value={{ shippingData, setShippingData, clearShippingData }}>
      {children}
    </ShippingContext.Provider>
  );
};

export const useShipping = () => {
  const context = useContext(ShippingContext);
  if (context === undefined) {
    throw new Error('useShipping must be used within a ShippingProvider');
  }
  return context;
};
