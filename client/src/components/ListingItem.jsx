import { Link } from 'react-router-dom';
import { MdLocationOn } from 'react-icons/md';
import { FaBed, FaBath, FaParking, FaChair, FaExpand, FaBolt, FaTint, FaWater } from 'react-icons/fa';

export default function ListingItem({ listing }) {
  return (
    <div className='relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full sm:w-[330px]'>
      {/* Type Badge */}
      <div
        className={`absolute top-3 right-3 px-3 py-1 text-white text-xs font-semibold ${
          listing.type === 'sale' ? 'bg-purple-600' : 'bg-blue-600'
        }`}
        style={{ borderRadius: '0px' }} // Ensures the badge is a rectangle
      >
        {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
      </div>

      <Link to={`/listing/${listing._id}`}>
        {/* Listing Image */}
        <img
          src={
            listing.imageUrls[0] ||
            'https://53.fs1.hubspotusercontent-na1.net/hub/53/hubfs/Sales_Blog/real-estate-business-compressor.jpg?width=595&height=400&name=real-estate-business-compressor.jpg'
          }
          alt='listing cover'
          className='h-[320px] sm:h-[220px] w-full object-cover hover:scale-105 transition-scale duration-300'
        />

        {/* Listing Content */}
        <div className='p-3 flex flex-col gap-2 w-full'>
          {/* Name */}
          <p className='truncate text-lg font-semibold text-slate-700'>
            {listing.name}
          </p>

          {/* Address */}
          <div className='flex items-center gap-1'>
            <MdLocationOn className='h-4 w-4 text-green-700' />
            <p className='text-sm text-gray-600 truncate w-full'>
              {listing.address}
            </p>
          </div>

          {/* Description */}
          <p className='text-sm text-gray-600 line-clamp-2'>
            {listing.description}
          </p>

          {/* Price */}
          <p className='bg-green-600 text-white w-fit px-3 py-1 text-sm font-semibold mt-2'>
            $
            {listing.offer
              ? listing.discountPrice.toLocaleString('en-US')
              : listing.regularPrice.toLocaleString('en-US')}
            {listing.type === 'rent' && ' / month'}
          </p>

          {/* Features - Beds, Baths, Parking, Furnished, m², Backup Power, Backup Water, Borehole Water */}
          <div className='flex flex-wrap gap-2 mt-3 text-xs text-white font-medium'>
            <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
              <FaBed /> {listing.bedrooms} Beds
            </div>
            <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
              <FaBath /> {listing.bathrooms} Baths
            </div>
            <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
              <FaParking /> {listing.parking ? 'Parking spot' : 'No Parking'}
            </div>
            <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
              <FaChair /> {listing.furnished ? 'Furnished' : 'Unfurnished'}
            </div>
            <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
              <FaExpand /> {listing.m2} m²
            </div>
            {listing.backupPower && (
              <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
                <FaBolt /> Backup Power
              </div>
            )}
            {listing.backupWaterSupply && (
              <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
                <FaTint /> Backup Water
              </div>
            )}
            {listing.boreholeWater && (
              <div className='bg-green-900 px-3 py-1 flex items-center gap-1'>
                <FaWater /> Borehole Water
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
