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
  FaShare,
  FaTimes,
} from "react-icons/fa";
import Contact from "../components/Contact";

const Listing = () => {
  SwiperCore.use([Navigation]);

  const params = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const defaultLat = -34.397;
  const defaultLng = 150.644;

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listing/get/${params.listingId}`);
        const data = await res.json();

        if (!data || data.success === false) {
          setError(true);
          setLoading(false);
          return;
        }

        if (!data.lat || !data.lng) {
          const geocodedLocation = await geocodeAddress(data.address);
          if (geocodedLocation) {
            data.lat = geocodedLocation.lat;
            data.lng = geocodedLocation.lng;
          }
        }

        setListing(data);
        setError(false);
      } catch (err) {
        console.error("Error fetching listing:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [params.listingId]);

  const customIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const handleImageClick = (index) => {
    setFullscreenIndex(index);
    setShowFullscreen(true);
  };

  const handleAddressClick = () => {
    if (listing.address) {
      const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(
        listing.address
      )}`;
      window.open(googleMapsUrl, "_blank");
    }
  };

  const handleMarkerClick = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`;
    window.open(googleMapsUrl, "_blank");
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

  return (
    <main>
      {loading && <p className="text-center my-7 text-2xl">Loading...</p>}
      {error && (
        <p className="text-center my-7 text-2xl text-red-500">
          Something went wrong. Please try again later.
        </p>
      )}
      {listing && !loading && !error && (
        <div>
          {/* Swiper for Images */}
          <Swiper
            navigation
            slidesPerView={listing.imageUrls.length > 2 ? 3 : 2}
            centeredSlides={listing.imageUrls.length < 3}
            spaceBetween={20}
            breakpoints={{
              640: { slidesPerView: listing.imageUrls.length > 2 ? 2 : 1 },
              1024: { slidesPerView: listing.imageUrls.length > 2 ? 3 : 2 },
            }}
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

          {/* Fullscreen Modal */}
          {showFullscreen && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
              <button
                className="absolute top-5 right-5 text-white text-3xl z-10"
                onClick={() => setShowFullscreen(false)}
              >
                <FaTimes />
              </button>
              <Swiper navigation initialSlide={fullscreenIndex}>
                {listing.imageUrls?.map((url, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={url}
                      alt={`Fullscreen ${index + 1}`}
                      className="object-contain h-full w-full"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}

          {/* Main Content */}
          {!showFullscreen && (
            <div className="flex flex-col lg:flex-row max-w-6xl mx-auto my-7 gap-6">
              {/* Left Column - Landlord and Details */}
              <div className="flex flex-col flex-1">
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  {listing.landlord && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <img
                          src={listing.landlord.avatar || "default-avatar.png"}
                          alt="Landlord"
                          className="rounded-full h-16 w-16 object-cover"
                        />
                        <div>
                          <p className="text-lg font-semibold text-slate-700">
                            Listed by {listing.landlord.username || "Unknown Landlord"}
                          </p>
                          <div className="flex items-center">
                            {renderStars(listing.landlord.averageRating || 0)}
                          </div>
                        </div>
                      </div>
                      {currentUser && (
                        <button
                          onClick={() => navigate(`/landlord/${listing.userRef}`)}
                          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 w-[120px]"
                        >
                          Rate this Landlord
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-2xl font-semibold mb-4">
                    {listing.name} - $
                    {listing.offer
                      ? listing.discountPrice.toLocaleString("en-US")
                      : listing.regularPrice.toLocaleString("en-US")}
                    {listing.type === "rent" && " / month"}
                  </p>
                  <p
                    onClick={handleAddressClick}
                    className="flex items-center gap-2 text-slate-600 text-sm cursor-pointer hover:underline mb-4"
                  >
                    <FaMapMarkerAlt className="text-green-700" />
                    {listing.address || "Address not provided"}
                  </p>
                  <div className="flex gap-4 mb-4">
                    <p className="bg-red-900 text-white text-center p-2 rounded-md">
                      {listing.type === "rent" ? "For Rent" : "For Sale"}
                    </p>
                    {listing.offer && (
                      <p className="bg-green-900 text-white text-center p-2 rounded-md">
                        ${+listing.regularPrice - +listing.discountPrice} OFF
                      </p>
                    )}
                  </div>
                  <p className="text-slate-800 mb-4">
                    <span className="font-semibold text-black">Description - </span>
                    {listing.description}
                  </p>
                  <ul className="text-green-900 font-semibold text-sm flex flex-wrap gap-4">
                    <li className="flex items-center gap-1">
                      <FaBed className="text-lg" />
                      {listing.bedrooms > 1
                        ? `${listing.bedrooms} beds`
                        : `${listing.bedrooms} bed`}
                    </li>
                    <li className="flex items-center gap-1">
                      <FaBath className="text-lg" />
                      {listing.bathrooms > 1
                        ? `${listing.bathrooms} baths`
                        : `${listing.bathrooms} bath`}
                    </li>
                    <li className="flex items-center gap-1">
                      <FaParking className="text-lg" />
                      {listing.parking ? "Parking spot" : "No Parking"}
                    </li>
                    <li className="flex items-center gap-1">
                      <FaChair className="text-lg" />
                      {listing.furnished ? "Furnished" : "Unfurnished"}
                    </li>
                  </ul>
                  {currentUser && listing.userRef !== currentUser._id && !contact && (
                    <button
                      onClick={() => setContact(true)}
                      className="bg-slate-700 text-white rounded-lg uppercase p-3 hover:opacity-95 mt-4"
                    >
                      Contact Landlord
                    </button>
                  )}
                  {contact && <Contact listing={listing} />}
                </div>
              </div>

              {/* Right Column - Map */}
              <div className="flex-1 h-[600px] lg:h-auto rounded-lg overflow-hidden shadow-md">
                <MapContainer
                  center={[listing.lat || defaultLat, listing.lng || defaultLng]}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    position={[listing.lat || defaultLat, listing.lng || defaultLng]}
                    icon={customIcon}
                    eventHandlers={{ click: handleMarkerClick }}
                  >
                    <Popup>Click for Directions</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default Listing;
