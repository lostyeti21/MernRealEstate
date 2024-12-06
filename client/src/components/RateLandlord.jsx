import React, { useState, useEffect } from "react";

const RateLandlord = ({ landlordId, onRated, userId }) => {
  const [rating, setRating] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    const checkIfRated = async () => {
      try {
        const res = await fetch(`/api/user/check-rated/${landlordId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setAlreadyRated(data.alreadyRated);
      } catch (error) {
        console.error("Error checking rating status:", error);
      }
    };

    if (userId !== landlordId) {
      checkIfRated();
    } else {
      setAlreadyRated(true); // Disable rating for the landlord themselves
    }
  }, [landlordId, userId]);

  const submitRating = async () => {
    if (!rating) {
      setErrorMessage("Please select a rating before submitting.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    try {
      const res = await fetch("/api/user/rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ landlordId, rating }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit rating.");
      }

      const data = await res.json();
      onRated(data.averageRating); // Callback to update average rating
      setSuccessMessage("Your rating has been successfully recorded!");
      setErrorMessage(""); // Clear any previous errors
      setTimeout(() => setSuccessMessage(""), 3000);
      setAlreadyRated(true); // Disable rating after successful submission
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong.");
      console.error("Error submitting rating:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {alreadyRated ? (
        <p className="text-gray-500 text-sm">You have already rated this landlord.</p>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer ${
                  rating >= star ? "text-yellow-500" : "text-gray-400"
                }`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
            <button
              onClick={submitRating}
              className="bg-blue-500 text-white px-3 py-1 rounded-md ml-2"
            >
              Submit
            </button>
          </div>
          {successMessage && (
            <p className="text-green-600 text-sm mt-1">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RateLandlord;
