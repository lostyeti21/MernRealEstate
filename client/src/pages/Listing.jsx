import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import SwiperCore from "swiper";
import { Navigation } from "swiper/modules";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "swiper/css/bundle";
import { useSelector } from "react-redux";
import { toast } from 'react-hot-toast';
import { motion } from "framer-motion";
import {
  FaBath,
  FaBed,
  FaChair,
  FaMapMarkerAlt,
  FaParking,
  FaTimes,
  FaRulerCombined,
  FaBolt,
  FaTint,
  FaPhoneAlt,
  FaWater,
  FaEnvelope,
} from "react-icons/fa";
import Contact from "../components/Contact";
import RateLandlord from "../components/RateLandlord"; // Import RateLandlord component
import Loader from "../components/Loader";
import { geocodeAddress } from "../../../api/utils/geocode";

export default function Listing() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState(false);
  const [listedBy, setListedBy] = useState({ loading: true, error: null, data: null });
  const [coordinates, setCoordinates] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [showMap, setShowMap] = useState(true); // New state variable
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [responseTimeRating, setResponseTimeRating] = useState(0);
  const [maintenanceRating, setMaintenanceRating] = useState(0);
  const [experienceRating, setExperienceRating] = useState(0);
  const [hasUserRated, setHasUserRated] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const params = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || (currentUser && currentUser.token);
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/listing/${params.listingId}`, {
          headers
        });
        const data = await res.json();

        if (data.success === false) {
          setError(data.message);
          setLoading(false);
          return;
        }

        setListing(data.listing);

        // Track view for the listing owner
        if (data.listing.userRef) {
          try {
            await fetch(`/api/analytics/${data.listing.userRef}/track`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ type: 'view' })
            });
          } catch (err) {
            console.error('Error tracking view:', err);
          }
        }

        // Geocode address using the original implementation
        try {
          const coords = await geocodeAddress(data.listing.address);
          if (coords) {
            setCoordinates(coords);
            console.log('Geocoded coordinates:', coords);
          } else {
            console.warn('Geocoding failed, using default coordinates');
            setCoordinates({ lat: -1.2921, lng: 36.8219 }); // Default to Nairobi
          }
        } catch (geoError) {
          console.warn('Geocoding failed:', geoError);
          setCoordinates({ lat: -1.2921, lng: 36.8219 }); // Default to Nairobi
        }

        // Fetch user or agent data based on userModel
        if (data.listing.userRef) {
          if (data.listing.userModel === 'Agent') {
            const agentRes = await fetch(`/api/agent/${data.listing.userRef}`);
            const agentData = await agentRes.json();
            
            if (agentData.success && agentData.agent) {
              setListedBy({
                loading: false,
                error: null,
                data: {
                  _id: agentData.agent._id,
                  name: agentData.agent.name,
                  email: agentData.agent.email,
                  phone: agentData.agent.phone,
                  avatar: agentData.agent.avatar,
                  userModel: 'Agent'
                }
              });
            }
          } else {
            const userRes = await fetch(`/api/user/${data.listing.userRef}`);
            const userData = await userRes.json();
            
            if (userData) {
              console.log('Landlord data:', userData); // Debug log
              
              // Extract rating information
              const overallRating = userData.ratings?.overall?.averageRating;
              const ratingCategories = userData.ratings?.categories;
              const totalRatings = userData.ratings?.overall?.totalRatings;

              setListedBy({
                loading: false,
                error: null,
                data: {
                  ...userData,
                  userModel: 'User',
                  averageRating: overallRating || 0,
                  totalRatings: totalRatings || 0,
                  ratingCategories: ratingCategories || {
                    responseTime: 0,
                    maintenance: 0,
                    experience: 0
                  }
                }
              });
            }
          }
        }

        setError(null);
      } catch (error) {
        setError('Failed to fetch listing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [params.listingId]);

  // Track page view
  useEffect(() => {
    const trackPageView = async () => {
      if (!listing?._id || !listing.userRef) {
        console.log('Skipping view tracking - missing listing data:', { id: listing?._id, userRef: listing?.userRef });
        return;
      }

      try {
        console.log('Tracking page view for listing:', listing._id);
        const res = await fetch(`/api/analytics/${listing.userRef}/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: 'view',
            listingId: listing._id
          }),
        });

        const data = await res.json();
        console.log('View tracking response:', data);

        if (!data.success) {
          console.error('Failed to track view:', data.message);
        }
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    if (listing?._id && listing?.userRef) {
      console.log('Calling trackPageView with listing:', { id: listing._id, userRef: listing.userRef });
      trackPageView();
    }
  }, [listing?._id, listing?.userRef]); // Only re-run when listing ID or userRef changes

  // Track contact button click
  const handleContactClick = async () => {
    if (!listing?._id || !listing.userRef) {
      console.log('Skipping click tracking - missing listing data:', { id: listing?._id, userRef: listing?.userRef });
      return;
    }

    try {
      console.log('Tracking contact click for listing:', listing._id);
      const res = await fetch(`/api/analytics/${listing.userRef}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'click',
          listingId: listing._id
        }),
      });

      const data = await res.json();
      console.log('Click tracking response:', data);

      if (!data.success) {
        console.error('Failed to track click:', data.message);
      }
    } catch (error) {
      console.error('Error tracking contact click:', error);
    }

    setContact(true);
  };

  // Track inquiry submission
  const handleInquiry = async () => {
    if (!listing?._id || !listing.userRef) {
      console.log('Skipping inquiry tracking - missing listing data:', { id: listing?._id, userRef: listing?.userRef });
      return;
    }

    try {
      console.log('Tracking inquiry for listing:', listing._id);
      const res = await fetch(`/api/analytics/${listing.userRef}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'inquiry',
          listingId: listing._id
        }),
      });

      const data = await res.json();
      console.log('Inquiry tracking response:', data);

      if (!data.success) {
        console.error('Failed to track inquiry:', data.message);
      }
    } catch (error) {
      console.error('Error tracking inquiry:', error);
    }
  };

  const startChat = async (userId) => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    try {
      const res = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('realEstateToken')}`
        },
        body: JSON.stringify({
          receiverId: userId,
          receiverModel: 'User'
        })
      });

      const data = await res.json();
      if (data.success) {
        navigate('/messages');
      } else {
        setError('Failed to start conversation');
      }
    } catch (error) {
      setError('Error starting chat');
    }
  };

  const trackClick = async () => {
    if (listing?.userRef) {
      try {
        await fetch(`/api/analytics/${listing.userRef}/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'click' })
        });
      } catch (err) {
        console.error('Error tracking click:', err);
      }
    }
  };

  const handlePhoneClick = async () => {
    await trackClick();
    if (listedBy?.data?.phone) {
      window.location.href = `tel:${listedBy.data.phone}`;
    }
  };

  const handleEmailClick = async () => {
    await trackClick();
    if (listedBy?.data?.email) {
      window.location.href = `mailto:${listedBy.data.email}`;
    }
  };

  const handleContact = async () => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    try {
      // Get the owner's model type
      let ownerModel = 'User';
      if (listing.userModel) {
        ownerModel = listing.userModel;
      } else if (listing.agent) {
        ownerModel = 'Agent';
      }

      // Create the conversation
      const res = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: listing.userRef,
          receiverModel: ownerModel,
          listingId: listing._id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create conversation');
      }

      const data = await res.json();
      if (data.success) {
        // Track the contact event
        await handleContactClick();
        
        // Navigate to messages with the conversation ID
        navigate(`/messages?conversation=${data.conversation._id}`);
      } else {
        throw new Error(data.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation. Please try again.');
    }
  };

  const renderStars = (rating, small = false) => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
  
    for (let i = 1; i <= 5; i++) {
      const starValue = i;
      const sizeClass = small ? 'text-sm' : 'text-xl';
    
      if (roundedRating >= starValue) {
        // Full star
        stars.push(
          <span key={i} className={`text-yellow-500 ${sizeClass}`}>★</span>
        );
      } else if (roundedRating === starValue - 0.5) {
        // Half star
        stars.push(
          <div key={i} className={`relative inline-block ${sizeClass}`}>
            <span className="text-gray-300">★</span>
            <span className="absolute top-0 left-0 overflow-hidden w-[50%] text-yellow-500">★</span>
          </div>
        );
      } else {
        // Empty star
        stars.push(
          <span key={i} className={`text-gray-300 ${sizeClass}`}>★</span>
        );
      }
    }
    return stars;
  };

  const handleSubmitRating = async () => {
    try {
      // Validate ratings
      if (
        responseTimeRating === 0 || 
        maintenanceRating === 0 || 
        experienceRating === 0
      ) {
        toast.error('Please provide ratings for all categories');
        return;
      }

      // Calculate overall rating
      const overallRating = (responseTimeRating + maintenanceRating + experienceRating) / 3;

      const response = await fetch('/api/user/rate-landlord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landlordId: listing.userRef,
          responseTime: responseTimeRating,
          maintenance: maintenanceRating,
          experience: experienceRating,
          overallRating: overallRating
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }

      toast.success('Rating submitted successfully!');
      
      // Update local state
      setResponseTimeRating(0);
      setMaintenanceRating(0);
      setExperienceRating(0);
      setShowRatingModal(false);

      // Refresh listing to show updated ratings
      fetchListing();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(error.message || 'An error occurred while submitting rating');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setVerificationError('Please enter the verification code');
      return;
    }

    setVerifyingCode(true);
    setVerificationError('');

    try {
      const res = await fetch('/api/code/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          code: verificationCode,
          landlordId: listing.userRef
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowVerificationModal(false);
        navigate(`/landlord/${listing.userRef}`);
      } else {
        setVerificationError(data.message || 'Invalid verification code');
      }
    } catch (error) {
      setVerificationError('Failed to verify code');
    } finally {
      setVerifyingCode(false);
    }
  };

  const fetchLandlordData = async (userRef) => {
    try {
      const landlordRes = await fetch(`/api/user/${userRef}`);
      const landlordData = await landlordRes.json();
      return landlordData;
    } catch (error) {
      console.error("Error fetching landlord data:", error);
      return null;
    }
  };

  const checkIfUserHasRated = (agent, userId) => {
    return agent.ratedBy.includes(userId);
  };

  const customIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const handleMarkerClick = () => {
    const address = encodeURIComponent(listing.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const handleImageClick = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
    setShowMap(false); // Hide map when entering fullscreen
  };

  const closeFullscreen = () => {
    console.log('Closing fullscreen', { 
      showFullscreen, 
      showMap, 
      fullscreenIndex 
    });
    setShowFullscreen(false);
    setShowMap(true); // Show map when exiting fullscreen
  };

  const handleRatingClick = (landlordId) => {
    navigate(`/landlord/${landlordId}`);
  };

  const renderListedBy = () => {
    if (listedBy.loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      );
    }

    if (listedBy.error) {
      return <p className="text-red-500">Error loading landlord information</p>;
    }

    const landlord = listedBy.data;
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-full overflow-x-hidden"
      >
        <div className="flex items-start gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-shrink-0 mt-8"
          >
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              src={landlord?.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
              alt="Landlord"
              className="rounded-full h-20 w-20 object-cover"
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-between items-center flex-wrap gap-2 mb-3"
            >
              <div className="flex-shrink">
                <p className="text-lg font-semibold text-slate-700 truncate">
                  Listed by {landlord?.username || "Unknown Landlord"}
                </p>
              </div>
              {currentUser && currentUser._id !== landlord?._id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex-shrink-0"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRatingClick(landlord._id)}
                    className="bg-blue-500 text-white px-5 py-1 rounded-lg text-sm hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    Rate this Landlord
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center flex-wrap gap-2">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex-shrink-0"
                >
                  {renderStars(landlord?.ratings?.overall?.averageRating || 0)}
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="text-sm text-gray-500 flex-shrink-0"
                >
                  {landlord?.ratings?.overall?.averageRating > 0 
                    ? `${landlord.ratings.overall.averageRating.toFixed(1)} Overall Rating` 
                    : 'No ratings yet'}
                  {landlord?.ratings?.overall?.totalRatings > 0 && 
                    ` (${landlord.ratings.overall.totalRatings} ${
                      landlord.ratings.overall.totalRatings === 1 ? 'review' : 'reviews'
                    })`}
                </motion.span>
              </div>
              {landlord?.ratings?.categories && (
                landlord.ratings.categories.responseTime > 0 ||
                landlord.ratings.categories.maintenance > 0 ||
                landlord.ratings.categories.experience > 0
              ) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="text-sm text-gray-500"
                >
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Response', value: landlord.ratings.categories.responseTime },
                      { label: 'Maintenance', value: landlord.ratings.categories.maintenance },
                      { label: 'Experience', value: landlord.ratings.categories.experience }
                    ].map((category, index) => (
                      <motion.div 
                        key={category.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.9 + (index * 0.1) }}
                        className="flex items-center"
                      >
                        <span className="font-medium w-28">{category.label}:</span>
                        <div className="flex-1 flex items-center justify-end">
                          <div className="flex items-center gap-1">
                            {renderStars(category.value, true)}
                            <span className="ml-2 min-w-[24px]">{category.value.toFixed(1)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
            {landlord?.phoneNumbers && currentUser && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="mt-1"
              >
                {landlord.phoneNumbers.map((phone, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 1.2 + (index * 0.1) }}
                    className="flex items-center gap-2 text-gray-600 text-sm"
                  >
                    <FaPhoneAlt className="text-green-600 flex-shrink-0" />
                    <span className="truncate">{phone}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500 text-2xl">{error}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-2xl">Listing not found</p>
      </div>
    );
  }

  SwiperCore.use([Navigation]);

  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  return (
    <div 
      className="w-full mx-auto px-4 bg-white min-h-screen relative pt-6"
      style={{ zIndex: 0 }}
    >
      {listing.imageUrls && listing.imageUrls.length > 0 ? (
        <>
          <Swiper
            navigation
            slidesPerView={listing.imageUrls.length > 2 ? 3 : 2}
            centeredSlides={listing.imageUrls.length === 1}
            spaceBetween={20}
            className={`w-full ${listing.imageUrls.length === 2 ? "justify-end" : ""}`}
          >
            {listing.imageUrls.map((url, index) => (
              <SwiperSlide key={index}>
                <div
                  className="h-[400px] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => handleImageClick(index)}
                >
                  <img
                    src={url}
                    alt={`Listing ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {showFullscreen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center"
              onMouseDown={(e) => {
                // Only close if clicking directly on the background
                if (e.target === e.currentTarget) {
                  closeFullscreen();
                }
              }}
            >
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  closeFullscreen();
                }}
                className="fixed bottom-8 left-8 bg-white hover:bg-gray-100 text-black rounded-full p-4 transition-all duration-200 shadow-lg flex items-center gap-2 z-[10000]"
                aria-label="Close fullscreen"
              >
                <FaTimes className="text-2xl mr-2" />
                <span className="text-sm font-medium">Close</span>
              </button>
              <Swiper
                navigation
                initialSlide={fullscreenIndex}
                className="w-full h-full"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {listing.imageUrls.map((url, index) => (
                  <SwiperSlide key={index}>
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <img
                        src={url}
                        alt={`Fullscreen ${index + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </>
      ) : (
        <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">No images available</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row max-w-6xl mx-auto my-7 gap-6">
        <div className="flex flex-col flex-1">
          {renderListedBy()}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-2xl font-semibold mb-1">{listing.name}</p>
            <p className="text-gray-500 text-sm mb-4 flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-500" />
              {listing.address}
            </p>
            <div className="bg-green-600 text-white text-lg font-semibold px-4 py-2 rounded-full inline-block mb-4">
              ${listing.offer
                ? listing.discountPrice.toLocaleString("en-US")
                : listing.regularPrice.toLocaleString("en-US")}
              {listing.type === "rent" && " / month"}
            </div>
            <p className="text-slate-800 mb-4">
              <span className="font-semibold text-black">Description</span>
              <br />
              {listing.description}
            </p>
            <ul className="flex flex-wrap gap-4">
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaBed /> {listing.bedrooms} Beds
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaBath /> {listing.bathrooms} Baths
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaParking /> {listing.parking ? "Parking Spot" : "No Parking"}
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaChair /> {listing.furnished ? "Furnished" : "Unfurnished"}
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaRulerCombined /> {listing.m2} m²
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaChair /> {listing.lounges} {listing.lounges > 1 ? 'Lounges' : 'Lounge'}
              </li>
              {listing.backupPower && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaBolt /> Backup Power
                </li>
              )}
              {listing.backupWaterSupply && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaWater /> Backup Water Supply
                </li>
              )}
              {listing.boreholeWater && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaTint /> Borehole Water
                </li>
              )}
              {/* New amenities */}
              {listing.electricFence && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaBolt /> Electric Fence
                </li>
              )}
              {listing.walledOrFenced && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaMapMarkerAlt /> Walled/Fenced
                </li>
              )}
              {listing.electricGate && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaBolt /> Electric Gate
                </li>
              )}
              {listing.builtInCupboards && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaChair /> Built-in Cupboards
                </li>
              )}
              {listing.fittedKitchen && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaChair /> Fitted Kitchen
                </li>
              )}
              {listing.solarGeyser && (
                <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                  <FaBolt /> Solar Geyser
                </li>
              )}
            </ul>

            {currentUser && currentUser._id !== listing.userRef && (
              <div className="mt-4">
                <button
                  onClick={handleContactClick}
                  className="w-full bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95"
                >
                  Contact Landlord
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 h-[600px] lg:h-auto rounded-lg overflow-hidden shadow-md relative ${showMap ? '' : 'hidden'}`} style={{ zIndex: 0 }}>
          {coordinates ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={13}
              scrollWheelZoom={false}
              className="h-full w-full relative"
              style={{ zIndex: 0 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker
                position={[coordinates.lat, coordinates.lng]}
                icon={customIcon}
              >
                <Popup>
                  <div>
                    <p className="font-semibold">{listing.name}</p>
                    <p>{listing.address}</p>
                    <button 
                      onClick={handleMarkerClick}
                      className="text-blue-500 hover:underline mt-2"
                    >
                      Get Directions
                    </button>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <p>Loading map location...</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Message button for landlords */}
      {currentUser && 
       currentUser._id === listing.userRef && 
       listing.interestedUsers && 
       listing.interestedUsers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Interested Users</h3>
          <div className="space-y-2">
            {listing.interestedUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => startChat(user._id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {contact && (
        <Contact
          listing={listing}
          onMessageSent={handleInquiry}
        />
      )}

      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Rate {listedBy.data.name}</h3>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">Response Time:</p>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="text-3xl focus:outline-none"
                    onMouseEnter={() => setResponseTimeRating(star)}
                    onMouseLeave={() => setResponseTimeRating(responseTimeRating)}
                    onClick={() => setResponseTimeRating(star)}
                  >
                    <span className={`${
                      responseTimeRating >= star ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">Maintenance:</p>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="text-3xl focus:outline-none"
                    onMouseEnter={() => setMaintenanceRating(star)}
                    onMouseLeave={() => setMaintenanceRating(maintenanceRating)}
                    onClick={() => setMaintenanceRating(star)}
                  >
                    <span className={`${
                      maintenanceRating >= star ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">Experience:</p>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="text-3xl focus:outline-none"
                    onMouseEnter={() => setExperienceRating(star)}
                    onMouseLeave={() => setExperienceRating(experienceRating)}
                    onClick={() => setExperienceRating(star)}
                  >
                    <span className={`${
                      experienceRating >= star ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setResponseTimeRating(0);
                  setMaintenanceRating(0);
                  setExperienceRating(0);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Code Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Verification Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please enter the verification code provided by the landlord to proceed.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter code"
              className="w-full px-3 py-2 border rounded-md mb-4"
              disabled={verifyingCode}
            />
            {verificationError && (
              <p className="text-red-600 text-sm mb-4">{verificationError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationCode('');
                  setVerificationError('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                disabled={verifyingCode}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyCode}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                disabled={verifyingCode}
              >
                {verifyingCode ? "Verifying..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
