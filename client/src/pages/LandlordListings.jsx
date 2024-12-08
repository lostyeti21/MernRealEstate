import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // useParams to get userId from URL

const LandlordListings = () => {
  const { userId } = useParams(); // Get the userId from the URL params
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Store the error message

  useEffect(() => {
    const fetchListings = async () => {
      try {
        console.log("Fetching listings for userId:", userId); // Debug log
        const res = await fetch(`/api/listing/landlord/${userId}`); // Ensure correct URL
        const data = await res.json();

        if (res.ok) {
          setListings(data);
        } else {
          throw new Error(data.message || "Failed to fetch listings");
        }
      } catch (err) {
        console.error("Error fetching listings:", err.message); // Log the error for debugging
        setError(err.message); // Store error message to show on the UI
      } finally {
        setLoading(false); // End the loading state
      }
    };

    if (userId) {
      fetchListings();
    }
  }, [userId]); // Run when userId changes

  if (loading) return (
    <div className="text-center">
      <p>Loading listings...</p>
      <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-500">
      <p>Failed to load listings: {error}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-blue-500 underline"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Listings by this Landlord</h1>
      {listings.length === 0 ? (
        <p className="text-center">No listings found for this landlord.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing._id} className="p-4 border rounded-lg shadow-lg hover:shadow-2xl transition-shadow">
              <img
                src={listing.imageUrls[0] || "https://via.placeholder.com/400x250"}
                alt={listing.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h2 className="font-semibold text-lg">{listing.name || "Untitled"}</h2>
              <p className="text-sm text-gray-500">{listing.address || "Address not available"}</p>
              <p className="text-green-600 font-bold mt-2">
                ${listing.regularPrice?.toLocaleString() || "Price not available"}
                {listing.type === "rent" && " / month"}
              </p>
              <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                <span>{listing.bedrooms} Beds</span>
                <span>{listing.bathrooms} Baths</span>
                <span>{listing.parking ? "Parking Available" : "No Parking"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordListings;
