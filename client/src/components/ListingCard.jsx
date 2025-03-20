import { Link } from 'react-router-dom';

export default function ListingCard({ listing, navigatePath }) {
  // Determine the listing route based on userModel or postedBy.isAgent
  const listingRoute = listing.userModel === 'Agent' || listing.postedBy?.isAgent 
    ? `/agent-listing/${listing._id}` 
    : `/listing/${listing._id}`;

  return (
    <div className="bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full sm:w-[330px] relative">
      <Link to={navigatePath || listingRoute}>
        <img
          src={listing.imageUrls[0] || '/default-house.jpg'}
          alt="listing cover"
          className="listing-image h-[320px] sm:h-[220px] w-full object-cover transition-transform duration-700"
        />
        <div className="p-3 flex flex-col gap-2 w-full">
          <p className="truncate text-lg font-semibold text-slate-700">
            {listing.title || listing.name}
          </p>
          <p className="text-sm text-gray-600 line-clamp-2">
            {listing.address}
          </p>
          <p className="text-slate-500 mt-2 font-semibold">
            $
            {listing.offer
              ? listing.discountPrice.toLocaleString('en-US')
              : listing.regularPrice.toLocaleString('en-US')}
            {listing.type === 'rent' && ' / month'}
          </p>
          <div className="text-slate-700 flex gap-4">
            <div className="font-bold text-xs">
              {listing.bedrooms > 1
                ? `${listing.bedrooms} beds `
                : `${listing.bedrooms} bed `}
            </div>
            <div className="font-bold text-xs">
              {listing.bathrooms > 1
                ? `${listing.bathrooms} baths `
                : `${listing.bathrooms} bath `}
            </div>
          </div>
          {listing.type && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              listing.type === 'rent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
            </span>
          )}
          {listing.featured && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
              Featured
            </span>
          )}
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
