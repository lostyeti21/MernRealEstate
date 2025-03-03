import React, { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import DisputeNotificationHandler from './DisputeNotificationHandler';

export default function DisputeConfirmationPopup({ disputeData, onClose }) {
  console.log(' [DisputeConfirmationPopup] Initialized with data:', disputeData);
  
  const [showNotificationHandler, setShowNotificationHandler] = useState(false);

  const handleClose = async () => {
    try {
      // Mark the notification as disputed in the database
      if (disputeData.notificationId) {
        console.log('Marking notification as disputed:', disputeData.notificationId);
        
        const response = await fetch(`/api/notifications/${disputeData.notificationId}/mark-disputed`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to mark notification as disputed');
        }

        console.log('Successfully marked notification as disputed:', disputeData.notificationId);
      } else {
        console.warn('No notification ID found in dispute details');
      }
    } catch (error) {
      console.error('Error marking notification as disputed:', error);
    }

    // Continue with existing notification process
    console.log(' [DisputeConfirmationPopup] Close button clicked, starting notification process...', {
      disputeData,
      showNotificationHandler
    });
    setShowNotificationHandler(true);
  };

  const handleNotificationSent = (notificationData) => {
    console.log(' [DisputeConfirmationPopup] Notification sent successfully, closing popup...', {
      notificationData
    });
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (showNotificationHandler) {
      console.log(' [DisputeConfirmationPopup] Mounting notification handler...', {
        disputeData,
        hasRaterName: !!disputeData?.raterName
      });
    }
  }, [showNotificationHandler, disputeData]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <FaCheckCircle className="text-green-500 text-5xl" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Dispute Submitted Successfully</h2>
          <p className="text-gray-600 mt-2">Your dispute has been submitted and will be reviewed by our team.</p>
        </div>

        <div className="space-y-4">
          <div className="border-t border-b border-gray-200 py-4">
            <h3 className="font-medium text-gray-800 mb-2">Dispute Details:</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-600">Dispute ID:</span> <span className="font-medium">{disputeData.id}</span></p>
              <p><span className="text-gray-600">Date:</span> <span className="font-medium">{formatDate(new Date())}</span></p>
              {disputeData.raterName && (
                <p><span className="text-gray-600">Rater Name:</span> <span className="font-medium">{disputeData.raterName}</span></p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">Disputed Categories:</h3>
            <div className="grid grid-cols-2 gap-2">
              {disputeData.categories.map((category, index) => (
                <div key={index} className="bg-blue-50 p-2 rounded-lg">
                  <p className="font-medium text-blue-800 capitalize">{category.category}</p>
                  <p className="text-sm text-blue-600">Rating: {category.value || category.rating || 0}/5</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">Reason:</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 font-medium mb-1">Type: {disputeData.reasonType}</p>
              <p className="text-sm text-gray-600">{disputeData.reason}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>

        {showNotificationHandler && (
          <div id="notification-handler-container">
            <DisputeNotificationHandler 
              disputeData={disputeData} 
              onNotificationSent={handleNotificationSent}
            />
          </div>
        )}
      </div>
    </div>
  );
}
