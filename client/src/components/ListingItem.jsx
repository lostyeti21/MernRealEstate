import { Link } from 'react-router-dom';
import { MdLocationOn } from 'react-icons/md';
import {
  FaBed,
  FaBath,
  FaParking,
  FaChair,
  FaBolt,
  FaWater,
  FaTint
} from 'react-icons/fa';

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
    <div className='relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full sm:w-[330px]'>
      <div
        className={`absolute top-3 right-3 px-3 py-1 text-white text-xs font-semibold ${
          type === 'sale' ? 'bg-purple-600' : 'bg-blue-600'
        }`}
        style={{ zIndex: 10 }}
      >
        {type === 'sale' ? 'For Sale' : 'For Rent'}
      </div>

      <Link to={`/listing/${_id}`}>
        <img
          src={imageUrls?.[0] || 'https://via.placeholder.com/330x200'}
          alt='listing cover'
          className='h-[320px] sm:h-[220px] w-full object-cover hover:scale-105 transition-scale duration-300'
        />
        <div className='p-3 flex flex-col gap-2 w-full'>
          <p className='truncate text-lg font-semibold text-slate-700'>
            {name}
          </p>
          <div className='flex items-center gap-1'>
            <MdLocationOn className='h-4 w-4 text-green-700' />
            <p className='text-sm text-gray-600 truncate w-full'>
              {address}
            </p>
          </div>
          <p className='text-sm text-gray-600 line-clamp-2'>
            {description}
          </p>
          <p className='bg-green-600 text-white w-fit px-3 py-1 rounded-full text-sm font-semibold mt-2'>
            ${displayPrice}
            {type === 'rent' && ' / month'}
          </p>
          <div className='flex flex-wrap gap-2 mt-3 text-xs text-white font-medium'>
            <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
              <FaBed /> {bedrooms} {bedrooms > 1 ? 'Beds' : 'Bed'}
            </div>
            <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
              <FaBath /> {bathrooms} {bathrooms > 1 ? 'Baths' : 'Bath'}
            </div>
            {parking && (
              <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
                <FaParking /> Parking
              </div>
            )}
            {furnished && (
              <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
                <FaChair /> Furnished
              </div>
            )}
            {backupPower && (
              <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
                <FaBolt /> Backup Power
              </div>
            )}
            {backupWaterSupply && (
              <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
                <FaWater /> Backup Water
              </div>
            )}
            {boreholeWater && (
              <div className='bg-green-900 px-3 py-1 rounded-full flex items-center gap-1'>
                <FaTint /> Borehole
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
