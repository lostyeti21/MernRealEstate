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
    _id,
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
    boreholeWater,
    apartmentType,
    userModel,
    postedBy
  } = listing;

  // Format price with proper checks
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('en-US');
  };

  // Determine the listing route based on userModel or postedBy.isAgent
  const listingRoute = userModel === 'Agent' || postedBy?.isAgent 
    ? `/agent-listing/${_id}` 
    : `/listing/${_id}`;

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
        <div className="grid grid-rows-1 h-full p-4 relative">
          {/* Main Image */}
          <Link to={listingRoute} className="relative h-full w-full overflow-hidden group cursor-pointer">
            <div className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold z-10 ${
              type === 'sale' 
                ? 'bg-[#009688] text-white' 
                : 'bg-[#c9f2ac] text-[#333333]'
            }`}>
              {type === 'sale' ? 'For Sale' : 'For Rent'}
            </div>
            <div
              className={`absolute top-3 left-3 px-3 py-1 text-white text-xs font-semibold rounded-full z-10 ${
                listing.apartmentType === 'House' ? 'bg-[#f14304]' :
                listing.apartmentType === 'Flat/Apartment' ? 'bg-[#212620]' :
                listing.apartmentType === 'Cluster' ? 'bg-[#39594D]' :
                listing.apartmentType === 'Cottage' ? 'bg-[#A6330A]' :
                listing.apartmentType === 'Garden Flat' ? 'bg-[#F26457]' :
                'bg-[#f14304]' // default to House color
              }`}
            >
              {listing.apartmentType || 'House'}
            </div>
            <img 
              src={imageUrls[0]} 
              alt="Featured Property" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              style={{ objectPosition: 'center' }}
            />
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
              <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg">
                <h3 className="text-white font-semibold text-lg">
                  {name}
                </h3>
                <div className="flex items-center gap-2 text-white mt-1">
                  <MdLocationOn className='h-4 w-4 text-green-400' />
                  <p className="text-sm truncate">{address}</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <p className="bg-[#16a348] text-white px-3 py-1 rounded-full text-sm font-semibold w-fit">
                    ${offer ? formatPrice(discountPrice) : formatPrice(regularPrice)}
                    {type === 'rent' && ' / month'}
                  </p>
                  <div className='group w-fit'>
                    <div className='relative border border-[#212620] text-[#212620] px-3 py-1 text-xs font-semibold bg-white transition-transform duration-300 hover:scale-105'>
                      More Info
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
