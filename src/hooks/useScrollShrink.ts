import { useState, useEffect, useRef } from 'react';

interface UseScrollShrinkOptions {
  shrinkThreshold?: number;
  expandThreshold?: number;
  debounceMs?: number;
}

export function useScrollShrink(options: UseScrollShrinkOptions = {}) {
  const {
    shrinkThreshold = 20,
    expandThreshold = 5,
    debounceMs = 50,
  } = options;

  const [scrolled, setScrolled] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (timeoutRef.current) return;

      timeoutRef.current = setTimeout(() => {
        const currentScroll = window.scrollY;

        if (!scrolled && currentScroll > shrinkThreshold) {
          setScrolled(true);
        } else if (scrolled && currentScroll < expandThreshold) {
          setScrolled(false);
        }

        timeoutRef.current = null;
      }, debounceMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scrolled, shrinkThreshold, expandThreshold, debounceMs]);

  return scrolled;
}
