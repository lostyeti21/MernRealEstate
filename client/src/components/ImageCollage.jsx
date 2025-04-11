import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ImageCollage = forwardRef(({ images: propImages = [] }, ref) => {
  const [images, setImages] = useState(propImages);
  const [isPaused, setIsPaused] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(30); // seconds
  const [debugInfo, setDebugInfo] = useState({
    storedListings: null,
    parsedListings: null,
    collageImages: null,
    error: null
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    updateImages: (newImages) => {
      setImages(newImages);
    },
    resetAnimation: () => {
      // Reset animation by briefly changing the duration and then setting it back
      const currentDuration = animationDuration;
      setAnimationDuration(currentDuration + 0.1);
      setTimeout(() => setAnimationDuration(currentDuration), 50);
    }
  }));

  // Update images when propImages change
  useEffect(() => {
    if (propImages && propImages.length > 0) {
      setImages(propImages);
      console.log('ImageCollage: Updated from props with', propImages.length, 'images');
    }
  }, [propImages]);

  useEffect(() => {
    // If no prop images are provided, try to load from local storage
    if (propImages.length === 0) {
      try {
        // Retrieve stored listings
        const storedListings = localStorage.getItem('imageCollageListings');
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          storedListings: storedListings
        }));

        if (storedListings) {
          // Parse stored listings
          const parsedListings = JSON.parse(storedListings);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            parsedListings: parsedListings
          }));

          // Format images for display
          const formattedImages = formatImagesForDisplay(parsedListings);
          
          // Update debug info and images
          setDebugInfo(prev => ({
            ...prev,
            collageImages: formattedImages
          }));

          setImages(formattedImages);
        }
      } catch (error) {
        console.error('Error loading image collage from local storage:', error);
        
        // Update debug info with error
        setDebugInfo(prev => ({
          ...prev,
          error: error.message
        }));
      }
    } else {
      setImages(propImages);
    }
  }, [propImages]);

  // Helper function to format images consistently
  const formatImagesForDisplay = (imageData) => {
    if (!Array.isArray(imageData)) return [];
    
    return imageData.map((item, index) => {
      // Handle string URLs
      if (typeof item === 'string') {
        return {
          id: `image-${index}-${Date.now()}`,
          src: item,
          alt: `Image ${index + 1}`
        };
      }
      
      // Handle objects with different structures
      if (item && typeof item === 'object') {
        // Handle listing format
        if (item.listing) {
          const listing = item.listing;
          return {
            id: listing._id || `image-${index}-${Date.now()}`,
            src: listing.imageUrls ? (listing.imageUrls[0] || 'https://via.placeholder.com/300') : 
                 (listing.src || 'https://via.placeholder.com/300'),
            alt: listing.name || `Image ${index + 1}`
          };
        }
        
        // Handle direct image object format
        return {
          id: item.id || `image-${index}-${Date.now()}`,
          src: item.src || (item.imageUrls && item.imageUrls[0]) || item.url || '',
          alt: item.alt || item.name || `Image ${index + 1}`
        };
      }
      
      // Fallback for invalid data
      return {
        id: `image-${index}-${Date.now()}`,
        src: 'https://via.placeholder.com/300?text=Invalid+Image',
        alt: `Invalid Image ${index + 1}`
      };
    });
  };

  useEffect(() => {
    // Function to handle storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'imageCollageListings') {
        try {
          const updatedImages = JSON.parse(e.newValue);
          if (updatedImages && Array.isArray(updatedImages)) {
            // Format the images consistently
            const formattedImages = formatImagesForDisplay(updatedImages);
            
            // Update the images state
            setImages(formattedImages);
            
            // Reset animation duration to ensure smooth restart
            setAnimationDuration(prev => prev);
            
            console.log('ImageCollage: Updated with new images from storage event', formattedImages.length);
          }
        } catch (error) {
          console.error('Error parsing updated images from localStorage:', error);
        }
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Also check for localStorage changes directly in this component
    const checkLocalStorageInterval = setInterval(() => {
      try {
        const storedData = localStorage.getItem('imageCollageListings');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          // Only update if the data has changed and we have images
          if (parsedData && 
              JSON.stringify(parsedData) !== JSON.stringify(debugInfo.parsedListings) && 
              Array.isArray(parsedData)) {
            // Reload the images
            setDebugInfo(prev => ({
              ...prev,
              parsedListings: parsedData
            }));
            
            // Format the images consistently
            const formattedImages = formatImagesForDisplay(parsedData);
            
            // Update the images state
            setImages(formattedImages);
            
            console.log('ImageCollage: Updated with new images from interval check', formattedImages.length);
          }
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
      }
    }, 2000); // Check every 2 seconds

    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkLocalStorageInterval);
    };
  }, [debugInfo.parsedListings]);

  // Handle speeding up or slowing down the animation
  const speedUpAnimation = () => {
    setAnimationDuration(prev => Math.max(10, prev - 5));
  };

  const slowDownAnimation = () => {
    setAnimationDuration(prev => Math.min(60, prev + 5));
  };

  // Debugging component to show stored data
  const DebugDisplay = () => {
    if (!debugInfo.storedListings) return null;

    return (
      <div className="bg-yellow-100 p-4 rounded-lg mt-4 text-xs">
        <h3 className="font-bold mb-2">Debug Information</h3>
        <details>
          <summary>Stored Listings (Raw)</summary>
          <pre>{debugInfo.storedListings}</pre>
        </details>
        <details>
          <summary>Parsed Listings</summary>
          <pre>{JSON.stringify(debugInfo.parsedListings, null, 2)}</pre>
        </details>
        <details>
          <summary>Collage Images</summary>
          <pre>{JSON.stringify(debugInfo.collageImages, null, 2)}</pre>
        </details>
        {debugInfo.error && (
          <div className="text-red-500 mt-2">
            Error: {debugInfo.error}
          </div>
        )}
      </div>
    );
  };

  // If no images are available, show a placeholder
  if (images.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Loading images...</p>
      </div>
    );
  }

  // Duplicate images to ensure smooth infinite scrolling
  const duplicatedImages = [...images, ...images, ...images];

  // Calculate the percentage needed to show all images
  // Each image now takes up 23.333% (33.333% reduced by 30%) of the width
  const cardWidthPercentage = 23.333;
  const totalScrollPercentage = (images.length * cardWidthPercentage);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      viewport={{ once: true }}
      className="container mx-auto px-4 py-8"
    >
      <div className="relative overflow-hidden carousel-container">
        {/* Scrolling container with CSS animation */}
        <div 
          className={`carousel ${isPaused ? 'paused' : ''}`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div 
            className="image-group"
            style={{ 
              animationDuration: `${animationDuration}s`,
            }}
          >
            {duplicatedImages.map((image, index) => {
              // Ensure the image src is a valid path or import
              const imageSrc = typeof image.src === 'string' 
                ? image.src.startsWith('/') 
                  ? `${image.src}` 
                  : image.src 
                : image.src;

              return (
                <div 
                  key={`${image.id || index}-${index}`}
                  className="image-item"
                >
                  <img 
                    src={imageSrc} 
                    alt={image.alt || `Collage Image ${index + 1}`} 
                    className="w-full h-full object-contain bg-gray-100"
                    onError={(e) => {
                      console.error('Image load error:', e);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .carousel-container {
          width: 100%;
          height: 234px; /* Increased by 30% from 180px */
          position: relative;
          overflow: hidden;
        }
        
        .carousel {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .image-group {
          display: flex;
          will-change: transform;
          animation: scrolling ${animationDuration}s linear infinite;
          /* Make sure the container is wide enough to hold all images */
          width: ${images.length * 100 / (100/cardWidthPercentage)}%;
        }
        
        .paused .image-group {
          animation-play-state: paused;
        }
        
        .image-item {
          flex: 0 0 auto;
          width: calc(${cardWidthPercentage}% - 16px);
          height: 234px; /* Increased by 30% from 180px */
          margin-right: 16px;
          border: 4px solid white;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: transform 0.3s;
        }
        
        .image-item:hover {
          transform: scale(1.05);
        }
        
        @keyframes scrolling {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${totalScrollPercentage}%);
          }
        }
      `}</style>
      
      <div className="text-center mt-4">
        <Link 
          to="/image-collage-manager" 
          className="text-[#009688] hover:underline text-sm"
        >
         
        </Link>
        
        <DebugDisplay />
      </div>
    </motion.div>
  );
});

export default ImageCollage;
