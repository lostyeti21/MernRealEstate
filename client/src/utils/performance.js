import { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Custom hook for debouncing function calls
 * 
 * @param {Function} func - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const useDebounce = (func, delay) => {
  const timeoutRef = useRef(null);

  const debouncedFunc = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [func, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFunc;
};

/**
 * Custom hook for throttling function calls
 * 
 * @param {Function} func - The function to throttle
 * @param {number} limit -