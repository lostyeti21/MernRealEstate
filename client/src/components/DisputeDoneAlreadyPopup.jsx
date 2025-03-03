import React from 'react';

const DisputeDoneAlreadyPopup = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Large Tick Icon */}
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <svg 
              className="w-16 h-16 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-800">
            Already Disputed
          </h2>

          {/* Message */}
          <p className="text-gray-600 text-lg">
            You have already submitted a dispute for this rating.
          </p>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputeDoneAlreadyPopup;
