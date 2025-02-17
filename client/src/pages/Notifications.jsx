import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import logo from '../assets/tiny logo.png';
import DisputeRatingPopup from '../components/DisputeRatingPopup';

export default function Notifications() {
  const [notifications, setNotifications] = useState({ unseen: [], seen: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [disputingIds, setDisputingIds] = useState(new Set());
  const [disputePopup, setDisputePopup] = useState({
    show: false,
    ratingId: null,
    ratingType: null,
    categories: [],
    selectedCategories: [],
    reason: '',
    selectedReason: '',
    otherReason: '',
    loading: false
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState(null);
  const [showAlreadyDisputedPopup, setShowAlreadyDisputedPopup] = useState(false);
  const [alreadyDisputedDetails, setAlreadyDisputedDetails] = useState(null);
  const { currentUser } = useSelector((state) => state.user);

  const fetchNotifications = async () => {
    try {
      if (!currentUser?.token) {
        return;
      }

      setLoading(true);
      setError(null);
      console.log('Fetching notifications with token:', currentUser.token ? 'present' : 'missing');

      const response = await fetch('http://localhost:3000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('Notifications response status:', response.status);
      const data = await response.json();
      console.log('Notifications data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error fetching notifications');
      }

      // Check dispute status for each rating notification
      const notificationsWithDisputeStatus = await Promise.all(
        data.seen.map(async notification => {
          if (notification.type === 'rating') {
            try {
              const disputeCheck = await fetch(`http://localhost:3000/api/dispute/check/${notification.id}`, {
                headers: {
                  'Authorization': `Bearer ${currentUser.token}`
                }
              });
              const disputeData = await disputeCheck.json();
              return { ...notification, disputed: disputeData.disputed };
            } catch (error) {
              console.error('Error checking dispute status:', error);
              return notification;
            }
          }
          return notification;
        })
      );

      const unseenWithDisputeStatus = await Promise.all(
        data.unseen.map(async notification => {
          if (notification.type === 'rating') {
            try {
              const disputeCheck = await fetch(`http://localhost:3000/api/dispute/check/${notification.id}`, {
                headers: {
                  'Authorization': `Bearer ${currentUser.token}`
                }
              });
              const disputeData = await disputeCheck.json();
              return { ...notification, disputed: disputeData.disputed };
            } catch (error) {
              console.error('Error checking dispute status:', error);
              return notification;
            }
          }
          return notification;
        })
      );

      // Ensure we have valid arrays for both seen and unseen notifications
      const newNotifications = {
        seen: notificationsWithDisputeStatus,
        unseen: unseenWithDisputeStatus
      };

      console.log('Processed notifications:', {
        seen: newNotifications.seen.length,
        unseen: newNotifications.unseen.length,
        seenSample: newNotifications.seen[0],
        unseenSample: newNotifications.unseen[0]
      });

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.token) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Refresh notifications periodically
  useEffect(() => {
    if (!currentUser?.token) return;

    const intervalId = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const handleDelete = async (notification) => {
    try {
      if (!notification.ratings?.length) {
        throw new Error('No valid ratings to delete');
      }

      setDeletingIds(prev => new Set([...prev, notification.id]));

      // Delete all ratings in the group
      for (const rating of notification.ratings) {
        if (!rating.id) {
          console.warn('Skipping rating without ID:', rating);
          continue;
        }

        const res = await fetch(`http://localhost:3000/api/notifications/${notification.type}/${rating.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentUser?.token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete notification');
        }
      }

      // Remove the deleted notification group from state
      setNotifications(prev => ({
        unseen: prev.unseen.filter(n => n.id !== notification.id),
        seen: prev.seen.filter(n => n.id !== notification.id)
      }));

      // Refresh notifications to ensure sync with server
      await fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification: ' + error.message);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const disputeReasons = [
    'Inaccurate or unfair assessment',
    'Rating based on factors outside my control',
    'Personal bias or conflict of interest',
    'Incorrect information or misunderstanding',
    'Other'
  ];

  const handleDisputeClick = async (notification) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Check if rating is already disputed
      const response = await fetch(`http://localhost:3000/api/dispute/check/${notification.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.disputed) {
        // If already disputed, show details
        setAlreadyDisputedDetails({
          id: data.dispute._id.slice(-6).toUpperCase(),
          message: "You have already submitted a dispute for this rating. Our support team will review your case and get back to you soon.",
          date: new Date(data.dispute.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          status: data.dispute.status
        });
        setShowAlreadyDisputedPopup(true);
        return;
      }

      // If not disputed, show dispute popup
      const isRatingNotification = notification.type === 'rating';
      const ratings = notification.ratings || [];
      
      // Filter out overall rating and prepare categories for dispute
      const disputeCategories = ratings
        .filter(r => r.category !== 'overall')
        .map(rating => ({
          category: rating.category,
          value: rating.value,
          selected: false
        }));

      console.log('Dispute categories:', disputeCategories);

      setDisputePopup({
        show: true,
        ratingId: notification.id,
        ratingType: data.ratingType || 'tenant', // Use rating type from check response
        categories: disputeCategories,
        selectedCategories: [],
        reason: '',
        selectedReason: '',
        otherReason: '',
        loading: false
      });
    } catch (error) {
      console.error('Error checking dispute status:', error);
      toast.error('Error checking dispute status');
    }
  };

  const handleCategoryToggle = (category) => {
    setDisputePopup(prev => {
      // Get current selected categories
      const currentSelected = prev.categories.filter(cat => cat.selected);
      
      // Find the category to toggle
      const updatedCategories = prev.categories.map(cat => {
        if (cat.category === category.category) {
          // If already selected, unselect it
          if (cat.selected) {
            return { ...cat, selected: false };
          }
          
          // If not selected and we haven't hit the limit, select it
          if (currentSelected.length < 2) {
            return { ...cat, selected: true };
          }
          
          // Otherwise, keep it as is
          return cat;
        }
        return cat;
      });

      // Update selectedCategories based on the new selection
      const selectedCategories = updatedCategories
        .filter(cat => cat.selected)
        .map(({ category, value }) => ({ category, value }));

      return {
        ...prev,
        categories: updatedCategories,
        selectedCategories
      };
    });
  };

  const handleSelectAll = () => {
    setDisputePopup(prev => {
      const allCategories = prev.categories.map(cat => ({
        ...cat,
        selected: true
      }));

      return {
        ...prev,
        categories: allCategories,
        selectedCategories: allCategories.map(({ category, value }) => ({ category, value }))
      };
    });
  };

  const handleReasonSelect = (reason) => {
    setDisputePopup(prev => ({
      ...prev,
      selectedReason: reason,
      reason: reason === 'Other' ? prev.otherReason : reason
    }));
  };

  const handleOtherReasonChange = (value) => {
    setDisputePopup(prev => ({
      ...prev,
      otherReason: value,
      reason: value // Update main reason when it's "Other"
    }));
  };

  const handleDisputeSubmit = async () => {
    try {
      setDisputePopup(prev => ({ ...prev, loading: true }));
      const token = localStorage.getItem('access_token');

      // Log the data being sent
      const requestData = {
        ratingId: disputePopup.ratingId,
        ratingType: disputePopup.ratingType,
        categories: disputePopup.selectedCategories.map(cat => ({
          category: cat.category,
          value: cat.value
        })),
        reason: disputePopup.selectedReason === 'Other' ? disputePopup.otherReason : disputePopup.selectedReason,
        reasonType: disputePopup.selectedReason
      };

      console.log('Submitting dispute with data:', requestData);

      const response = await fetch('http://localhost:3000/api/dispute/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('Dispute submission response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit dispute');
      }

      // Update the notification to show it's been disputed
      setNotifications(prev => ({
        ...prev,
        unseen: prev.unseen.map(notif => 
          notif.id === disputePopup.ratingId
            ? { ...notif, disputed: true }
            : notif
        ),
        seen: prev.seen.map(notif => 
          notif.id === disputePopup.ratingId
            ? { ...notif, disputed: true }
            : notif
        )
      }));

      // Set dispute details for confirmation popup
      setDisputeDetails({
        message: "Your dispute has been submitted successfully. You will be notified when there's an update."
      });
      setShowConfirmation(true);

      // Close the dispute popup
      setDisputePopup({
        show: false,
        ratingId: null,
        ratingType: null,
        loading: false
      });

      toast.success('Dispute submitted successfully');
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        disputeData: {
          ratingId: disputePopup.ratingId,
          ratingType: disputePopup.ratingType,
          categories: disputePopup.selectedCategories,
          reason: disputePopup.selectedReason,
          reasonType: disputePopup.selectedReason
        }
      });
      toast.error(error.message || 'Error submitting dispute');
    } finally {
      setDisputePopup(prev => ({ ...prev, loading: false }));
    }
  };

  const renderDisputePopup = () => {
    // Check if form is valid
    const selectedCategories = disputePopup.categories.filter(cat => cat.selected);
    const hasSelectedCategories = selectedCategories.length > 0;
    const hasValidReason = disputePopup.selectedReason && 
      (disputePopup.selectedReason !== 'Other' || disputePopup.otherReason.trim());
    
    const isFormValid = hasSelectedCategories && hasValidReason;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4">Dispute Rating</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Select categories to dispute:</h3>
            <div className="space-y-2">
              {disputePopup.categories.map((category) => (
                <div key={category.category} className="flex items-center">
                  <input
                    type="checkbox"
                    id={category.category}
                    checked={category.selected}
                    onChange={() => handleCategoryToggle(category)}
                    className="mr-2"
                  />
                  <label htmlFor={category.category} className="capitalize">
                    {category.category} ({category.value}/5)
                  </label>
                </div>
              ))}
            </div>
            <button
              onClick={handleSelectAll}
              className="mt-2 text-blue-500 text-sm hover:text-blue-700"
            >
              Select All Categories
            </button>
            {!hasSelectedCategories && (
              <p className="text-red-500 text-sm mt-1">Please select at least one category</p>
            )}
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Select reason for dispute:</h3>
            <div className="space-y-2">
              {disputeReasons.map((reason) => (
                <div key={reason} className="flex items-center">
                  <input
                    type="radio"
                    id={reason}
                    name="disputeReason"
                    value={reason}
                    checked={disputePopup.selectedReason === reason}
                    onChange={() => handleReasonSelect(reason)}
                    className="mr-2"
                  />
                  <label htmlFor={reason}>{reason}</label>
                </div>
              ))}
            </div>
            {!disputePopup.selectedReason && (
              <p className="text-red-500 text-sm mt-1">Please select a reason</p>
            )}
          </div>

          {disputePopup.selectedReason === 'Other' && (
            <div className="mb-4">
              <label htmlFor="otherReason" className="block font-medium mb-2">
                Please specify your reason:
              </label>
              <textarea
                id="otherReason"
                value={disputePopup.otherReason}
                onChange={(e) => handleOtherReasonChange(e.target.value)}
                className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500"
                rows="3"
                placeholder="Enter your reason for disputing these ratings..."
              />
              {disputePopup.selectedReason === 'Other' && !disputePopup.otherReason.trim() && (
                <p className="text-red-500 text-sm mt-1">Please provide details for your reason</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDisputePopup(prev => ({ ...prev, show: false }))}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={disputePopup.loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDisputeSubmit}
              disabled={!isFormValid || disputePopup.loading}
              className={`px-4 py-2 text-white rounded ${
                isFormValid && !disputePopup.loading
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {disputePopup.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Dispute'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'dispute_rejected') {
      setDisputeDetails({
        id: notification.message.match(/ID: ([A-Z0-9]+)/)?.[1] || '',
        message: notification.message
      });
      setShowConfirmation(true);
    }
    // ... rest of existing handleNotificationClick logic ...
  };

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('Dispute ID copied to clipboard');
  };

  const renderNotification = (notification) => {
    console.log('Rendering notification:', notification);

    const getNotificationIcon = () => {
      if (notification.type === 'dispute_rejected') {
        return (
          <img
            src={logo}
            alt="JustListIt Support"
            className="w-10 h-10 rounded-full object-contain bg-white"
          />
        );
      }
      
      // For rating notifications
      if (notification.type === 'rating') {
        return (
          <img
            src={notification.rater?.avatar || '/default-avatar.png'}
            alt={notification.rater?.username || 'User'}
            className="w-10 h-10 rounded-full"
          />
        );
      }

      // Default icon
      return (
        <img
          src="/default-avatar.png"
          alt="System"
          className="w-10 h-10 rounded-full"
        />
      );
    };

    const getNotificationTitle = () => {
      if (notification.type === 'dispute_rejected') {
        return (
          <span className="font-medium">
            <span className="text-blue-600">{notification.systemInfo?.name || 'JustListIt Support'}</span>
          </span>
        );
      }
      
      if (notification.type === 'rating') {
        return (
          <span className="font-medium">
            <span className="text-blue-600">{notification.rater?.username || 'Anonymous'}</span>
            {' rated you'}
          </span>
        );
      }

      return 'System Notification';
    };

    const getDisputeButton = (notification) => {
      // If the notification is already disputed
      if (notification.disputed) {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisputeClick(notification);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Dispute Submitted
          </button>
        );
      }

      // If it's a rating notification that can be disputed
      if (notification.type === 'rating') {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDisputeClick(notification);
            }}
            className="text-red-500 hover:text-red-700 transition-colors bg-red-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Dispute Rating
          </button>
        );
      }

      return null;
    };

    const isRatingNotification = notification.type === 'rating';
    const ratings = notification.ratings || [];
    const sortedRatings = isRatingNotification 
      ? ratings
          .filter(r => r.category !== 'overall')
          .sort((a, b) => a.category.localeCompare(b.category))
      : [];

    console.log('Sorted ratings:', sortedRatings);

    const formatDate = (dateString) => {
      try {
        if (!dateString) {
          console.warn('No date string provided');
          return 'Date not available';
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateString);
          return 'Invalid date';
        }
        return format(date, 'MMM d, yyyy h:mm a');
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date not available';
      }
    };

    const renderStars = (value) => {
      return (
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${
                star <= value ? 'text-yellow-400' : 'text-gray-300'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          ))}
          <span className="ml-1 text-sm font-medium">{value}/5</span>
        </div>
      );
    };

    // Extract user info from rater or from fields
    const rater = notification.rater || {};
    const username = rater.username || 'Anonymous';
    const avatar = rater.avatar || '/default-avatar.png';
    const createdAt = notification.date || new Date().toISOString();

    return (
      <div 
        key={notification.id} 
        className="bg-white p-4 rounded-lg shadow-md relative cursor-pointer hover:bg-gray-50"
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-4">
          {getNotificationIcon()}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                {getNotificationTitle()}
                <p className="text-gray-600 text-sm">
                  {formatDate(createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark as Read
                  </button>
                )}
                {getDisputeButton(notification)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification);
                  }}
                  disabled={deletingIds.has(notification.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                >
                  {deletingIds.has(notification.id) ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="mt-2">{notification.message || `${notification.rater?.username || 'Anonymous'} rated you`}</p>
            
            {isRatingNotification && (
              <div className="mt-4 space-y-2">
                {sortedRatings.map((rating) => (
                  <div key={rating.category} className="flex items-center justify-between">
                    <span className="text-gray-600 capitalize">{rating.category}:</span>
                    <div className="flex items-center">
                      {renderStars(rating.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : notifications.unseen.length === 0 && notifications.seen.length === 0 ? (
        <div className="text-center text-gray-500">No notifications</div>
      ) : (
        <div>
          {notifications.unseen.length > 0 && (
            <div className="mb-8" key="unseen-section">
              <h2 className="text-xl font-semibold mb-4">New</h2>
              <div className="space-y-4">
                {notifications.unseen.map(notification => (
                  <div key={notification._id || `unseen-${notification.id}`}>
                    {renderNotification(notification)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.seen.length > 0 && (
            <div key="seen-section">
              <h2 className="text-xl font-semibold mb-4">Earlier</h2>
              <div className="space-y-4">
                {notifications.seen.map(notification => (
                  <div key={notification._id || `seen-${notification.id}`}>
                    {renderNotification(notification)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {disputePopup.show && renderDisputePopup()}

      {showConfirmation && disputeDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-4">
              <img src={logo} alt="JustListIt Support" className="w-12 h-12 object-contain" />
              <h2 className="text-xl font-semibold">Dispute Submitted</h2>
            </div>
            
            <p className="mb-6 text-gray-700">{disputeDetails.message}</p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlreadyDisputedPopup && alreadyDisputedDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-4">
              <img src={logo} alt="JustListIt Support" className="w-12 h-12 object-contain" />
              <h2 className="text-xl font-semibold">Dispute Status</h2>
            </div>
            
            <p className="mb-4 text-gray-700">{alreadyDisputedDetails.message}</p>
            
            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded">
              <span className="text-gray-600">Dispute ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{alreadyDisputedDetails.id}</code>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyId(e, alreadyDisputedDetails.id);
                }}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  alreadyDisputedDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  alreadyDisputedDetails.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {alreadyDisputedDetails.status.charAt(0).toUpperCase() + alreadyDisputedDetails.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-600">Submitted:</span>
                <span className="text-gray-800">{alreadyDisputedDetails.date}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAlreadyDisputedPopup(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
