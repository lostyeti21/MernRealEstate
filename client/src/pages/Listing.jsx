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

  const defaultLat = -34.397; // Replace with default latitude
  const defaultLng = 150.644; // Replace with default longitude

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

        // If lat and lng are missing, geocode the address
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
          <Swiper navigation>
            {listing.imageUrls?.map((url) => (
              <SwiperSlide key={url}>
                <div
                  className="h-[550px] rounded-3xl overflow-hidden"
                  style={{
                    background: `url(${url}) center no-repeat`,
                    backgroundSize: "cover",
                  }}
                ></div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Landlord Details */}
          {listing.landlord && (
            <div className="flex flex-col gap-2 mt-4 mx-4">
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

          {/* Share Button */}
          <div className="fixed top-[13%] right-[3%] z-10 border rounded-full w-12 h-12 flex justify-center items-center bg-slate-100 cursor-pointer">
            <FaShare
              className="text-slate-500"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          </div>
          {copied && (
            <p className="fixed top-[23%] right-[5%] z-10 rounded-md bg-slate-100 p-2">
              Link Copied!
            </p>
          )}

          {/* Listing Details */}
          <div className="flex flex-col max-w-4xl mx-auto p-3 my-7 gap-4">
            <p className="text-2xl font-semibold">
              {listing.name} - $
              {listing.offer
                ? listing.discountPrice.toLocaleString("en-US")
                : listing.regularPrice.toLocaleString("en-US")}
              {listing.type === "rent" && " / month"}
            </p>
            <p
              onClick={handleAddressClick}
              className="flex items-center mt-6 gap-2 text-slate-600 text-sm cursor-pointer hover:underline"
            >
              <FaMapMarkerAlt className="text-green-700" />
              {listing.address || "Address not provided"}
            </p>

            <div className="flex gap-4">
              <p className="bg-red-900 w-full max-w-[200px] text-white text-center p-1 rounded-md">
                {listing.type === "rent" ? "For Rent" : "For Sale"}
              </p>
              {listing.offer && (
                <p className="bg-green-900 w-full max-w-[200px] text-white text-center p-1 rounded-md">
                  ${+listing.regularPrice - +listing.discountPrice} OFF
                </p>
              )}
            </div>
            <p className="text-slate-800">
              <span className="font-semibold text-black">Description - </span>
              {listing.description}
            </p>
            <ul className="text-green-900 font-semibold text-sm flex flex-wrap items-center gap-4 sm:gap-6">
              <li className="flex items-center gap-1 whitespace-nowrap ">
                <FaBed className="text-lg" />
                {listing.bedrooms > 1
                  ? `${listing.bedrooms} beds`
                  : `${listing.bedrooms} bed`}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap ">
                <FaBath className="text-lg" />
                {listing.bathrooms > 1
                  ? `${listing.bathrooms} baths`
                  : `${listing.bathrooms} bath`}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap ">
                <FaParking className="text-lg" />
                {listing.parking ? "Parking spot" : "No Parking"}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap ">
                <FaChair className="text-lg" />
                {listing.furnished ? "Furnished" : "Unfurnished"}
              </li>
            </ul>

            {currentUser && listing.userRef !== currentUser._id && !contact && (
              <button
                onClick={() => setContact(true)}
                className="bg-slate-700 text-white rounded-lg uppercase p-3 hover:opacity-95"
              >
                Contact Landlord
              </button>
            )}
            {contact && <Contact listing={listing} />}

            {/* Map Section */}
            <div className="mt-10">
              <h3 className="text-lg font-bold mb-3">Location</h3>
              <div className="h-[400px] w-full rounded-lg overflow-hidden shadow">
                <MapContainer
                  center={[
                    listing.lat || defaultLat,
                    listing.lng || defaultLng,
                  ]}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker
                    position={[
                      listing.lat || defaultLat,
                      listing.lng || defaultLng,
                    ]}
                    icon={customIcon}
                    eventHandlers={{
                      click: handleMarkerClick,
                    }}
                  >
                    <Popup>Click for Directions</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Listing;
