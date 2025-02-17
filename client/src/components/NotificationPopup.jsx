import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotificationPopup({ unreadCount, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Show popup if there are unread notifications
    if (unreadCount > 0) {
      // Wait 5 seconds before showing the popup
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [unreadCount]);

  const handleClick = () => {
    navigate('/notifications');
    onClose();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm animate-slide-up z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Click here to view your notifications
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        onClick={handleClick}
        className="mt-3 w-full bg-[#009688] text-white px-4 py-2 rounded-md hover:bg-[#00897b] transition-colors"
      >
        View Notifications
      </button>
    </div>
  );
}
