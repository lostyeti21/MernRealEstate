import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { showRatingNotification } from './Toast';

const RateTenant = ({ tenantId, onRated, userId }) => {
  const [ratings, setRatings] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const submitRating = async () => {
    try {
      const res = await fetch(`/api/tenant/rate/${tenantId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ratings }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit rating.");
      }

      const data = await res.json();
      onRated(data.ratings); // Callback to update ratings
      setSuccessMessage("Your ratings have been successfully recorded!");
      setErrorMessage(""); // Clear any previous errors

      // Show notification to the tenant
      const averageRating = data.ratings.reduce((acc, curr) => acc + curr.value, 0) / data.ratings.length;
      showRatingNotification(averageRating.toFixed(1), data.raterName || 'A landlord', 'Tenant');

      setTimeout(() => setSuccessMessage(""), 3000);
      setRatings([]); // Reset ratings after submission
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong.");
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  const handleRatingChange = (category, value) => {
    setRatings(prev => [...prev, { category, value }]);
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-4">Rate this tenant</h3>
      
      <div className="space-y-4">
        {['Cleanliness', 'Payment', 'Communication', 'Reliability'].map(category => (
          <div key={category} className="flex items-center space-x-4">
            <label className="w-32">{category}:</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  onClick={() => handleRatingChange(category, value)}
                  className={`w-8 h-8 rounded-full ${
                    ratings.find(r => r.category === category && r.value === value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={submitRating}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Submit Ratings
      </button>

      {successMessage && (
        <p className="mt-2 text-green-500">{successMessage}</p>
      )}
      {errorMessage && (
        <p className="mt-2 text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default RateTenant;
