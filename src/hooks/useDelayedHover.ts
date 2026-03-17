import { useState, useRef, useCallback } from 'react';

interface UseDelayedHoverReturn {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  setIsOpen: (value: boolean) => void;
}

export function useDelayedHover(delay: number = 150): UseDelayedHoverReturn {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, delay);
  }, [delay]);

  return {
    isOpen,
    onMouseEnter,
    onMouseLeave,
    setIsOpen,
  };
}
