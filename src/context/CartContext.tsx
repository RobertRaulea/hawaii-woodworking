import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { Toast } from '../components/Toast/Toast';
import type { CartItem, CartState, CartAction, CartContextType } from '../types/cart.types';

export type { CartItem } from '../types/cart.types';

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, () => {
    // Initialize state from localStorage
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : { items: [] };
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const totalItems = state.items.reduce((total, item) => total + item.quantity, 0);

  // Save to localStorage whenever cart state changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  const addItem = (item: Omit<CartItem, 'quantity'>, stock?: number, trackStock?: boolean): boolean => {
    // Check if stock tracking is enabled (default to true if undefined)
    const isTrackingStock = trackStock ?? true;
    
    if (!isTrackingStock) {
      dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: 1, stock, trackStock } });
      setToastMessage(`${item.name} a fost adăugat în coș`);
      setShowToast(true);
      return true;
    }

    // Get current quantity in cart
    const existingItem = state.items.find(cartItem => cartItem.id === item.id);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
    const availableStock = stock ?? 0;

    // Check if adding one more would exceed stock
    if (currentQuantityInCart + 1 > availableStock) {
      setToastMessage(`Stoc insuficient! Doar ${availableStock} disponibil${availableStock !== 1 ? 'e' : ''}.`);
      setShowToast(true);
      return false;
    }

    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity: 1, stock, trackStock } });
    setToastMessage(`${item.name} a fost adăugat în coș`);
    setShowToast(true);
    return true;
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      return;
    }

    const item = state.items.find(cartItem => cartItem.id === id);
    if (!item) {
      return;
    }

    // Check if stock tracking is enabled (default to true if undefined)
    const isTrackingStock = item.trackStock ?? true;
    
    if (!isTrackingStock) {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
      return;
    }

    const availableStock = item.stock ?? 0;
    
    // Prevent exceeding available stock
    if (quantity > availableStock) {
      setToastMessage(`Stoc insuficient! Doar ${availableStock} disponibil${availableStock !== 1 ? 'e' : ''}.`);
      setShowToast(true);
      return;
    }

    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    localStorage.removeItem('cart');
  };

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQuantity, clearCart, totalItems }}>
      {children}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
