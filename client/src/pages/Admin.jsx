import React, { useState, useEffect } from "react";

const Admin = () => {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await fetch("/api/listing/get");
        const data = await res.json();
        setListings(data);
      } catch (error) {
        setError("Failed to fetch listings.");
      }
    };

    fetchListings();
  }, []);

  const handleHighlight = async (id) => {
    try {
      const res = await fetch(`/api/listing/highlight/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to highlight listing.");
      const updatedListing = await res.json();

      setListings((prev) =>
        prev.map((listing) =>
          listing._id === updatedListing.listing._id
            ? updatedListing.listing
            : listing
        )
      );
    } catch (error) {
      setError("Failed to highlight the listing.");
    }
  };

  const handleRemoveHighlight = async (id) => {
    try {
      const res = await fetch(`/api/listing/remove-highlight/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to remove highlight.");
      const updatedListing = await res.json();

      setListings((prev) =>
        prev.map((listing) =>
          listing._id === updatedListing.listing._id
            ? updatedListing.listing
            : listing
        )
      );
    } catch (error) {
      setError("Failed to remove highlight from the listing.");
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-5">Admin Center</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <div key={listing._id} className="border p-3 rounded">
            <img
              src={listing.imageUrls[0]}
              alt={listing.name}
              className="h-32 w-full object-cover mb-2"
            />
            <h2 className="font-semibold text-lg">{listing.name}</h2>
            <p className="text-sm text-gray-500">{listing.address}</p>
            {listing.highlighted ? (
              <button
                onClick={() => handleRemoveHighlight(listing._id)}
                className="bg-red-500 text-white mt-2 p-2 rounded"
              >
                Remove Highlight
              </button>
            ) : (
              <button
                onClick={() => handleHighlight(listing._id)}
                className="bg-blue-500 text-white mt-2 p-2 rounded"
              >
                Highlight
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
