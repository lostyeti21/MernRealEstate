import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const LandlordListings = () => {
  const { landlordId } = useParams();
  const [landlord, setLandlord] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

const fetchLandlordData = async () => {
  try {
    setLoading(true);
    setError("");

    // Fetch landlord details
    const landlordRes = await fetch(`/api/user/${landlordId}`);
    if (!landlordRes.ok) {
      const errorData = await landlordRes.json();
      throw new Error(errorData.message || "Failed to fetch landlord details.");
    }
    const landlordData = await landlordRes.json();
    setLandlord(landlordData);

    // Fetch landlord's listings
    const listingsRes = await fetch(`/api/user/listings/${landlordId}`);
    if (!listingsRes.ok) {
      const errorData = await listingsRes.json();
      throw new Error(errorData.message || "Failed to fetch landlord's listings.");
    }
    const listingsData = await listingsRes.json();
    setListings(listingsData);

    setLoading(false);
  } catch (err) {
    console.error("Error fetching landlord data:", err.message);
    setError(err.message);
    setLoading(false);
  }
};

    fetchLandlordData();
  }, [landlordId]);

  if (loading) return <p className="text-center">Loading...</p>;
  if (error)
    return (
      <p className="text-center text-red-500">
        Error loading landlord information or listings: {error}
      </p>
    );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Landlord Information */}
      {landlord && (
        <div className="mb-6 p-4 border rounded-md shadow">
          <div className="flex items-center gap-4">
            <img
              src={landlord.avatar || "https://via.placeholder.com/150"}
              alt={landlord.username}
              className="rounded-full w-16 h-16 object-cover border"
            />
            <div>
              <h2 className="text-xl font-semibold">{landlord.username}</h2>
              <p className="text-sm text-gray-600">{landlord.email}</p>
              <p className="text-sm text-gray-600">
                Average Rating:{" "}
                {landlord.averageRating
                  ? landlord.averageRating.toFixed(1)
                  : "N/A"}{" "}
                ({landlord.totalRatings || 0} ratings)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Landlord Listings */}
      <h1 className="text-2xl font-bold mb-4">
        Listings by {landlord?.username || "Landlord"}
      </h1>

      {listings.length === 0 ? (
        <p className="text-center">No listings found for this landlord.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link to={`/listing/${listing._id}`} key={listing._id}>
              <div className="border rounded-md shadow hover:shadow-lg transition-shadow">
                <img
                  src={
                    listing.imageUrls?.[0] ||
                    "https://via.placeholder.com/300x200"
                  }
                  alt={listing.name}
                  className="w-full h-48 object-cover rounded-t-md"
                />
                <div className="p-4">
                  <h2 className="text-lg font-semibold">{listing.name}</h2>
                  <p className="text-gray-600">
                    {listing.type === "rent" ? "For Rent" : "For Sale"} - $
                    {listing.offer
                      ? listing.discountPrice.toLocaleString("en-US")
                      : listing.regularPrice.toLocaleString("en-US")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {listing.address || "No address provided"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Bedrooms: {listing.bedrooms}, Bathrooms: {listing.bathrooms}
                  </p>
                  <p className="text-sm text-gray-500">
                    {listing.parking ? "Parking available" : "No parking"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordListings;
