import { useState, useEffect } from 'react';

/**
 * ImageOptimizer Component
 * 
 * A component that optimizes image loading by:
 * - Implementing lazy loading
 * - Using a placeholder while loading
 * - Supporting responsive image sizes
 * - Handling loading errors gracefully
 */
const ImageOptimizer = ({
  src,
  alt = '',
  className = '',
  placeholderSrc = 'https://via.placeholder.com/50?text=Loading...',
  width,
  height,
  sizes,
  style = {},
  onLoad,
  onError,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset states when src changes
    if (src !== imgSrc) {
      setIsLoaded(false);
      setError(false);
    }
  }, [src, imgSrc]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    setImgSrc(src);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setError(true);
    if (onError) onError(e);
  };

  // Only start loading the actual image when the component is mounted
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = handleLoad;
    img.onerror = handleError;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <img
      src={error ? placeholderSrc : (isLoaded ? src : placeholderSrc)}
      alt={alt}
      className={`${className} ${!isLoaded ? 'opacity-60' : ''}`}
      loading="lazy"
      width={width}
      height={height}
      sizes={sizes}
      style={{
        transition: 'opacity 0.3s ease',
        ...style
      }}
      {...props}
    />
  );
};

export default ImageOptimizer;