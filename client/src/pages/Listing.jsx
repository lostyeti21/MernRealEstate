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
} from "react-icons/fa";
import Contact from "../components/Contact";

const Listing = () => {
  SwiperCore.use([Navigation]);

  const params = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);

  const [listing, setListing] = useState(null);
  const [landlord, setLandlord] = useState(null); // Landlord data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [contact, setContact] = useState(false);

  const defaultLat = -34.397;
  const defaultLng = 150.644;

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

        // Fetch the landlord's data
        const landlordData = await fetchLandlordData(data.userRef);
        setLandlord(landlordData);
      } catch (err) {
        console.error("Error fetching listing or landlord:", err);
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

          {/* Fullscreen Modal */}
          {showFullscreen && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
              <button
                className="absolute top-5 right-5 text-white text-3xl z-10 hover:text-gray-300"
                onClick={() => setShowFullscreen(false)}
              >
                <FaTimes />
              </button>
              <Swiper navigation initialSlide={fullscreenIndex} className="w-full h-full">
                {listing.imageUrls?.map((url, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={url}
                      alt={`Fullscreen ${index + 1}`}
                      className="object-contain w-full h-full"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row max-w-6xl mx-auto my-7 gap-6">
            {/* Left Column */}
            <div className="flex flex-col flex-1">
              {/* Landlord Section */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={landlord?.avatar || "default-avatar.png"}
                    alt="Landlord"
                    className="rounded-full h-16 w-16 object-cover"
                  />
                  <div>
                    <p className="text-lg font-semibold text-slate-700">
                      Listed by {landlord?.username || "Unknown Landlord"}
                    </p>
                    <div className="flex items-center">
                      {renderStars(landlord?.averageRating || 0)}
                    </div>
                    <div className="mt-2">
                      {landlord?.phoneNumbers?.length > 0 ? (
                        landlord.phoneNumbers.map((phone, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-gray-600 text-sm"
                            onClick={() =>
                              !currentUser &&
                              alert("Please sign in to view the phone number.")
                            }
                          >
                            <FaPhoneAlt className="text-green-600" />
                            <span>{currentUser ? phone : "*********"}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <FaPhoneAlt className="text-green-600" />
                          <span>N/A</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {currentUser && (
                  <button
                    onClick={() => navigate(`/landlord/${listing.userRef}`)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm"
                  >
                    Rate this Landlord
                  </button>
                )}
              </div>

              {/* Title, Address, and Price */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-2xl font-semibold mb-1">{listing.name}</p>
                <p className="text-gray-500 text-sm mb-4 flex items-center gap">
                  <FaMapMarkerAlt className="text-red-500" /> {listing.address}
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
                </ul>
                {currentUser && listing.userRef !== currentUser._id && !contact && (
                  <button
                    onClick={() => setContact(true)}
                    className="bg-slate-700 text-white rounded-lg uppercase p-3 hover:opacity-95 mt-4 w-full text-center"
                  >
                    Send an email to Landlord
                  </button>
                )}
                {contact && <Contact listing={listing} />}
              </div>
            </div>

            {/* Right Column - Map */}
            <div
              className={`flex-1 h-[600px] lg:h-auto rounded-lg overflow-hidden shadow-md ${
                showFullscreen ? "hidden" : ""
              }`}
            >
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
        </div>
      )}
    </main>
  );
};

export default Listing;
