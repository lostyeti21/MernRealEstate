import React, { useState, useEffect } from 'react';
import { FaSearch, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import bannerImage from '../assets/be.jpg';

// Import neighborhood images
import sandtonImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Borrowdale Brook.jpg';
import rosebanImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Borrowdale.jpg';
import melvilleImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Chisipite.jpg';
import fourwaysImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Greendale.jpg';
import parkviewImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Harare city center.webp';
import northcliffImage from '/Users/ishe/Desktop/MERN-ESTATE/client/src/assets/Locations/Highlands.jpg';

// Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// Placeholder for Google Places API service
const fetchNeighborhoodMetrics = async (latitude, longitude) => {
  // In a real implementation, this would be a backend API call to Google Places
  // For now, we'll use hardcoded data with a comment about API integration
  return {
    schools: 5,  // TODO: Replace with actual Google Places API call
    shoppingCentres: 3,
    fuelStations: 4,
    restaurants: 15,
    parks: 2,
    hospitals: 2
  };
};

export default function NeighborhoodGuides() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);

  const neighborhoods = [
    {
      name: 'Borrowdale Brooke',
      description: 'Borrowdale Brooke Golf Estate is an upmarket, plush and exclusive residential estate in the northern part of Harare,',
      image: sandtonImage,
      averagePrice: 'USD 200,000 - USD 2,900,000 ',
      location: [-17.8252, 31.0335],
      areaMetrics: {
        schools: 5,
        shoppingCentres: 2,
        fuelStations: 3,
        restaurants: 10,
        parks: 2,
        hospitals: 1
      }
    },
    {
      name: 'Borrowdale',
      description: 'Borrowdale, situated in the northern suburbs of Harare, is renowned for its luxury real estate and lush, green surroundings.',
      image: rosebanImage,
      averagePrice: 'USD 40,500 - USD 1,400,000 ',
      location: [-17.8089, 31.0521],
      areaMetrics: {
        schools: 7,
        shoppingCentres: 3,
        fuelStations: 4,
        restaurants: 15,
        parks: 3,
        hospitals: 2
      }
    },
    {
      name: 'Chisipite',
      description: 'Chisipite, located to the northeast of Harare, is a family-oriented neighborhood known for its well-balanced living environment.',
      image: melvilleImage,
      averagePrice: 'USD 180,000 - USD 1,200,000',
      location: [-17.8089, 31.0521],
      areaMetrics: {
        schools: 6,
        shoppingCentres: 2,
        fuelStations: 3,
        restaurants: 12,
        parks: 2,
        hospitals: 1
      }
    },
    {
      name: 'Greendale',
      description: 'Greendale is a well-established suburb located in the eastern part of Harare.',
      image: fourwaysImage,
      averagePrice: 'USD 40,000 - USD 1,000,000',
      location: [-17.8089, 31.0521],
      areaMetrics: {
        schools: 4,
        shoppingCentres: 1,
        fuelStations: 2,
        restaurants: 8,
        parks: 1,
        hospitals: 1
      }
    },
    {
      name: 'Harare City Center',
      description: 'Harare City Centre is the vibrant heart of Zimbabwes capital, offering visitors a unique blend of historical significance and contemporary allure',
      image: parkviewImage,
      averagePrice: 'USD 32,000 - USD 6,500,000',
      location: [-17.8252, 31.0335],
      areaMetrics: {
        schools: 3,
        shoppingCentres: 5,
        fuelStations: 6,
        restaurants: 25,
        parks: 1,
        hospitals: 3
      }
    },
    {
      name: 'Highlands',
      description: 'Highlands is an upper-middle income, residential suburb nestled between Borrowdale and Newlands in the east of Harare',
      image: northcliffImage,
      averagePrice: 'USD 100,000 - USD 4,800,000',
      location: [-17.8089, 31.0521],
      areaMetrics: {
        schools: 5,
        shoppingCentres: 2,
        fuelStations: 3,
        restaurants: 14,
        parks: 2,
        hospitals: 2
      }
    }
  ];

  const filteredNeighborhoods = neighborhoods.filter(neighborhood => 
    neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Neighborhood Guides</h1>
      
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <input 
            type="text"
            placeholder="Search neighborhoods..."
            className="w-full p-3 border border-gray-300 rounded-none focus:outline-none focus:border-black focus:shadow-[-5px_-5px_0px_black]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Banner Section */}
      <div className="relative w-full h-[400px] mb-12 overflow-hidden">
        <img 
          src={bannerImage} 
          alt="Neighborhood Landscape" 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 right-0 p-8 bg-black bg-opacity-50 text-white">
          <h2 className="text-3xl font-bold">Most Popular Neighbourhoods</h2>
        </div>
      </div>

      {/* Neighborhood Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {filteredNeighborhoods.map((neighborhood) => (
          <div 
            key={neighborhood.name} 
            className="border shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer"
            onClick={() => setSelectedNeighborhood(neighborhood)}
          >
            <div className="h-64 overflow-hidden">
              <img 
                src={neighborhood.image} 
                alt={neighborhood.name} 
                className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-3 flex items-center">
                <FaMapMarkerAlt className="text-red-500 mr-2" />
                {neighborhood.name}
              </h2>
              <p className="text-gray-600 mb-4">{neighborhood.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#009688]">Avg. Property Price</span>
                <span className="text-lg font-semibold">{neighborhood.averagePrice}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Neighborhood Popup */}
      {selectedNeighborhood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto grid md:grid-cols-2 gap-8 p-8 relative">
            <button 
              onClick={() => setSelectedNeighborhood(null)}
              className="absolute top-4 right-4 text-3xl text-gray-600 hover:text-red-600"
            >
              <FaTimes />
            </button>
            
            {/* Large Image */}
            <div className="w-full h-[600px] overflow-hidden">
              <img 
                src={selectedNeighborhood.image} 
                alt={selectedNeighborhood.name} 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Map */}
            <div className="w-full h-[600px]">
              <MapContainer 
                center={selectedNeighborhood.location} 
                zoom={13} 
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={selectedNeighborhood.location}>
                  <Popup>
                    {selectedNeighborhood.name}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            
            {/* Neighborhood Details */}
            <div className="md:col-span-2 mt-6">
              <h2 className="text-3xl font-bold mb-4">{selectedNeighborhood.name}</h2>
              <p className="text-gray-700 mb-4">{selectedNeighborhood.description}</p>
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-xl text-[#009688]">Average Property Price</span>
                <span className="text-2xl font-semibold">{selectedNeighborhood.averagePrice}</span>
              </div>

              {/* Area Metrics */}
              <div className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Neighborhood Amenities</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{selectedNeighborhood.areaMetrics.schools}</div>
                    <div className="text-gray-600">Schools</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{selectedNeighborhood.areaMetrics.shoppingCentres}</div>
                    <div className="text-gray-600">Shopping Centres</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{selectedNeighborhood.areaMetrics.fuelStations}</div>
                    <div className="text-gray-600">Fuel Stations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{selectedNeighborhood.areaMetrics.restaurants}</div>
                    <div className="text-gray-600">Restaurants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{selectedNeighborhood.areaMetrics.parks}</div>
                    <div className="text-gray-600">Parks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{selectedNeighborhood.areaMetrics.hospitals}</div>
                    <div className="text-gray-600">Hospitals</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
