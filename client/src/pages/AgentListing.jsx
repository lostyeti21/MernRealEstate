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
import { geocodeAddress } from "../../../api/utils/geocode";
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
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaCheckCircle,
} from "react-icons/fa";
import Contact from "../components/Contact";
import Loader from '../components/Loader';
import { motion } from 'framer-motion';

const AgentListing = () => {
  SwiperCore.use([Navigation]);

  const params = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [contact, setContact] = useState(false);
  const [listedBy, setListedBy] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [hasUserRated, setHasUserRated] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  const checkIfUserHasRated = (agent, userId) => {
    if (!agent || !agent.ratedBy || !userId) return false;
    return agent.ratedBy.includes(userId);
  };

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        console.log('Fetching listing with ID:', params.listingId);
        
        const res = await fetch(`/api/listing/${params.listingId}`);
        const data = await res.json();
        console.log('Raw listing data:', data);

        if (!data.success) {
          console.error('Failed to fetch listing:', data.message);
          setError(data.message || 'Failed to fetch listing');
          return;
        }

        const listingData = data.listing;
        setListing(listingData);

        // Geocode address using the original implementation
        try {
          console.log('Attempting to geocode address:', listingData.address);
          const coords = await geocodeAddress(listingData.address);
          if (coords) {
            console.log('Geocoded coordinates:', coords);
            setCoordinates(coords);
          } else {
            console.warn('Geocoding failed, using default coordinates');
            setCoordinates({ lat: defaultLat, lng: defaultLng }); // Default to Nairobi
          }
        } catch (geoError) {
          console.error('Geocoding failed:', geoError);
          setCoordinates({ lat: defaultLat, lng: defaultLng }); // Default to Nairobi
        }

        // Fetch agent data
        if (listingData.userRef && listingData.userModel === 'Agent') {
          try {
            console.log('Fetching agent details:', {
              url: `/api/agent/${listingData.userRef}`,
              userRef: listingData.userRef
            });

            // First fetch agent details
            const agentRes = await fetch(`/api/agent/${listingData.userRef}`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (!agentRes.ok) {
              const errorText = await agentRes.text();
              console.error('Agent fetch failed:', {
                status: agentRes.status,
                statusText: agentRes.statusText,
                response: errorText
              });
              throw new Error(`Agent not found: ${agentRes.status}`);
            }
            
            const agentData = await agentRes.json();
            console.log('Agent Data:', agentData);

            // Get the agent info
            const agentInfo = agentData.agent || agentData;
            
            // Fetch agent ratings
            const ratingRes = await fetch(`/api/agent-rating/${listingData.userRef}`);
            const ratingData = await ratingRes.json();
            console.log('Rating Data:', ratingData);

            // Calculate ratings
            const preparedAgent = {
              ...agentInfo,
              ratings: ratingData.success ? ratingData.ratings : {
                overall: { 
                  averageRating: agentInfo.averageRating || 0,
                  totalRatings: agentInfo.ratedBy?.length || 0
                },
                categories: {
                  knowledge: { averageRating: 0, totalRatings: 0 },
                  professionalism: { averageRating: 0, totalRatings: 0 },
                  responsiveness: { averageRating: 0, totalRatings: 0 },
                  helpfulness: { averageRating: 0, totalRatings: 0 }
                }
              }
            };

            console.log('Prepared agent with ratings:', preparedAgent);

            if (agentData.success && agentData.agent) {
              const companyId = agentData.agent.companyId;
              if (companyId) {
                console.log('Fetching company details:', {
                  companyId,
                  url: `/api/real-estate/company/${companyId}`
                });

                const companyRes = await fetch(`/api/real-estate/company/${companyId}`, {
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });

                if (!companyRes.ok) {
                  const errorText = await companyRes.text();
                  console.error('Company fetch failed:', {
                    status: companyRes.status,
                    statusText: companyRes.statusText,
                    response: errorText
                  });
                  throw new Error(`Company not found: ${companyRes.status}`);
                }

                const companyData = await companyRes.json();
                console.log('Company Data:', companyData);

                if (companyData.success) {
                  setListedBy({
                    type: 'agent',
                    data: {
                      _id: preparedAgent._id,
                      name: preparedAgent.name,
                      email: preparedAgent.email,
                      contact: preparedAgent.phone,
                      avatar: preparedAgent.avatar,
                      ratings: preparedAgent.ratings,
                      companyName: companyData.company.companyName,
                      companyAvatar: companyData.company.avatar,
                      companyRating: companyData.company.companyRating || 0
                    }
                  });
                  console.log('Listed by agent with ratings:', preparedAgent.ratings);

                  if (currentUser) {
                    const userHasRated = agentInfo.ratings?.some(r => r.userId === currentUser._id);
                    setHasUserRated(userHasRated);
                  }
                } else {
                  console.error('Failed to fetch company data:', companyData.message);
                }
              } else {
                console.warn('No company ID found for agent');
              }
            }
          } catch (error) {
            console.error('Error fetching agent data:', error);
            setError('Failed to fetch agent information');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to fetch listing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [params.listingId, currentUser]);

  // Create custom map icon
  const customIcon = new L.Icon({
    iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });

  const handleMarkerClick = () => {
    if (listing && listing.address) {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address)}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleImageClick = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FaStar key={`full-${i}`} className="text-yellow-400 text-lg" />
      );
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <FaStarHalfAlt key="half" className="text-yellow-400 text-lg" />
      );
    }

    // Add empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FaRegStar key={`empty-${i}`} className="text-yellow-400 text-lg" />
      );
    }

    return stars;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      );
    }

    if (!listedBy || !listedBy.data) {
      return null;
    }

    const agent = listedBy.data;

    return (
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        {/* Company Banner */}
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
          {/* Agent Header with Overall Rating */}
          <div className="flex items-center justify-between mb-6">
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
                {/* Overall Rating Display */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center">
                    {renderStars(agent.ratings?.overall?.averageRating || 0)}
                    <span className="text-sm text-gray-500 ml-2">
                      ({agent.ratings?.overall?.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {agent.ratings?.overall?.totalRatings 
                      ? `${agent.ratings.overall.totalRatings} reviews` 
                      : 'No reviews yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Categories */}
          {agent.ratings?.categories && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">Rating Categories</h3>
              <div className="flex flex-col space-y-3 w-full">
                {/* Knowledge Rating */}
                <div className="flex items-center w-full">
                  <span className="text-gray-600 w-32">Knowledge</span>
                  <div className="flex items-center flex-1">
                    <div className="flex items-center flex-1">
                      {renderStars(agent.ratings.categories.knowledge?.averageRating || 0)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2 w-16 text-right">
                      ({agent.ratings.categories.knowledge?.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                </div>

                {/* Professionalism Rating */}
                <div className="flex items-center w-full">
                  <span className="text-gray-600 w-32">Professionalism</span>
                  <div className="flex items-center flex-1">
                    <div className="flex items-center flex-1">
                      {renderStars(agent.ratings.categories.professionalism?.averageRating || 0)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2 w-16 text-right">
                      ({agent.ratings.categories.professionalism?.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                </div>

                {/* Responsiveness Rating */}
                <div className="flex items-center w-full">
                  <span className="text-gray-600 w-32">Responsiveness</span>
                  <div className="flex items-center flex-1">
                    <div className="flex items-center flex-1">
                      {renderStars(agent.ratings.categories.responsiveness?.averageRating || 0)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2 w-16 text-right">
                      ({agent.ratings.categories.responsiveness?.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                </div>

                {/* Helpfulness Rating */}
                <div className="flex items-center w-full">
                  <span className="text-gray-600 w-32">Helpfulness</span>
                  <div className="flex items-center flex-1">
                    <div className="flex items-center flex-1">
                      {renderStars(agent.ratings.categories.helpfulness?.averageRating || 0)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2 w-16 text-right">
                      ({agent.ratings.categories.helpfulness?.averageRating?.toFixed(1) || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-2">
              <FaPhoneAlt className="text-green-700" />
              <span>{agent.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaEnvelope className="text-green-700" />
              <span>{agent.email}</span>
            </div>
          </div>

          {/* Viewing Schedule */}
          {listing.viewingSchedule && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-6 bg-slate-50 rounded-lg p-4"
            >
              <h3 className="text-sm font-medium text-gray-700 mb-3">Available Viewing Times</h3>
              {listing.flexibleViewingTime ? (
                <p className="text-sm text-gray-600 py-2">
                  Viewing times are flexible and will be scheduled based on the agent's availability.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(listing.viewingSchedule)
                    .filter(([_, schedule]) => schedule.available)
                    .map(([day, schedule]) => (
                      <div 
                        key={day}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="capitalize text-sm text-gray-600">{day}</span>
                        <span className="text-sm text-gray-800">
                          {schedule.start} - {schedule.end}
                        </span>
                      </div>
                    ))}
                  {!Object.values(listing.viewingSchedule).some(schedule => schedule.available) && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No viewing times currently available
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Rate Agent Button */}
          {currentUser && (
            <div className="mt-6">
              {hasUserRated ? (
                <span className="text-sm text-green-600 flex items-center gap-2">
                  <FaCheckCircle />
                  You have rated this agent
                </span>
              ) : (
                <button
                  onClick={() => navigate(`/agent-listings/${listing.userRef}`)}
                  className="w-full bg-blue-500 text-white p-3 rounded-lg uppercase hover:bg-blue-600 transition-colors"
                >
                  Rate Agent
                </button>
              )}
            </div>
          )}

          {/* Contact Agent Button */}
          {currentUser && (
            <div className="mt-4">
              <button
                onClick={() => setContact(true)}
                className="w-full bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 transition-all duration-200"
              >
                Contact Agent
              </button>
            </div>
          )}
        </div>
      </div>
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
        <p className="text-center my-7 text-2xl text-red-500">
          Something went wrong. Please try again later.
        </p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Listing not found</p>
      </div>
    );
  }

  return (
    <main>
      {listing && !loading && !error && (
        <div>
          <Swiper
            navigation
            slidesPerView={listing.imageUrls.length > 2 ? 3 : 2}
            centeredSlides={listing.imageUrls.length === 1}
            spaceBetween={20}
            className={`w-full ${listing.imageUrls.length === 2 ? "justify-end" : ""}`}
          >
            {listing.imageUrls?.map((url, index) => (
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
            <div className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullscreen(false);
                }}
                className="absolute top-4 right-4 text-white text-4xl z-[10000] p-4 hover:text-gray-300 transition-colors"
              >
                <FaTimes style={{ pointerEvents: 'none' }} />
              </button>
              <div className="w-full h-full relative">
                <Swiper 
                  navigation 
                  initialSlide={fullscreenIndex} 
                  className="w-full h-full"
                >
                  {listing.imageUrls?.map((url, index) => (
                    <SwiperSlide key={index}>
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={url}
                          alt={`Fullscreen ${index + 1}`}
                          className="max-h-[90vh] max-w-[90vw] object-contain"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {/* Property Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
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
                      <FaRulerCombined /> {listing.sqmeters} m²
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
                </div>

                {/* Agent Details */}
                {renderContent()}
              </div>

              {/* Right Column */}
              <div>
                {/* Map Section - Full height */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden h-full min-h-[calc(100vh-20rem)] sticky top-24" style={{ zIndex: 0 }}>
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
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {contact && (
        <Contact
          listing={listing}
          agent={listedBy?.data}
          onClose={() => setContact(false)}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg max-w-md w-full">
            <h3 className="text-2xl font-semibold mb-6">Rate {listedBy?.data?.name}</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`text-3xl focus:outline-none transition-colors ${
                    star <= (ratingHover || rating)
                      ? 'text-yellow-500'
                      : 'text-gray-300'
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowRatingModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={!rating}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AgentListing;
