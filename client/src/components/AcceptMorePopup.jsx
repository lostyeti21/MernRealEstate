import React from 'react';

export default function AcceptMorePopup({ onClose, onAcceptMore, remainingTimes }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Accept More Viewing Times?</h2>
        
        <p className="text-gray-600 mb-4">
          There are {remainingTimes} more viewing time{remainingTimes > 1 ? 's' : ''} available. 
          Would you like to accept more viewing times?
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            No, I'm Done
          </button>
          <button
            onClick={onAcceptMore}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Yes, Accept More
          </button>
        </div>
      </div>
    </div>
  );
}
