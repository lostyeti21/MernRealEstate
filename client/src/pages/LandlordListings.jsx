import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const LandlordListings = () => {
  const { userId } = useParams(); // Get the userId from the URL params
  const [landlord, setLandlord] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Store the error message
  const [userRating, setUserRating] = useState(null); // Track the rating by the logged-in user
  const [hoveredRating, setHoveredRating] = useState(null); // Track the rating hovered by the user
  const [rated, setRated] = useState(false); // To check if user already rated

  useEffect(() => {
    const fetchLandlordAndListings = async () => {
      try {
        const resLandlord = await fetch(`/api/user/${userId}`);
        const landlordData = await resLandlord.json();
        if (!resLandlord.ok) throw new Error("Failed to fetch landlord details");

        const resListings = await fetch(`/api/listing/landlord/${userId}`);
        const listingsData = await resListings.json();
        if (!resListings.ok) throw new Error("Failed to fetch listings");

        setLandlord(landlordData);
        setListings(listingsData);
        setUserRating(landlordData.averageRating || null); // Set the landlord's average rating
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLandlordAndListings();
  }, [userId]);

  const handleRating = async (rating) => {
    try {
      const res = await fetch("/api/user/rate-landlord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ landlordId: userId, rating, type: "landlord" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRated(true);
        setUserRating(rating); // Update user rating after submitting
      } else {
        throw new Error(data.message || "Failed to submit rating");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Render stars based on average rating (landlord's rating)
  const renderStars = (avgRating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`cursor-pointer ${i <= avgRating ? "text-yellow-500" : "text-gray-300"}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Render the rating stars for user to select (show yellow if selected)
  const renderRatingStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          onClick={() => handleRating(i)} // Set rating on click
          onMouseEnter={() => setHoveredRating(i)} // Hover effect
          onMouseLeave={() => setHoveredRating(null)} // Reset hover effect
          className={`cursor-pointer ${i <= (hoveredRating || 0) ? "text-yellow-500" : "text-gray-300"}`} // 0 is default for no rating
        >
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Landlord Header */}
      <div className="mb-6 text-center">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center">
          <img
            src={landlord.avatar || "https://via.placeholder.com/150"}
            alt={landlord.username}
            className="rounded-full w-32 h-32 object-cover mb-4" // Adjust size here (w-32 h-32 for larger avatar)
          />
          <h1 className="text-3xl font-bold">{landlord.username}</h1>
        </div>

        {/* Rating Section */}
        <div className="mt-4">
          {landlord.averageRating ? (
            <div className="flex justify-center items-center">
              <span className="mr-2 text-xl">Rating:</span>
              <div className="flex text-xl">
                {renderStars(landlord.averageRating)} {/* Show average rating stars */}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">This landlord has never been rated.</p>
          )}
        </div>
      </div>

      {/* Rating Section (Only for Tenants) */}
      <div className="mb-6 text-center">
        {!rated && landlord && (
          <div>
            <h3 className="font-semibold text-xl">Rate this Landlord</h3>
            <div className="flex justify-center mt-2 text-2xl">
              {renderRatingStars()} {/* Render clickable stars */}
            </div>
          </div>
        )}
        {rated && <p className="text-lg">Thank you for your rating!</p>}
      </div>

      {/* Listings */}
      <h2 className="text-xl font-semibold mb-8 text-left">Listings by this Landlord</h2> {/* Left aligned */}
      {listings.length === 0 ? (
        <p className="text-center">No listings found for this landlord.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing._id} className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow p-4">
              <img
                src={listing.imageUrls[0]}
                alt={listing.name}
                className="w-full h-48 object-cover mb-4"
              />
              <h3 className="text-lg font-semibold">{listing.name}</h3>
              <p>{listing.address}</p>
              <p className="text-green-600 font-bold">
                ${listing.regularPrice.toLocaleString()}
              </p>
              <Link to={`/listing/${listing._id}`} className="text-blue-500">View Details</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordListings;
