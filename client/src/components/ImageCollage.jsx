import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const ImageCollage = ({ images }) => {
  useEffect(() => {
    images.forEach((image, index) => {
      console.log(`Image ${index + 1} path:`, image.src);
    });
  }, [images]);

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
              key={index} 
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
    </motion.div>
  );
};

export default ImageCollage;
