import React, { lazy, Suspense } from 'react';

/**
 * Creates a lazily loaded component with a fallback loading state
 * 
 * @param {Function} importFunc - Dynamic import function for the component
 * @param {Object} fallback - React element to show while loading
 * @returns {React.LazyExoticComponent} - Lazy loaded component wrapped in Suspense
 */
export const lazyLoadComponent = (importFunc, fallback = null) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback || <div className="flex justify-center p-4">Loading... Please wait a moment.</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Preloads a component to improve perceived performance
 * 
 * @param {Function} importFunc - Dynamic import function for the component
 */
export const preloadComponent = (importFunc) => {
  importFunc();
};