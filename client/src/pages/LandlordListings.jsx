import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const LandlordListings = () => {
  const { userId } = useParams();
  const [landlord, setLandlord] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState({
    responseTime: 0,
    maintenance: 0,
    experience: 0,
  });
  const [hoveredRating, setHoveredRating] = useState({
    responseTime: 0,
    maintenance: 0,
    experience: 0,
  });
  const [rated, setRated] = useState(false);

  useEffect(() => {
    const fetchLandlordData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/landlord/${userId}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.message);
          return;
        }

        setLandlord(data.landlord);
        setListings(data.listings);
      } catch (error) {
        setError("Failed to fetch landlord data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLandlordData();
  }, [userId]);

  const fetchUpdatedLandlord = async () => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      const updatedLandlord = await res.json();
      if (res.ok) {
        setLandlord(updatedLandlord);
      } else {
        throw new Error("Failed to fetch updated landlord data");
      }
    } catch (error) {
      console.error("Error fetching updated landlord data:", error);
    }
  };

  const isValidRating = (rating) => rating >= 1 && rating <= 5;

  const handleRating = async () => {
    const { responseTime, maintenance, experience } = ratings;

    if (
      !isValidRating(responseTime) ||
      !isValidRating(maintenance) ||
      !isValidRating(experience)
    ) {
      alert("Each rating must be a valid number between 1 and 5.");
      return;
    }

    try {
      const res = await fetch("/api/user/rate-landlord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          landlordId: userId,
          responseTime,
          maintenance,
          experience,
        }),
      });

      if (res.ok) {
        setRated(true);
        await fetchUpdatedLandlord();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit rating");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const renderRatingStars = (category) => {
    const categoryRating = ratings[category] || 0;
    const hoveredCategoryRating = hoveredRating[category] || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        onClick={() => setRatings({ ...ratings, [category]: i + 1 })}
        onMouseEnter={() => setHoveredRating({ ...hoveredRating, [category]: i + 1 })}
        onMouseLeave={() => setHoveredRating({ ...hoveredRating, [category]: 0 })}
        className={`cursor-pointer ${
          i + 1 <= (hoveredCategoryRating || categoryRating)
            ? "text-yellow-500"
            : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
  };

  const renderLandlordRating = (avgRating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i + 1}
        className={`text-xl ${i + 1 <= avgRating ? "text-yellow-500" : "text-gray-300"}`}
      >
        ★
      </span>
    ));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img
            src={landlord.avatar || "https://via.placeholder.com/150"}
            alt={landlord.username}
            className="rounded-full w-32 h-32 object-cover"
          />
          <h1 className="text-3xl font-bold">{landlord.username}</h1>
        </div>
        <div>
          <span className="mr-2 text-xl font-semibold">Rating:</span>
          <div className="flex text-xl">
            {landlord.averageRating
              ? renderLandlordRating(landlord.averageRating)
              : "No ratings yet"}
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold mb-4">Rate this Landlord</h3>
        <div className="p-6 border-2 border-gray-300 rounded-lg bg-gray-100 inline-block">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <h4>Response Time</h4>
              <div className="flex">{renderRatingStars("responseTime")}</div>
            </div>
            <div className="text-center">
              <h4>Maintenance</h4>
              <div className="flex">{renderRatingStars("maintenance")}</div>
            </div>
            <div className="text-center">
              <h4>Experience</h4>
              <div className="flex">{renderRatingStars("experience")}</div>
            </div>
          </div>
          <div className="mt-4">
            <h4>
              Total Rating:{" "}
              {(
                (ratings.responseTime + ratings.maintenance + ratings.experience) /
                3
              ).toFixed(1)}{" "}
              / 5.0
            </h4>
          </div>
          <div className="mt-6">
            <button
              onClick={handleRating}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            >
              Submit Rating
            </button>
          </div>
        </div>
        {rated && <p className="text-lg mt-4">Thank you for your rating!</p>}
      </div>

      <h2 className="text-xl font-semibold mb-8 text-left">Listings by this Landlord</h2>
      {listings.length === 0 ? (
        <p className="text-center">No listings found for this landlord.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow p-4"
            >
              <img
                src={listing.imageUrls[0]}
                alt={listing.name}
                className="w-full h-48 object-cover mb-4"
              />
              <h3 className="text-lg font-semibold">{listing.name}</h3>
              <p>{listing.address}</p>
              <p className="text-green-600 font-bold">
                ${listing.regularPrice.toLocaleString()}
                {listing.type === 'rent' && ' / month'}
              </p>
              <Link to={`/listing/${listing._id}`} className="text-blue-500">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordListings;
