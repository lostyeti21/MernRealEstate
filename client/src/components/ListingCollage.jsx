import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MdLocationOn } from 'react-icons/md';
import { Link } from 'react-router-dom';
import {
  FaBed,
  FaBath,
  FaParking,
  FaChair,
  FaMapMarkerAlt,
  FaBolt,
  FaWater,
  FaTint
} from 'react-icons/fa';
import { geocodeAddress } from "../../../api/utils/geocode";

const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function ListingCollage({ listing }) {
  const [coordinates, setCoordinates] = useState(null);

  useEffect(() => {
    if (listing) {
      const getCoordinates = async () => {
        try {
          const coords = await geocodeAddress(listing.address);
          if (coords) {
            setCoordinates(coords);
          } else {
            setCoordinates({ lat: -17.8216, lng: 31.0492 }); // Default to Harare, Zimbabwe
          }
        } catch (error) {
          console.error('Error getting coordinates:', error);
          setCoordinates({ lat: -17.8216, lng: 31.0492 }); // Default to Harare, Zimbabwe
        }
      };
      getCoordinates();
    } else {
      // Set default coordinates to Harare even when no listing is available
      setCoordinates({ lat: -17.8216, lng: 31.0492 });
    }
  }, [listing]);

  const handleMarkerClick = () => {
    if (listing) {
      const address = encodeURIComponent(listing.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    }
  };

  if (!listing) return null;

  const {
    imageUrls,
    name,
    address,
    description,
    offer,
    discountPrice = 0,
    regularPrice = 0,
    type,
    bedrooms = 1,
    bathrooms = 1,
    parking,
    furnished,
    backupPower,
    backupWaterSupply,
    boreholeWater
  } = listing;

  // Format price with proper checks
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('en-US');
  };

  // Determine the display price
  const displayPrice = offer ? formatPrice(discountPrice) : formatPrice(regularPrice);

  return (
    <div className="mb-1 bg-white rounded-lg shadow-xl overflow-hidden relative z-40 mt-[40px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        {/* Left side - Map */}
        <div className="relative h-full w-full rounded-lg overflow-hidden">
          {coordinates ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={9}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker 
                position={[coordinates.lat, coordinates.lng]} 
                icon={customIcon}
                eventHandlers={{
                  click: handleMarkerClick,
                }}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{name}</p>
                    <p>{address}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-100">
              <FaMapMarkerAlt className="text-4xl text-gray-400" />
            </div>
          )}
        </div>

        {/* Right side - Main Image and Features */}
        <div className="grid grid-rows-1 h-full p-4">
          {/* Main Image */}
          <Link to={`/listing/${listing._id}`} className="relative h-full w-full overflow-hidden group cursor-pointer">
            <div
              className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold ${
                type === 'sale' ? 'bg-[#009688] text-white' : 'bg-[#C9F2AC] text-[#333333]'
              }`}
              style={{ zIndex: 10 }}
            >
              {type === 'sale' ? 'For Sale' : 'For Rent'}
            </div>
            <img 
              src={imageUrls[0]} 
              alt="Featured Property" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              style={{ objectPosition: 'center' }}
            />
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
              <div className="flex items-center text-gray-600 mt-1">
                <MdLocationOn className="text-green-600" />
                <p>{address}</p>
              </div>
              <p className="mt-2 border border-[#333333] bg-white text-[#333333] w-fit px-3 py-1 rounded-full text-sm font-semibold">
                ${displayPrice}
                {type === 'rent' && ' / month'}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
