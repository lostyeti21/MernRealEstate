import React, { useState } from 'react';
import { FaStar, FaUser } from 'react-icons/fa';
import DisputeConfirmationPopup from './DisputeConfirmationPopup';
import { useSelector } from 'react-redux';

export default function NewRatingPopup({ ratingData, onClose, onDispute }) {
  const { currentUser } = useSelector((state) => state.user);
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [disputeResponse, setDisputeResponse] = useState(null);

  const isSubmitEnabled = selectedCategories.length > 0 && 
    selectedReason && 
    (selectedReason !== 'other' || (selectedReason === 'other' && otherReason.trim()));

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating) => {
    const numRating = Number(rating) || 0;
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={`${
          index < numRating ? 'text-yellow-400' : 'text-gray-300'
        } text-lg`}
      />
    ));
  };

  const handleDisputeClick = async () => {
    // Log initial rating data
    console.log('Initial rating data:', ratingData);

    if (!currentUser) {
      setValidationError('You must be logged in to submit a dispute');
      return;
    }

    if (!selectedCategories.length) {
      setValidationError('Please select at least one rating category to dispute');
      return;
    }

    if (!selectedReason) {
      setValidationError('Please select a reason for the dispute');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      setValidationError('Please provide details for your dispute');
      return;
    }

    setValidationError('');
    
    try {
      // Map reason type to match backend enum exactly
      const reasonTypeMap = {
        'rating was out of my control': 'Rating based on factors outside my control',
        'biased rating': 'Personal bias or conflict of interest',
        'unjustified rating': 'Inaccurate or unfair assessment',
        'other': 'Other'
      };

      // Get the rating data
      const ratingId = ratingData.ratingId;
      const ratingCategories = ratingData.categories || [];

      // Get the correct rating type
      const actualRatingType = (ratingData.type || ratingData.data?.type || 'tenant').toLowerCase();

      // Get the ratedBy user ID
      const ratedById = ratingData.ratedBy?._id || 
                       ratingData.from?._id || 
                       ratingData.data?.from?._id;

      // Debug logging for rating data structure
      console.log('Initial rating data structure:', {
        fullRatingData: ratingData,
        ratingId,
        ratingCategories,
        type: {
          original: ratingData.type,
          fromData: ratingData.data?.type,
          final: actualRatingType
        }
      });

      // Format categories according to schema
      const formattedCategories = selectedCategories.map(cat => ({
        category: cat.category.toLowerCase(),
        value: Number(cat.rating || 0)
      })).filter(cat => cat.value >= 1 && cat.value <= 5);

      // Debug logging for categories
      console.log('Categories validation:', {
        original: selectedCategories,
        formatted: formattedCategories,
        isValid: formattedCategories.length > 0 && 
                formattedCategories.every(cat => cat.value >= 1 && cat.value <= 5)
      });

      // Debug logging for reason mapping
      console.log('Reason type mapping:', {
        selectedReason,
        mappedReason: reasonTypeMap[selectedReason],
        availableReasons: Object.keys(reasonTypeMap),
        isValid: reasonTypeMap.hasOwnProperty(selectedReason)
      });

      // Validate required fields before sending
      if (!ratingId) {
        throw new Error('Rating ID is missing');
      }
      if (!actualRatingType || !['tenant', 'landlord'].includes(actualRatingType)) {
        throw new Error('Invalid rating type - must be tenant or landlord');
      }
      if (!formattedCategories || formattedCategories.length === 0) {
        throw new Error('Valid categories are required (must have values between 1-5)');
      }
      if (!selectedReason) {
        throw new Error('Reason is missing');
      }
      if (!reasonTypeMap[selectedReason]) {
        throw new Error('Invalid reason type');
      }
      if (!currentUser?._id) {
        throw new Error('User ID is missing');
      }
      if (!ratedById) {
        throw new Error('Rated by user ID is missing');
      }

      try {
        // Create dispute data
        const disputeData = {
          rating: ratingId,
          ratingType: actualRatingType,
          categories: formattedCategories,
          reason: selectedReason === 'other' ? otherReason : selectedReason,
          reasonType: reasonTypeMap[selectedReason],
          disputedBy: currentUser._id,
          ratedBy: ratedById,
          ratingData: {
            categories: ratingCategories,
            comment: ratingData.comment,
            createdAt: ratingData.createdAt
          }
        };

        console.log('Submitting dispute with data:', disputeData);

        // Submit dispute
        const response = await fetch('http://localhost:3000/api/dispute/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          credentials: 'include',
          body: JSON.stringify(disputeData)
        });

        const data = await response.json();
        console.log('Response from server:', data);

        if (!response.ok) {
          console.error('Server error details:', {
            status: response.status,
            statusText: response.statusText,
            data: data,
            sentData: disputeData
          });
          throw new Error(data.message || 'Failed to submit dispute');
        }

        // Send notification to SuperUsers
        try {
          const superNotificationData = {
            type: 'dispute_submitted',
            from: currentUser._id,
            message: `New dispute submitted by ${currentUser.username} against ${disputeData.ratedBy?.username || 'Unknown User'}'s rating`,
            data: {
              disputeId: data.dispute._id,
              rating: ratingId,
              disputeDetails: {
                id: data.dispute._id,
                categories: formattedCategories,
                reason: selectedReason === 'other' ? otherReason : selectedReason,
                reasonType: reasonTypeMap[selectedReason],
                disputedBy: currentUser.username || 'Unknown User',
                ratedBy: ratingData.ratedBy?.username || 'Unknown User',
                ratingData: {
                  categories: ratingCategories,
                  comment: ratingData.comment,
                  createdAt: ratingData.createdAt
                }
              }
            }
          };

          console.log('📤 [NewRatingPopup] Sending SuperUser notification:', superNotificationData);

          const notificationResponse = await fetch('/api/notifications/create-super-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(superNotificationData)
          });

          if (!notificationResponse.ok) {
            const errorData = await notificationResponse.text();
            console.error('❌ [NewRatingPopup] Failed to send SuperUser notification:', {
              status: notificationResponse.status,
              error: errorData
            });
            throw new Error('Failed to send notification to SuperUsers');
          }

          const notificationResult = await notificationResponse.json();
          console.log('✅ [NewRatingPopup] SuperUser notification sent:', notificationResult);
        } catch (error) {
          console.error('❌ [NewRatingPopup] Failed to send SuperUser notification:', error);
          // Don't throw here, as the dispute was already created successfully
        }

        // Show confirmation popup with rater name
        setDisputeResponse({
          id: data.dispute._id,
          categories: formattedCategories,
          reasonType: reasonTypeMap[selectedReason],
          reason: selectedReason === 'other' ? otherReason : selectedReason,
          raterName: ratingData.ratedBy?.username || 'Unknown User'
        });

        setShowConfirmation(true);

      } catch (error) {
        console.error('Error submitting dispute:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        setValidationError(error.message || 'Failed to submit dispute. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setValidationError(error.message || 'Failed to submit dispute. Please try again.');
    }
  };

  const handleCategoryToggle = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(prev => prev.filter(cat => cat !== category));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  // Get the rating type and ensure we have valid categories
  const ratingType = ratingData.type || 'tenant';
  const categories = Array.isArray(ratingData.categories) ? ratingData.categories : [];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
          {/* Header Section - Fixed */}
          <div className="p-6 border-b border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                {ratingData.ratedBy?.avatar ? (
                  <img
                    src={ratingData.ratedBy.avatar}
                    alt="Rater"
                    className="w-16 h-16 rounded-full border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <FaUser className="text-blue-500 text-2xl" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">New Rating Received</h2>
              <p className="text-gray-600 mt-2">
                <span className="font-medium text-blue-600">{ratingData.ratedBy?.username}</span> has rated you
              </p>
              <p className="text-sm text-gray-500">{formatDate(ratingData.createdAt)}</p>
            </div>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-4">
              {/* Rating Details Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-medium text-gray-800 mb-3 sticky top-0 bg-white py-2">Rating Details:</h3>
                <div className="space-y-3">
                  {categories.length > 0 ? (
                    categories.map((category, index) => {
                      const categoryName = category.category;
                      const rating = Number(category.rating) || 0;

                      return (
                        <div 
                          key={index} 
                          className={`bg-gray-50 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedCategories.includes(category) ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                          onClick={() => handleCategoryToggle(category)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700 capitalize">
                              {categoryName}
                            </span>
                            <div className="flex space-x-1">
                              {renderStars(rating)}
                              <span className="ml-2 text-sm text-gray-600">
                                {rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      No rating categories available
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Reason Section */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-medium text-gray-800 mb-3 sticky top-0 bg-white py-2">Reason for Dispute:</h3>
                <div className="space-y-3">
                  {['Rating was out of my control', 'Biased rating', 'Unjustified rating', 'Other'].map((reason) => (
                    <div
                      key={reason}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedReason === reason.toLowerCase() ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                      onClick={() => setSelectedReason(reason.toLowerCase())}
                    >
                      <span className="font-medium text-gray-700">{reason}</span>
                    </div>
                  ))}
                  
                  {selectedReason === 'other' && (
                    <div className="mt-3">
                      <textarea
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Please provide details about your dispute..."
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Section */}
              {ratingData.comment && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2 sticky top-0 bg-white py-2">Comment:</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600 italic">"{ratingData.comment}"</p>
                  </div>
                </div>
              )}
              {/* Validation Error Message */}
              {validationError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{validationError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Section - Fixed */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDisputeClick}
                disabled={!isSubmitEnabled}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isSubmitEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmation && disputeResponse && (
        <DisputeConfirmationPopup
          disputeData={disputeResponse}
          onClose={() => {
            setShowConfirmation(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
