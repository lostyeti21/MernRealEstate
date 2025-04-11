import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTrash, FaImage, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import ImageCollage from '../components/ImageCollage';

export default function VerifiedCompanies() {
  const { currentUser } = useSelector((state) => state.user);
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key for the ImageCollage
  const imageCollageRef = useRef(null); // Add a ref to the ImageCollage component

  useEffect(() => {
    // Temporarily bypass authorization check completely
    // Load images from localStorage
    loadImages();
  }, [currentUser]);

  const loadImages = () => {
    try {
      // First try to get images from localStorage
      const storedImages = localStorage.getItem('imageCollageListings');
      
      if (storedImages) {
        try {
          const parsedImages = JSON.parse(storedImages);
          
          // Handle different possible formats
          if (Array.isArray(parsedImages)) {
            // Convert to the format expected by our component
            const formattedImages = parsedImages.map((item, index) => {
              // Handle different item formats
              if (typeof item === 'string') {
                // If it's just a string URL
                return {
                  id: `image-${index}`,
                  src: item,
                  alt: `Image ${index + 1}`
                };
              } else if (item && typeof item === 'object') {
                // If it's an object with various properties
                return {
                  id: item.id || `image-${index}`,
                  src: item.src || (item.imageUrls && item.imageUrls[0]) || item.url || '',
                  alt: item.alt || item.name || `Image ${index + 1}`
                };
              } else {
                // Fallback for any other format
                return {
                  id: `image-${index}`,
                  src: 'https://via.placeholder.com/300?text=Invalid+Image',
                  alt: `Invalid Image ${index + 1}`
                };
              }
            });
            
            setImages(formattedImages);
            return; // Exit function after successfully setting images
          }
        } catch (parseError) {
          console.error('Error parsing stored images:', parseError);
          // Continue to fallback images
        }
      }
      
      // If we reach here, either no images in localStorage or parsing failed
      // Use default images as fallback
      const defaultImages = [
        { 
          id: 'default-1',
          src: "/src/assets/image1.png", 
          alt: "Company Image 1" 
        },
        { 
          id: 'default-2',
          src: "/src/assets/image2.png", 
          alt: "Company Image 2" 
        },
        { 
          id: 'default-3',
          src: "/src/assets/image3.png", 
          alt: "Company Image 3" 
        },
        { 
          id: 'default-4',
          src: "/src/assets/image4.png", 
          alt: "Company Image 4" 
        },
        { 
          id: 'default-5',
          src: "/src/assets/image5.jpg", 
          alt: "Company Image 5" 
        },
        { 
          id: 'default-6',
          src: "/src/assets/image6.png", 
          alt: "Company Image 6" 
        }
      ];
      
      setImages(defaultImages);
      
    } catch (error) {
      console.error('Error loading images:', error);
      // Don't show error toast, just use default images
      const defaultImages = [
        { 
          id: 'default-1',
          src: "/src/assets/image1.png", 
          alt: "Company Image 1" 
        },
        { 
          id: 'default-2',
          src: "/src/assets/image2.png", 
          alt: "Company Image 2" 
        },
        { 
          id: 'default-3',
          src: "/src/assets/image3.png", 
          alt: "Company Image 3" 
        },
        { 
          id: 'default-4',
          src: "/src/assets/image4.png", 
          alt: "Company Image 4" 
        },
        { 
          id: 'default-5',
          src: "/src/assets/image5.jpg", 
          alt: "Company Image 5" 
        },
        { 
          id: 'default-6',
          src: "/src/assets/image6.png", 
          alt: "Company Image 6" 
        }
      ];
      
      setImages(defaultImages);
    }
  };

  const saveImages = (updatedImages) => {
    try {
      localStorage.setItem('imageCollageListings', JSON.stringify(updatedImages));
      setImages(updatedImages);
      
      // Force refresh the ImageCollage component
      setRefreshKey(prevKey => prevKey + 1);
      
      // Dispatch storage event for other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'imageCollageListings',
        newValue: JSON.stringify(updatedImages)
      }));
      
      toast.success('Images saved successfully');
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Failed to save images');
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl) {
      toast.error('Please enter an image URL');
      return;
    }

    setLoading(true);

    // Create a new image object
    const newImage = {
      id: `image-${Date.now()}`,
      src: newImageUrl,
      alt: newImageAlt || `Image ${images.length + 1}`
    };

    // Add the new image to the images array
    const updatedImages = [...images, newImage];
    
    // Save to localStorage and update state
    saveImages(updatedImages);
    
    // Clear the form
    setNewImageUrl('');
    setNewImageAlt('');
    setLoading(false);
  };

  const handleRemoveImage = (imageId) => {
    const updatedImages = images.filter(image => image.id !== imageId);
    saveImages(updatedImages);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Set the file for upload
    setImageFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!imageFile) {
      toast.error('Please select an image file');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a FileReader to read the file locally
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        
        // Create a new image object
        const newImage = {
          id: `image-${Date.now()}`,
          src: imageUrl,
          alt: newImageAlt || `Uploaded Image ${images.length + 1}`
        };
        
        // Add the new image to the images array
        const updatedImages = [...images, newImage];
        
        // Save to localStorage
        localStorage.setItem('imageCollageListings', JSON.stringify(updatedImages));
        
        // Dispatch a storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'imageCollageListings',
          newValue: JSON.stringify(updatedImages)
        }));
        
        toast.success('Image uploaded successfully');
        setLoading(false);
        
        // Clear the form
        setImageFile(null);
        setPreviewUrl('');
        setNewImageAlt('');
        
        // Update the state
        setImages(updatedImages);
      };
      
      reader.onerror = () => {
        toast.error('Error reading file');
        setLoading(false);
      };
      
      // Read the file as a data URL
      reader.readAsDataURL(imageFile);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-700">Verified Companies</h1>
        <Link to="/dashboard" className="flex items-center text-blue-500 hover:underline">
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </Link>
      </div>
      
      {/* Preview of the ImageCollage */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-slate-600">Preview</h2>
        <div className="border border-gray-200 rounded-lg p-4">
          <ImageCollage 
            key={refreshKey} 
            images={images} 
            ref={imageCollageRef}
          />
        </div>
      </div>
      
      {/* Add Image Form */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-slate-600">Add New Image</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* URL Input */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Add by URL</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Image URL</label>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Alt Text (Optional)</label>
              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description of image"
              />
            </div>
            {newImageUrl && (
              <div className="mb-4">
                <p className="text-gray-700 mb-2">Preview:</p>
                <img
                  src={newImageUrl}
                  alt="Preview"
                  className="max-w-full h-auto max-h-40 rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300?text=Invalid+URL';
                  }}
                />
              </div>
            )}
            <button
              onClick={handleAddImage}
              disabled={!newImageUrl || loading}
              className={`px-4 py-2 rounded-lg ${
                !newImageUrl || loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? 'Adding...' : 'Add Image'}
            </button>
          </div>
          
          {/* File Upload */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upload Image</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Alt Text (Optional)</label>
              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description of image"
              />
            </div>
            {previewUrl && (
              <div className="mb-4">
                <p className="text-gray-700 mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto max-h-40 rounded-lg"
                />
              </div>
            )}
            <button
              onClick={handleUploadImage}
              disabled={!imageFile || loading}
              className={`px-4 py-2 rounded-lg ${
                !imageFile || loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Image List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-slate-600">Manage Images</h2>
        {images.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No images added yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-40 overflow-hidden bg-gray-100">
                  <img 
                    src={image.src} 
                    alt={image.alt} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300?text=Image+Error';
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-600 truncate mb-2">{image.alt}</p>
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    className="w-full bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <FaTrash className="mr-2" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
