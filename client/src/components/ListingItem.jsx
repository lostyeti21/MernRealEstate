import { Link } from 'react-router-dom';
import { MdLocationOn } from 'react-icons/md';
import {
  FaBed,
  FaBath,
  FaParking,
  FaChair,
  FaBolt,
  FaWater,
  FaTint,
  FaCouch,
  FaFileContract
} from 'react-icons/fa';
import ImageOptimizer from './ImageOptimizer';

export default function ListingItem({ listing }) {
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
    userModel,
    apartmentType = 'House',
    lounges = 1,
    electricFence = false,
    walledOrFenced = false,
    electricGate = false,
    builtInCupboards = false,
    fittedKitchen = false,
    solarGeyser = false,
    leaseAgreementUrl,
    leaseAgreement,
    postedBy
  } = listing;

  // Format price with proper checks
  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('en-US');
  };

  // Determine the listing route based on userModel or postedBy.isAgent
  const listingRoute = userModel === 'Agent' || listing.postedBy?.isAgent 
    ? `/agent-listing/${_id}` 
    : `/listing/${_id}`;

  return (
    <div className='listing-item relative bg-white shadow-md hover:shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:scale-105 transition-all duration-300 overflow-hidden rounded-lg w-full sm:w-[330px] flex flex-col h-[430px] z-10 hover:z-20'>
      <div
        className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold ${
          type === 'sale' ? 'bg-[#009688] text-white' : 'bg-[#C9F2AC] text-[#333333]'
        }`}
        style={{ zIndex: 10 }}
      >
        {type === 'sale' ? 'For Sale' : 'For Rent'}
      </div>

      <div className="relative">
        <div className="overflow-hidden">
          <ImageOptimizer
            src={imageUrls?.[0] || 'https://via.placeholder.com/330x200'}
            alt='listing cover'
            className='listing-image h-[300px] sm:h-[220px] w-full object-cover transition-transform duration-700'
            placeholderSrc='https://via.placeholder.com/330x200?text=Loading...'
            width={330}
            height={220}
          />
        </div>
        {(leaseAgreementUrl || leaseAgreement) && (
          <div 
            className="absolute bottom-3 left-3 bg-white text-black px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-gray-300"
            style={{ zIndex: 10 }}
          >
            <FaFileContract className="mr-1 text-green-600" /> Lease Available to View
          </div>
        )}
        <div
          className={`absolute top-3 left-3 px-3 py-1 text-white text-xs font-semibold rounded-full ${
            apartmentType === 'House' ? 'bg-[#f14304]' :
            apartmentType === 'Flat/Apartment' ? 'bg-[#212620]' :
            apartmentType === 'Cluster' ? 'bg-[#39594D]' :
            apartmentType === 'Cottage' ? 'bg-[#A6330A]' :
            apartmentType === 'Garden Flat' ? 'bg-[#F26457]' :
            'bg-[#f14304]' // default to House color
          }`}
          style={{ zIndex: 10 }}
        >
          {apartmentType || 'House'}
        </div>
      </div>

      <Link to={listingRoute} className='flex flex-col h-full'>
        <div className='p-3 flex flex-col gap-2 w-full flex-grow'>
          <p className='truncate text-base font-semibold text-slate-700'>
            {name}
          </p>
          <div className='flex items-center gap-1 text-sm text-slate-600'>
            <MdLocationOn className='h-4 w-4 text-green-700' />
            <p className='truncate w-full text-sm'>{address}</p>
          </div>
          <p className='border border-[#16a349] bg-[#16a349] text-white w-fit px-3 py-1 rounded-full text-xs font-semibold mt-1'>
            ${formatPrice(regularPrice)}
            {type === 'rent' && ' / month'}
          </p>
          <p className='text-xs text-gray-600 line-clamp-3'>
            {description}
          </p>
          <div className='flex flex-wrap gap-1 mt-1 text-[10px] font-medium'>
            <div className='bg-[#d2d1e6] text-[#333333] px-2 py-1 rounded-full flex items-center gap-1'>
              <FaBed className='mr-1 text-xs' /> {bedrooms} {bedrooms > 1 ? 'Beds' : 'Bed'}
            </div>
            <div className='bg-[#d2d1e6] text-[#333333] px-2 py-1 rounded-full flex items-center gap-1'>
              <FaBath className='mr-1 text-xs' /> {bathrooms} {bathrooms > 1 ? 'Baths' : 'Bath'}
            </div>
          </div>
        </div>
        <div className='absolute bottom-3 right-3 group'>
          <div className='absolute inset-0 bg-[#212620] opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-[0.2em] group-hover:-translate-y-[0.33em]'></div>
          <div className='relative border border-[#212620] text-[#212620] px-3 py-1 text-xs font-semibold bg-white group-hover:translate-y-[-0.2em] transition-transform duration-300'>
            More Info
          </div>
        </div>
      </Link>
    </div>
  );
}
