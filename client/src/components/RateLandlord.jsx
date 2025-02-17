import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { showRatingNotification } from './Toast';

const RateLandlord = ({ landlordId, onRated, userId }) => {
  const [rating, setRating] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      setErrorMessage("Please enter the verification code");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/code/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ 
          code: verificationCode,
          landlordId 
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid verification code");
      }

      // If verification successful, proceed with rating submission
      await submitRating();
      setShowCodeModal(false);
      navigate(`/landlord/${landlordId}`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

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
      
      // Show notification to the landlord
      showRatingNotification(rating, data.raterName || 'A tenant', 'Landlord');
      
      setTimeout(() => setSuccessMessage(""), 3000);
      setRating(0); // Reset rating after submission
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong.");
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  const handleRateClick = () => {
    if (!rating) {
      setErrorMessage("Please select a rating before submitting.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    setShowCodeModal(true);
    setErrorMessage("");
  };

  return (
    <div className="flex flex-col gap-2">
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
            onClick={handleRateClick}
            className="bg-blue-500 text-white px-3 py-1 rounded-md ml-2"
          >
            Rate
          </button>
        </div>
        {successMessage && (
          <p className="text-green-600 text-sm mt-1">{successMessage}</p>
        )}
        {errorMessage && (
          <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
        )}
      </div>

      {/* Verification Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Verification Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please enter the verification code provided by the landlord to submit your rating.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter code"
              className="w-full px-3 py-2 border rounded-md mb-4"
              disabled={isVerifying}
            />
            {errorMessage && (
              <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCodeModal(false);
                  setErrorMessage("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                onClick={verifyCode}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateLandlord;
