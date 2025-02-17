import { useState } from 'react';

export default function DisputeRatingPopup({ onClose, onSubmit, notification }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disputeReasons = [
    { id: 1, text: 'You do not know the user' },
    { id: 2, text: 'You feel the rating is biased' },
    { id: 3, text: 'Untruthful Rating' },
    { id: 4, text: 'Other' }
  ];

  const handleSubmit = async () => {
    try {
      if (!selectedReason) {
        setError('Please select a reason for the dispute');
        return;
      }

      if (selectedReason === '4' && !otherReason.trim()) {
        setError('Please provide a reason for the dispute');
        return;
      }

      setIsSubmitting(true);
      setError('');

      const reason = selectedReason === '4' ? otherReason : disputeReasons.find(r => r.id === parseInt(selectedReason))?.text;
      await onSubmit(reason);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Why are you disputing this rating?</h2>
        
        <div className="space-y-3">
          {disputeReasons.map((reason) => (
            <div key={reason.id} className="flex items-center">
              <input
                type="radio"
                id={`reason-${reason.id}`}
                name="disputeReason"
                value={reason.id}
                checked={selectedReason === reason.id.toString()}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-2"
              />
              <label htmlFor={`reason-${reason.id}`}>{reason.text}</label>
            </div>
          ))}
        </div>

        {selectedReason === '4' && (
          <div className="mt-4">
            <textarea
              value={otherReason}
              onChange={(e) => {
                if (e.target.value.length <= 600) {
                  setOtherReason(e.target.value);
                }
              }}
              placeholder="Please explain your reason (max 600 characters)"
              className="w-full p-2 border rounded-lg resize-none h-32"
              maxLength={600}
            />
            <div className="text-sm text-gray-500 mt-1">
              {otherReason.length}/600 characters
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 mt-2">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Dispute'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
