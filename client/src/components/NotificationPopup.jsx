import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotificationPopup({ unreadCount, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shownForCount, setShownForCount] = useState(0);
  const navigate = useNavigate();
  let autoCloseTimer;

  useEffect(() => {
    // Show popup only if there are new unread notifications
    if (unreadCount > 0 && unreadCount !== shownForCount) {
      // Wait 5 seconds before showing the popup
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        setShownForCount(unreadCount);
      }, 5000);

      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
    }
  }, [unreadCount, shownForCount]);

  useEffect(() => {
    if (isVisible) {
      autoCloseTimer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 5000);
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [isVisible, onClose]);

  const handleClick = () => {
    navigate('/notifications');
    onClose();
    setIsVisible(false);
  };

  const handleMouseEnter = () => {
    // Prevent auto-close when mouse is over the popup
    clearTimeout(autoCloseTimer);
  };

  const handleMouseLeave = () => {
    // Restart auto-close timer when mouse leaves
    autoCloseTimer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 5000);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 bg-white/50 backdrop-blur-md rounded-lg shadow-xl p-4 max-w-sm animate-slide-up z-50 border border-gray-200/50 cursor-pointer hover:bg-white/70 transition-colors duration-200"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="bg-blue-100 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {unreadCount} New Notification{unreadCount !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Click to view your notifications
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering main click event
            setIsVisible(false);
            onClose();
          }}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
