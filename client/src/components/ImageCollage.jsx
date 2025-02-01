import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ImageCollage = ({ images: propImages = [] }) => {
  const [images, setImages] = useState(propImages);
  const [debugInfo, setDebugInfo] = useState({
    storedListings: null,
    parsedListings: null,
    collageImages: null,
    error: null
  });

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

          // Handle both old and new listing formats
          const collageImages = parsedListings.flatMap(item => {
            // Normalize the item to handle both formats
            const listing = item.listing ? item.listing : item;
            const occurrences = item.occurrences || 1;

            // Create multiple images based on occurrences
            return Array(occurrences).fill().map((_, index) => ({
              src: listing.imageUrls[0] || 'https://via.placeholder.com/300',
              alt: `${listing.name} (${index + 1})`,
              id: `${listing._id}-${index}`
            }));
          });

          // Update debug info and images
          setDebugInfo(prev => ({
            ...prev,
            collageImages: collageImages
          }));

          setImages(collageImages);
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

  // If no images are available, show a message with a link to manage
  if (images.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="container mx-auto px-4 py-8 text-center"
      >
        <p className="text-xl text-slate-600 mb-4">
          No images selected for the collage.
        </p>
        <Link 
          to="/image-collage-manager" 
          className="bg-[#009688] text-white px-6 py-3 rounded-lg hover:bg-[#00796b] transition duration-300"
        >
          Manage Image Collage
        </Link>
        
        <DebugDisplay />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      viewport={{ once: true }}
      className="container mx-auto px-4 py-8"
    >
      <div className="grid grid-cols-3 gap-4 w-full mx-auto">
        {images.slice(0, 6).map((image, index) => {
          // Ensure the image src is a valid path or import
          const imageSrc = typeof image.src === 'string' 
            ? image.src.startsWith('/') 
              ? `${image.src}` 
              : image.src 
            : image.src;

          return (
            <div 
              key={image.id || index} 
              className="transform transition-transform duration-300 hover:scale-105 aspect-video overflow-hidden border-4 border-white rounded-lg shadow-md"
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
      <div className="text-center mt-4">
        <Link 
          to="/image-collage-manager" 
          className="text-[#009688] hover:underline text-sm"
        >
          Manage Image Collage
        </Link>
        
        <DebugDisplay />
      </div>
    </motion.div>
  );
};

export default ImageCollage;
