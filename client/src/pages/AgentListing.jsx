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
} from "react-icons/fa";
import Contact from "../components/Contact";

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
        
        const res = await fetch(`/api/listing/get/${params.listingId}`);
        const data = await res.json();
        console.log('Raw listing data:', data);

        if (!data.success) {
          console.error('Failed to fetch listing:', data.message);
          setError(data.message || 'Failed to fetch listing');
          return;
        }

        const listingData = data.listing;
        setListing(listingData);

        // Geocode address
        try {
          const coords = await geocodeAddress(listingData.address);
          setCoordinates(coords);
        } catch (geoError) {
          console.warn('Geocoding failed:', geoError);
        }

        // Fetch agent data
        if (listingData.userRef && listingData.userModel === 'Agent') {
          try {
            console.log('Attempting to fetch agent details:', {
              url: `/api/agent/${listingData.userRef}`,
              userRef: listingData.userRef
            });

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

            if (agentData.success && agentData.agent) {
              const companyId = agentData.agent.companyId;
              if (companyId) {
                console.log('Fetching company details:', {
                  companyId,
                  url: `/api/company/${companyId}`
                });

                const companyRes = await fetch(`/api/company/${companyId}`, {
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
                      _id: agentData.agent._id,
                      name: agentData.agent.name,
                      email: agentData.agent.email,
                      contact: agentData.agent.phone,
                      avatar: agentData.agent.avatar,
                      averageRating: agentData.agent.averageRating || 0,
                      companyName: companyData.company.companyName,
                      companyAvatar: companyData.company.avatar,
                      companyRating: companyData.company.companyRating || 0
                    }
                  });
                  console.log('Listed by agent:', listedBy);
                } else {
                  console.error('Failed to fetch company data:', companyData.message);
                }
              } else {
                console.warn('No company ID found for agent');
              }

              if (currentUser) {
                const userHasRated = checkIfUserHasRated(agentData.agent, currentUser._id);
                setHasUserRated(userHasRated);
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

  const customIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const handleImageClick = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
  };

  const handleMarkerClick = () => {
    const address = encodeURIComponent(listing.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const renderStars = (averageRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-xl ${i <= averageRating ? "text-yellow-500" : "text-gray-300"}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const handleRatingSubmit = async () => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    if (!rating) {
      alert('Please select a rating');
      return;
    }

    try {
      const res = await fetch(`/api/agent/${listedBy.data._id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          userId: currentUser._id
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        setListedBy(prev => ({
          ...prev,
          data: {
            ...prev.data,
            averageRating: data.newAgentRating
          }
        }));
        setHasUserRated(true);
        setShowRatingModal(false);
        setRating(0);
        alert('Rating submitted successfully!');
      } else {
        alert(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating. Please try again.');
    }
  };

  const renderListedBy = () => {
    if (!listedBy) return null;

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
                        onClick={() => setShowRatingModal(true)}
                        className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                      >
                        Rate Agent
                      </button>
                    )
                  )}
                </div>
                {agent.contact && (
                  <div className="mt-2 flex items-center gap-2 text-gray-600">
                    <FaPhoneAlt className="text-green-600" />
                    <span>{agent.contact}</span>
                  </div>
                )}
                {agent.email && (
                  <div className="mt-1 flex items-center gap-2 text-gray-600">
                    <FaEnvelope className="text-green-600" />
                    <span>{agent.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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
        <p className="text-center my-7 text-2xl">Loading...</p>
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
                {/* Company and Agent Information */}
                {renderListedBy()}

                {/* Property Details */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  {/* Listing Header */}
                  <div className="flex flex-col gap-3 mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {listing.name}
                    </h1>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMapMarkerAlt className="text-green-600" />
                      <span>{listing.address}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="bg-red-900 text-white px-4 py-1 rounded-full text-sm">
                        {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
                      </span>
                      {listing.offer && (
                        <span className="bg-green-900 text-white px-4 py-1 rounded-full text-sm">
                          ${+listing.regularPrice - +listing.discountPrice} OFF
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-semibold text-gray-900">
                      ${listing.offer ? listing.discountPrice.toLocaleString('en-US') : listing.regularPrice.toLocaleString('en-US')}
                      {listing.type === 'rent' && ' / month'}
                    </p>
                  </div>

                  <h2 className="text-lg font-semibold mb-4">Property Details</h2>
                  <p className="text-gray-700 mb-6 text-sm">
                    {listing.description}
                  </p>
                  <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <li className="flex items-center gap-2 text-gray-600">
                      <FaBed className="text-lg text-green-600" />
                      <span>{listing.bedrooms} {listing.bedrooms > 1 ? 'Beds' : 'Bed'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <FaBath className="text-lg text-green-600" />
                      <span>{listing.bathrooms} {listing.bathrooms > 1 ? 'Baths' : 'Bath'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <FaParking className="text-lg text-green-600" />
                      <span>{listing.parking ? 'Parking' : 'No Parking'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <FaChair className="text-lg text-green-600" />
                      <span>{listing.furnished ? 'Furnished' : 'Not Furnished'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-600">
                      <FaRulerCombined className="text-lg text-green-600" />
                      <span>{listing.sqmeters} sq.m</span>
                    </li>
                    {listing.backupPower && (
                      <li className="flex items-center gap-2 text-gray-600">
                        <FaBolt className="text-lg text-green-600" />
                        <span>Backup Power</span>
                      </li>
                    )}
                    {listing.backupWaterSupply && (
                      <li className="flex items-center gap-2 text-gray-600">
                        <FaWater className="text-lg text-green-600" />
                        <span>Backup Water</span>
                      </li>
                    )}
                    {listing.boreholeWater && (
                      <li className="flex items-center gap-2 text-gray-600">
                        <FaTint className="text-lg text-green-600" />
                        <span>Borehole Water</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Map Section - Full height */}
                {coordinates && (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden h-full min-h-[calc(100vh-20rem)] sticky top-24">
                    <MapContainer
                      center={[coordinates.lat, coordinates.lng]}
                      zoom={15}
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker
                        position={[coordinates.lat, coordinates.lng]}
                        icon={customIcon}
                        eventHandlers={{
                          click: handleMarkerClick,
                        }}
                      >
                        <Popup>{listing.address}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                )}
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
