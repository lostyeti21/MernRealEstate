import { useState } from 'react';

export default function RejectionReasonPopup({ onSubmit, onClose }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [alternativeDate, setAlternativeDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const handleSubmit = () => {
    let rejectionDetails = {
      reason: selectedReason,
    };

    if (selectedReason === 'time_not_suitable') {
      rejectionDetails.alternativeDateTime = {
        date: alternativeDate,
        startTime,
        endTime
      };
    } else if (selectedReason === 'other') {
      rejectionDetails.otherReason = otherReason;
    }

    onSubmit(rejectionDetails);
  };

  // Get tomorrow's date as the minimum date for the date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Select Rejection Reason</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rejection
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#009688] focus:border-[#009688]"
            >
              <option value="">Select a reason</option>
              <option value="time_not_suitable">Time is not suitable</option>
              <option value="overbooked">Overbooked</option>
              <option value="other">Other</option>
            </select>
          </div>

          {selectedReason === 'time_not_suitable' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternative Date
                </label>
                <input
                  type="date"
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  min={minDate}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#009688] focus:border-[#009688]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#009688] focus:border-[#009688]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#009688] focus:border-[#009688]"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedReason === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify the reason
              </label>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#009688] focus:border-[#009688]"
                rows="3"
                placeholder="Enter your reason here..."
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedReason || 
              (selectedReason === 'time_not_suitable' && (!alternativeDate || !startTime || !endTime)) ||
              (selectedReason === 'other' && !otherReason)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-[#009688] rounded-md hover:bg-[#00897b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009688] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
