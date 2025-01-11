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
import { geocodeAddress } from "../../../api/utils/geocode";

export default function Listing() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState(false);
  const [listedBy, setListedBy] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [showMap, setShowMap] = useState(true); // New state variable
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [hasUserRated, setHasUserRated] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const params = useParams();
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

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

        const res = await fetch(`/api/listing/get/${params.listingId}`, {
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
                type: 'agent',
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
              setListedBy({
                type: 'user',
                data: {
                  ...userData,
                  userModel: 'User'
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

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`text-xl ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      >
        ★
      </span>
    ));
  };

  const handleRatingSubmit = async () => {
    if (!rating || !currentUser || !listedBy) return;

    try {
      const endpoint = listedBy.type === 'agent' 
        ? `/api/agent/${listedBy.data._id}/rate`
        : `/api/user/${listedBy.data._id}/rate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ rating })
      });

      const data = await res.json();
      
      if (data.success) {
        setHasUserRated(true);
        setShowRatingModal(false);
        // Refresh the listing to update ratings
        fetchListing();
      } else {
        setError('Failed to submit rating');
      }
    } catch (error) {
      setError('Error submitting rating');
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

  const renderListedBy = () => {
    if (!listedBy) return null;

    if (listedBy.type === 'agent') {
      const agent = listedBy.data;
      return (
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          {agent.companyName && (
            <div className="w-full h-[120px] relative">
              <img
                src={agent.companyAvatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                alt="Company Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                {renderStars(agent.companyRating || 0)}
                <span className="text-sm text-gray-500 ml-1">
                  ({agent.companyRating?.toFixed(1) || 'N/A'})
                </span>
              </div>
              <div className="absolute bottom-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
                <span className="text-sm font-semibold">
                  {agent.companyName}
                </span>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={agent.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                  alt="Agent"
                  className="rounded-full h-16 w-16 object-cover border-2 border-white shadow-lg"
                />
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    Listed by Agent {agent.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {renderStars(agent.averageRating || 0)}
                    <span className="text-sm text-gray-500">
                      ({agent.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                    {currentUser && (
                      hasUserRated ? (
                        <span className="ml-2 text-sm text-green-600">
                          ✓ You have rated this agent
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowVerificationModal(true)}
                          className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                        >
                          Rate Agent
                        </button>
                      )
                    )}
                  </div>
                  {agent.phone && currentUser && (
                    <div className="mt-2 flex items-center gap-2 text-gray-600">
                      <FaPhoneAlt className="text-green-600" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  {agent.email && currentUser && (
                    <div className="mt-1 flex items-center gap-2 text-gray-600">
                      <FaEnvelope className="text-green-600" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const landlord = listedBy.data;
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={landlord?.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
              alt="Landlord"
              className="rounded-full h-16 w-16 object-cover"
            />
            <div>
              <p className="text-lg font-semibold text-slate-700">
                Listed by {landlord?.username || "Unknown Landlord"}
              </p>
              <div className="flex items-center">
                {renderStars(landlord?.averageRating || 0)}
                <span className="text-sm text-gray-500 ml-2">
                  ({landlord?.averageRating?.toFixed(1) || 'N/A'})
                </span>
              </div>
              {landlord?.phoneNumbers && currentUser && (
                <div className="mt-2">
                  {landlord.phoneNumbers.map((phone, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-gray-600 text-sm"
                    >
                      <FaPhoneAlt className="text-green-600" />
                      <span>{phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {currentUser && currentUser._id !== landlord?._id && (
            <button
              onClick={() => setShowVerificationModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm"
            >
              Rate Landlord
            </button>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleContactClick}
            className="w-full bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95"
          >
            Contact Landlord
          </button>
        </div>
      </div>
    );
  };

  const handleImageClick = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
    setShowMap(false); // Hide map when entering fullscreen
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setShowMap(true); // Show map when exiting fullscreen
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-2xl">Loading...</p>
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
    <main>
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
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
              <button
                onClick={closeFullscreen}
                className="absolute top-4 right-4 text-white text-4xl z-10 hover:text-gray-300"
              >
                <FaTimes />
              </button>
              <Swiper
                navigation
                initialSlide={fullscreenIndex}
                className="w-full h-full"
              >
                {listing.imageUrls.map((url, index) => (
                  <SwiperSlide key={index}>
                    <div className="w-full h-full flex items-center justify-center">
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
                <FaBolt /> {listing.backupPower ? "Backup Power" : "No Backup Power"}
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaTint /> {listing.backupWaterSupply ? "Backup Water Supply" : "No Backup Water"}
              </li>
              <li className="bg-green-800 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <FaWater /> {listing.boreholeWater ? "Borehole Water" : "No Borehole Water"}
              </li>
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

        <div className={`flex-1 h-[600px] lg:h-auto rounded-lg overflow-hidden shadow-md ${showMap ? '' : 'hidden'}`}>
          {coordinates ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={13}
              scrollWheelZoom={false}
              className="h-full w-full"
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
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="text-3xl focus:outline-none"
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRating(star)}
                >
                  <span className={`${
                    (ratingHover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
                  }`}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setRatingHover(0);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
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
    </main>
  );
}
