import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import logo from '../assets/tiny logo.png';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import DisputeRatingPopup from '../components/DisputeRatingPopup';
import DisputeConfirmationPopup from '../components/DisputeConfirmationPopup';
import NewRatingPopup from '../components/NewRatingPopup';
import DisputeDoneAlreadyPopup from '../components/DisputeDoneAlreadyPopup';

export default function Notifications({ superUserProps, onDisputeSubmit }) {
  const { currentUser } = useSelector((state) => state.user);
  const { notifications, loading: notificationsLoading } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [disputingIds, setDisputingIds] = useState(new Set());
  const [disputePopup, setDisputePopup] = useState({
    show: false,
    ratingId: null,
    ratingType: null,
    selectedCategories: [],
    reason: '',
    selectedReason: '',
    otherReason: '',
    loading: false,
    notification: null,
    raterName: ''
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState(null);
  const [showAlreadyDisputedPopup, setShowAlreadyDisputedPopup] = useState(false);
  const [alreadyDisputedDetails, setAlreadyDisputedDetails] = useState(null);
  const [showDisputeSubmittedPopup, setShowDisputeSubmittedPopup] = useState(false);
  const [disputeSubmittedDetails, setDisputeSubmittedDetails] = useState(null);
  const [viewingRequestPopup, setViewingRequestPopup] = useState({
    show: false,
    notification: null,
  });
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showNewRatingPopup, setShowNewRatingPopup] = useState(false);
  const [showDisputeDoneAlready, setShowDisputeDoneAlready] = useState(false);

  const formatDate = (dateString) => {
    // Add more detailed logging
    console.log('Formatting date:', dateString);

    try {
      // Check if dateString is undefined, null, or an empty string
      if (!dateString) {
        console.warn('No date string provided');
        return 'Unknown date';
      }

      // Attempt to parse the date with multiple strategies
      let date;
      
      // Try parsing as ISO string or standard date string
      date = new Date(dateString);
      
      // If parsing fails, try alternative parsing
      if (isNaN(date.getTime())) {
        console.warn('Failed to parse date:', dateString);
        return 'Invalid date';
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      // Check if the date is today
      if (date >= today) {
        return format(date, 'h:mm a');
      } 
      
      // Check if the date is yesterday
      if (date >= yesterday && date < today) {
        return `Yesterday, ${format(date, 'h:mm a')}`;
      }

      // Calculate days difference more precisely
      const diffInDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

      // For dates within the last week, show the day name and time
      if (diffInDays < 7) {
        return `${format(date, 'EEEE')}, ${format(date, 'h:mm a')}`;
      } 
      
      // For older dates, show full date and time
      return format(date, 'MMM d, yyyy, h:mm a');
    } catch (error) {
      console.error('Unexpected error formatting date:', error, 'Input:', dateString);
      return 'Date error';
    }
  };

  const isNotificationRecent = (createdAt) => {
    const notificationTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const oneMinute = 60 * 1000; // 1 minute in milliseconds
    return currentTime - notificationTime <= oneMinute;
  };

  useEffect(() => {
    if (notifications) {
      setLoading(false);
    }
  }, [notifications]);

  const handleDelete = async (notification) => {
    try {
      // If no ID is present, throw an error
      if (!notification.id && !notification._id) {
        throw new Error('No notification ID found');
      }

      const notificationId = notification.id || notification._id;
      
      // Optimistically remove the notification from the state
      setNotifications(prev => prev.filter(n => (n.id !== notificationId && n._id !== notificationId)));

      setDeletingIds(prev => new Set([...prev, notificationId]));

      // Use the new deletion endpoint that supports multiple deletion methods
      const deleteEndpoint = `/api/notifications/${notificationId}`;

      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser?.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        // If delete fails, revert the optimistic update
        setNotifications(prev => [...prev, notification]);
        throw new Error(data.message || 'Failed to delete notification');
      }

    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification: ' + error.message);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id || notification._id);
        return newSet;
      });
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error('No notification ID provided');
      return;
    }

    try {
      console.log('Marking notification as read:', notificationId);
      const res = await fetch(`http://localhost:3000/api/notifications/read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to mark notification as read: ${errorText}`);
      }

      // Update local state
      setNotifications(prev => prev.map(notification => {
        if (notification._id === notificationId) {
          return { ...notification, read: true };
        }
        return notification;
      }));

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const disputeReasons = [
    'Inaccurate or unfair assessment',
    'Rating based on factors outside my control',
    'Personal bias or conflict of interest',
    'Incorrect information or misunderstanding',
    'Other'
  ];

  const handleOpenDisputePopup = async (notification) => {
    try {
      console.log('OPENING DISPUTE POPUP FOR NOTIFICATION', notification);

      // Check if this is a rating notification
      if (!notification.data?.ratingDetails) {
        toast.error('This notification does not contain rating details');
        return;
      }

      // Check if rating is already disputed
      if (notification.disputed) {
        setShowDisputeDoneAlready(true);
        return;
      }

      const disputeCheckData = {
        ratingId: notification.id,
        ratingType: notification.ratingType || 'tenant'
      };

      // Set dispute popup state
      setDisputePopup({
        show: true,
        ratingId: notification.id,
        ratingType: disputeCheckData.ratingType || notification.ratingType || 'tenant', 
        selectedCategories: [],
        reason: '',
        selectedReason: '',
        otherReason: '',
        loading: false,
        notification: {
          ...notification,
          data: {
            ...notification.data,
            ratedBy: notification.data?.ratedBy || {
              username: notification.from?.username || notification.systemInfo?.name
            }
          }
        },
        raterName: notification.data?.ratedBy?.username || notification.from?.username || notification.systemInfo?.name || 'Unknown Rater'
      });

      console.log('DISPUTE POPUP STATE SET', {
        ratingId: notification.id,
        ratingType: disputeCheckData.ratingType || notification.ratingType || 'tenant',
        notification: notification,
        raterName: notification.data?.ratedBy?.username || notification.from?.username || notification.systemInfo?.name
      });
    } catch (error) {
      console.error('Error opening dispute popup:', error);
      toast.error('Failed to open dispute popup');
    }
  };

  const handleDisputeSubmit = async (disputeData, notificationId) => {
    console.log('Handling dispute submit:', { disputeData, notificationId });
    
    try {
      // Update the notification's disputed status in the UI immediately
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => {
          if (notification._id === notificationId) {
            console.log('Marking notification as disputed in UI:', notification._id);
            return { ...notification, disputed: true };
          }
          return notification;
        })
      );

      // Show confirmation popup with the updated notification data
      setDisputeDetails({
        ...disputeData,
        notificationId
      });
      setShowConfirmation(true);

      // Update the disputed status in the database
      const response = await fetch(`/api/notifications/${notificationId}/mark-disputed`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as disputed');
      }

      console.log('Successfully marked notification as disputed in database:', notificationId);
      
    } catch (error) {
      console.error('Error in handleDisputeSubmit:', error);
      toast.error('Failed to update notification status');
      
      // Revert the local state if the API call failed
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => {
          if (notification._id === notificationId) {
            console.log('Reverting disputed status for notification:', notification._id);
            return { ...notification, disputed: false };
          }
          return notification;
        })
      );
    }
  };

  const handleNewRatingDispute = async (disputeData) => {
    console.log('New rating dispute data:', disputeData);
    
    const notificationId = disputeData.notification?._id;
    if (!notificationId) {
      console.error('Missing notification ID in dispute data:', disputeData);
      return;
    }

    // Update notification state and handle the dispute
    await handleDisputeSubmit(disputeData, notificationId);
  };

  const handleDisputeSubmitSuccess = async (disputeData) => {
    console.log('Dispute submitted successfully:', disputeData);
    
    const notificationId = disputeData.notification?._id;
    if (!notificationId) {
      console.error('Missing notification ID in successful dispute data:', disputeData);
      return;
    }

    // Update the notification's disputed status in the UI
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => {
        if (notification._id === notificationId) {
          console.log('Marking notification as disputed after successful submission:', notification._id);
          return { ...notification, disputed: true };
        }
        return notification;
      })
    );

    // Pass the data to SuperUser if props exist
    if (superUserProps?.onDisputeSubmit) {
      console.log('Forwarding dispute to SuperUser component');
      superUserProps.onDisputeSubmit(disputeData);
    }

    // Show confirmation popup
    setDisputeDetails({
      ...disputeData,
      notificationId
    });
    setShowConfirmation(true);
  };

  const handleCloseDisputePopup = () => {
    setDisputePopup(prev => ({
      ...prev,
      show: false
    }));
  };

  const handleCloseConfirmationPopup = () => {
    setShowConfirmation(false);
    setDisputeDetails(null);
  };

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    
    // Check if notification is valid
    if (!notification) {
      console.error('Invalid notification clicked');
      return;
    }
    
    // Mark as read if not already read
    if (!notification.read) {
      try {
        handleMarkAsRead(notification._id || notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Handle different notification types
    if (notification.type === 'new_rating' || notification.type === 'rating') {
      console.log('Rating notification clicked, showing rating details');
      
      // Extract rating data based on notification structure
      const ratingData = notification.data?.ratingDetails || notification.data?.rating || notification.data;
      console.log('Rating data:', ratingData);

      // Get the rating type (tenant or landlord)
      const ratingType = ratingData.type || 'tenant';
      
      // Define categories based on rating type
      const categoryMap = {
        tenant: ['communication', 'cleanliness', 'reliability', 'overall'],
        landlord: ['responseTime', 'maintenance', 'experience', 'overall']
      };

      // Get the appropriate categories
      const categories = categoryMap[ratingType] || categoryMap.tenant;

      // Format the categories with their values
      const formattedCategories = categories.map(category => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        rating: ratingData[category] || 
                ratingData.rating?.[category] || 
                (Array.isArray(ratingData.ratings) && 
                 ratingData.ratings.find(r => r.category === category)?.value) || 0
      }));

      console.log('Formatted categories:', formattedCategories);

      setSelectedNotification({
        ...notification,
        data: {
          ratingId: ratingData.ratingId || ratingData._id || notification._id,
          categories: formattedCategories.filter(cat => cat.category !== 'Overall'),
          comment: ratingData.comment || '',
          ratedBy: notification.from || ratingData.ratedBy,
          type: ratingType
        }
      });
      setShowNewRatingPopup(true);
    } else if (notification.type === 'dispute_received') {
      console.log('Dispute received notification clicked:', notification);
      
      // Set the dispute submitted details to show in the popup
      setDisputeSubmittedDetails({
        id: notification.data?.disputeId || notification._id,
        categories: notification.data?.categories 
          ? notification.data.categories.map(cat => 
              `${cat.category || 'Unknown Category'} (${cat.rating || 'N/A'})`
          ).join(', ') 
          : 'No categories specified',
        reason: notification.data?.reason || 'No reason provided',
        reasonType: notification.data?.reasonType || 'Not specified',
        raterName: notification.data?.raterName || 'Unknown Rater',
        date: new Date(notification.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      // Show the dispute submitted popup
      setShowDisputeSubmittedPopup(true);
    } else if (
      notification.type === 'viewing_request' || 
      (notification.type === 'system' && 
        (notification.data?.type === 'viewing_rejection' || 
         notification.data?.type === 'viewing_accepted'))
    ) {
      console.log('Opening viewing request/response popup:', notification);
      console.log('Notification full data:', JSON.stringify(notification, null, 2));
      
      setViewingRequestPopup({
        show: true,
        notification: {
          ...notification,
          data: {
            ...notification.data,
            status: notification.data?.type === 'viewing_rejection' ? 'rejected' :
                    notification.data?.type === 'viewing_accepted' ? 'accepted' :
                    notification.data?.status || 
                    (notification.title === 'Viewing Request Rejected' ? 'rejected' : 
                     notification.title === 'Viewing Request Accepted' ? 'accepted' : 'pending'),
            listingTitle: notification.data?.listing?.name || 
                          notification.data?.listingTitle || 
                          notification.listingTitle || 
                          'Unknown Listing'
          }
        }
      });
    }
  };

  const getNotificationIcon = (notification) => {
    // For all system notifications (disputes and others)
    if (notification.type === 'dispute_rejected' || 
        notification.type === 'dispute_submitted' || 
        notification.type === 'dispute_approved' || 
        notification.type === 'system') {
      return (
        <img
          src={logo}
          alt="JustListIt Support"
          className="w-10 h-10 rounded-full object-contain bg-white"
        />
      );
    }
    
    // For rating notifications
    if (notification.type === 'rating' || notification.type === 'new_rating') {
      return (
        <img
          src={notification.from?.avatar || '/default-avatar.png'}
          alt={notification.from?.username || 'User'}
          className="w-10 h-10 rounded-full"
        />
      );
    }

    // Default icon
    return (
      <img
        src={logo}
        alt="JustListIt Support"
        className="w-10 h-10 rounded-full object-contain bg-white"
      />
    );
  };

  const getNotificationTitle = (notification) => {
    if (notification.type === 'dispute_rejected' || notification.type === 'dispute_submitted' || notification.type === 'dispute_approved') {
      return (
        <span className="font-medium">
          <span className="text-blue-600">{notification.systemInfo?.name || 'JustListIt Support'}</span>
        </span>
      );
    }
    
    if (notification.type === 'rating' || notification.type === 'new_rating') {
      return (
        <span className="font-medium">
          <span className="text-blue-600">{notification.from?.username || 'Anonymous'}</span>
          {' rated you'}
        </span>
      );
    }

    // For any other system notifications
    return (
      <span className="font-medium">
        <span className="text-blue-600">{notification.systemInfo?.name || 'JustListIt Support'}</span>
      </span>
    );
  };

  const getDisputeButton = (notification) => {
    // If the notification is already disputed
    if (notification.disputed) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDisputePopup(notification);
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
            handleOpenDisputePopup(notification);
          }}
          className="text-red-500 hover:text-red-700 transition-colors bg-red-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333-.38 1.81.588 1.81l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.462a1 1 0 00.951-.69l1.07-3.292c.3-.921-.755-1.688-1.54-1.118l-2.8 2.034a1 1 0 00-.364 1.118L2.98 8.72c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292c.3-.921-.755-1.688-1.54-1.118l-2.8 2.034a1 1 0 00-.364 1.118L2.98 8.72c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Dispute Rating
        </button>
      );
    }

    return null;
  };

  const renderNotification = (notification) => {
    const getNotificationContent = () => {
      if (notification.type === 'system' && 
         (notification.data?.type === 'viewing_rejection' || notification.data?.type === 'viewing_accepted')) {
        const isRejection = notification.data.type === 'viewing_rejection';
        const agentInfo = notification.data?.from || notification.from;
        return (
          <>
            <div className="flex items-start space-x-4">
              <img
                src={agentInfo?.avatar || '/default-avatar.png'}
                alt={agentInfo?.name || 'Agent'}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline">
                  <p className={`text-sm font-medium truncate ${isRejection ? 'text-red-600' : 'text-green-600'}`}>
                    {isRejection ? 'Rejected Viewing' : 'Accepted Viewing'}
                  </p>
                  <span className="ml-2 text-xs text-gray-500">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {notification.data?.listing?.name || 'Unnamed Listing'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  From: {agentInfo?.name || 'Anonymous'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 justify-end">
              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification._id);
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Read
                </button>
              )}
              {notification.disputed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  Disputed
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification);
                }}
                disabled={deletingIds.has(notification._id)}
                className="text-gray-500 hover:text-red-500 transition-colors bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {deletingIds.has(notification._id) ? (
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
          </>
        );
      }

      // New rating notification rendering
      if (notification.type === 'rating') {
        return (
          <>
            <div className="flex items-start space-x-4">
              <img
                src={notification.data?.ratedBy?.avatar || '/default-avatar.png'}
                alt={notification.data?.ratedBy?.username || 'Rater'}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline">
                  <p className="text-sm font-medium text-blue-600 truncate">
                    New Rating Received
                  </p>
                  <span className="ml-2 text-xs text-gray-500">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  Overall Rating: {notification.data?.ratingDetails?.overall || 'N/A'}/5
                </p>
                <p className="text-sm text-gray-500 truncate">
                  From: {notification.data?.ratedBy?.username || 'Anonymous'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 justify-end">
              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification._id);
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Read
                </button>
              )}
              {notification.disputed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  Disputed
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification);
                }}
                disabled={deletingIds.has(notification._id)}
                className="text-gray-500 hover:text-red-500 transition-colors bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {deletingIds.has(notification._id) ? (
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
          </>
        );
      }

      // Dispute notifications rendering
      if (notification.type.startsWith('dispute_')) {
        const getDisputeStatusColor = (status) => {
          switch (status?.toLowerCase()) {
            case 'pending':
              return 'text-yellow-600 bg-yellow-50';
            case 'approved':
              return 'text-green-600 bg-green-50';
            case 'rejected':
              return 'text-red-600 bg-red-50';
            default:
              return 'text-gray-600 bg-gray-50';
          }
        };

        return (
          <>
            <div className="flex items-start space-x-3">
              <img src={logo} alt="JustListIt Support" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      JustListIt Support
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                  {notification.content || notification.message}
                </p>
                {notification.data && (
                  <div className="mt-2 bg-gray-50 p-3 rounded-md space-y-2">
                    {notification.data.disputeId && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Dispute ID:</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm">{notification.data.disputeId}</code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(notification.data.disputeId);
                              toast.success('Dispute ID copied to clipboard');
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 0H10m2 2v2m0 0h2m-2 0H8m2 2v2m0 0h2m-2 0H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M16 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2v2a2 2 0 002 2h2a2 2 0 002-2V6a2 2 0 012-2h2a2 2 0 012 2V6z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {notification.data.categories && notification.data.categories.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Disputed Categories:</p>
                        <div className="flex flex-wrap gap-2">
                          {notification.data.categories.map((category, index) => {
                            // Handle both string and object categories
                            const categoryName = typeof category === 'object' 
                              ? category.category || category.name || JSON.stringify(category)
                              : category;
                            
                            return (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {categoryName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {notification.data.ratingValue && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-600">Rating Value:</span>
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= notification.data.ratingValue ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.462a1 1 0 00.951-.69l1.07-3.292c.3-.921-.755-1.688-1.54-1.118l-2.8 2.034a1 1 0 00-.364 1.118L2.98 8.72c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-1 text-sm text-gray-600">{notification.data.ratingValue}/5</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 justify-end">
              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification._id);
                  }}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Read
                </button>
              )}
              {notification.disputed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  Disputed
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification);
                }}
                disabled={deletingIds.has(notification._id)}
                className="text-gray-500 hover:text-red-500 transition-colors bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
              >
                {deletingIds.has(notification._id) ? (
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
          </>
        );
      }

      // Dispute confirmation notification rendering
      if (notification.type === 'dispute_confirmation') {
        return (
          <div className="flex items-start space-x-3">
            <img src={logo} alt="JustListIt Support" className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <p className="text-gray-900 font-medium">JustListIt Support</p>
              <p className="text-gray-600">{notification.message}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
            </div>
          </div>
        );
      }

      // Dispute received notification rendering
      if (notification.type === 'dispute_received') {
        return (
          <div className="bg-white shadow-md rounded-lg p-4 flex items-start space-x-4">
            <div className="flex-shrink-0">
              <img
                src={logo}
                alt="JustListIt Support"
                className="w-10 h-10 rounded-full object-contain bg-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Dispute Notification
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(notification.createdAt), 'MMM d, yyyy, h:mm a')}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {notification.message && (
                  <div>
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <p className="text-sm text-gray-600 bg-white p-3 rounded">
                      {notification.message}
                    </p>
                  </div>
                )}
                
                {notification.data?.categories && (
                  <div>
                    <p className="text-sm font-medium mb-1">Disputed Categories:</p>
                    <p className="text-sm text-gray-600">
                      {notification.data.categories.map(cat => 
                        `${cat.category || 'Unknown Category'} (${cat.rating || 'N/A'})`
                      ).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Default notification rendering
      return (
        <>
          <div className="flex items-start space-x-4">
            {getNotificationIcon(notification)}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline">
                <p className="text-sm font-medium text-gray-900">
                  {getNotificationTitle(notification)}
                </p>
                <span className="ml-2 text-xs text-gray-500">
                  {formatDate(notification.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {notification.message}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 justify-end">
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(notification._id);
                }}
                className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark as Read
              </button>
            )}
            {notification.disputed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                Disputed
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(notification);
              }}
              disabled={deletingIds.has(notification._id)}
              className="text-gray-500 hover:text-red-500 transition-colors bg-gray-50 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
            >
              {deletingIds.has(notification._id) ? (
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
        </>
      );
    };

    return (
      <>
        <div
          key={notification._id}
          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            handleNotificationClick(notification);
          }}
        >
          {getNotificationContent()}
        </div>
      </>
    );
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
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.462a1 1 0 00.951-.69l1.07-3.292c.3-.921-.755-1.688-1.54-1.118l-2.8 2.034a1 1 0 00-.364 1.118L2.98 8.72c-.77 1.333-.38 1.81.588 1.81h3.462a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm font-medium">{value}/5</span>
      </div>
    );
  };

  const formatCategoryName = (category) => {
    return category
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderConfirmationPopup = () => {
    if (!showConfirmation) return null;
    
    return (
      <DisputeConfirmationPopup
        disputeDetails={disputeDetails}
        onClose={handleCloseConfirmationPopup}
      />
    );
  };

  const renderAlreadyDisputedPopup = () => {
    if (!showAlreadyDisputedPopup) return null;
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)' }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-popup"
        >
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
              className="ml-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 0H10m2 2v2m0 0h2m-2 0H8m2 2v2m0 0h2m-2 0H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M16 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2v2a2 2 0 002 2h2a2 2 0 002-2V6a2 2 0 012-2h2a2 2 0 012 2V6z" />
              </svg>
            </button>
          </div>

          <div className="mb-6 bg-gray-50 p-3 rounded-lg space-y-3">
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDisputeSubmittedPopup = () => {
    if (!showDisputeSubmittedPopup) return null;
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)' }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4 transform transition-all duration-300 ease-out animate-popup"
        >
          <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt="JustListIt Support" className="w-12 h-12 object-contain" />
            <h2 className="text-xl font-semibold">Dispute Details</h2>
          </div>

          <p className="mb-4 text-gray-700">{disputeSubmittedDetails.message}</p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Dispute ID:</span>
                <div className="flex items-center">
                  <code className="bg-gray-100 px-2 py-1 rounded mr-2">{disputeSubmittedDetails.id}</code>
                  <button
                    onClick={(e) => handleCopyId(e, disputeSubmittedDetails.id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 0H10m2 2v2m0 0h2m-2 0H8m2 2v2m0 0h2m-2 0H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M16 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2v2a2 2 0 002 2h2a2 2 0 002-2V6a2 2 0 012-2h2a2 2 0 012 2V6z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {disputeSubmittedDetails.categories && (
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">Disputed Categories:</span>
                <p className="mt-1 text-gray-800">{disputeSubmittedDetails.categories}</p>
              </div>
            )}

            {disputeSubmittedDetails.reason && (
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">Reason:</span>
                <p className="mt-1 text-gray-800">{disputeSubmittedDetails.reason}</p>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded">
              <span className="text-gray-600">Submitted:</span>
              <p className="mt-1 text-gray-800">{disputeSubmittedDetails.date}</p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowDisputeSubmittedPopup(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewingRequestPopup = ({ notification, onClose }) => {
    console.log('ViewingRequestPopup - Full Notification:', JSON.stringify(notification, null, 2));
    
    // Extract listing title with multiple fallback options
    const listingTitle = 
      notification.data?.listing?.name || 
      notification.data?.listingTitle || 
      notification.listingTitle || 
      'Unknown Listing';

    // Extract listing ID
    const listingId = 
      notification.data?.listing?._id || 
      notification.data?.listingId || 
      notification.listingId;

    const extractAcceptedTime = () => {
      // Comprehensive list of possible time fields
      const possibleTimeFields = [
        notification.data?.acceptedTime,
        notification.data?.time,
        notification.data?.viewingTime,
        notification.data?.reservationTime,
        notification.data?.scheduledTime,
        notification.data?.proposedTime,
        notification.data?.confirmedTime
      ];

      console.log('Possible Time Fields:', possibleTimeFields);

      // Check if any of the time fields exist
      const foundTime = possibleTimeFields.find(time => time);

      if (foundTime) {
        console.log('Found Time:', foundTime);
        return format(new Date(foundTime), 'EEEE, MMMM d, yyyy at h:mm a');
      }

      // Check reservation data if available
      if (notification.data?.reservationId) {
        // You might want to fetch reservation details here if needed
        console.log('Reservation ID exists:', notification.data.reservationId);
      }

      // If no specific time is found, try to extract from viewing schedule
      if (notification.data?.listing?.viewingSchedule) {
        const schedule = notification.data.listing.viewingSchedule;
        const availableDays = Object.entries(schedule)
          .filter(([day, info]) => info.available)
          .map(([day, info]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${info.start} - ${info.end}`);
        
        console.log('Available Days:', availableDays);
        
        if (availableDays.length > 0) {
          return `Available times: ${availableDays.join(', ')}`;
        }
      }

      // Last resort: check if there's any time-related information in the message
      const timeRegexes = [
        /(\d{1,2}:\d{2}\s*[ap]m)/i,  // Matches time like 2:30 pm
        /(\d{1,2}:\d{2})/,  // Matches 24-hour time
      ];

      const messageTimeMatch = timeRegexes.reduce((match, regex) => {
        return match || notification.content.match(regex);
      }, null);

      if (messageTimeMatch) {
        console.log('Time found in message:', messageTimeMatch[1]);
        return messageTimeMatch[1];
      }

      console.log('No specific time found in notification data');
      return null;
    };

    const formattedAcceptedTime = extractAcceptedTime();

    // Modify the content to include the schedule page suggestion
    const enhancedContent = notification.content 
      ? `${notification.content} Please check your Schedule page to see the specific time on your calendar.`
      : "Please check your Schedule page to see the specific time on your calendar.";

    const navigate = useNavigate();

    const handleListingClick = () => {
      if (listingId) {
        navigate(`/listing/${listingId}`);
        onClose(); // Close the popup after navigation
      }
    };

    console.log('ViewingRequestPopup - Listing Title:', listingTitle);
    console.log('ViewingRequestPopup - Listing ID:', listingId);
    console.log('ViewingRequestPopup - Accepted Time:', formattedAcceptedTime);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Viewing Request Status
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium 
                ${notification.data?.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                  notification.data?.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                  'bg-yellow-100 text-yellow-800'}`}>
                {notification.data?.status ? 
                  notification.data.status.charAt(0).toUpperCase() + notification.data.status.slice(1) : 
                  'Pending'}
              </span>
              <span className="text-sm text-gray-500">
                {format(new Date(notification.createdAt), 'MMM d, yyyy, h:mm a')}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {listingTitle && listingTitle !== 'Unknown Listing' && (
                <p className="text-sm">
                  <span className="font-medium">Listing:</span>{' '}
                  <span 
                    onClick={handleListingClick}
                    className={`bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 transition-colors ${listingId ? 'text-blue-600 hover:underline' : ''}`}
                  >
                    {listingTitle}
                    {listingId && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 inline-block ml-1 mb-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 0H10m2 2v2m0 0h2m-2 0H8m2 2v2m0 0h2m-2 0H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M16 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2v2a2 2 0 002 2h2a2 2 0 002-2V6a2 2 0 012-2h2a2 2 0 012 2V6z" 
                        />
                      </svg>
                    )}
                  </span>
                </p>
              )}
              
              {enhancedContent && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Message:</span>
                  <p className="mt-1">{enhancedContent}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ViewingRejectionPopup = ({ notification, onClose }) => {
    console.log('ViewingRejectionPopup - Full Notification:', JSON.stringify(notification, null, 2));
    
    // Extract listing title with multiple fallback options
    const listingTitle = 
      notification.data?.listing?.name || 
      notification.data?.listingTitle || 
      notification.listingTitle || 
      'Unknown Listing';

    // Extract listing ID
    const listingId = 
      notification.data?.listing?._id || 
      notification.data?.listingId || 
      notification.listingId;

    const navigate = useNavigate();

    const handleListingClick = () => {
      if (listingId) {
        navigate(`/listing/${listingId}`);
        onClose(); // Close the popup after navigation
      }
    };

    console.log('ViewingRejectionPopup - Listing Title:', listingTitle);
    console.log('ViewingRejectionPopup - Listing ID:', listingId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Viewing Request Status
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 pt-2">
              <img
                src={notification.from?.avatar || '/default-avatar.png'}
                alt={notification.from?.username}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium">{notification.from?.username}</p>
                {notification.from?.email && (
                  <p className="text-sm text-gray-500">{notification.from?.email}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {listingTitle && listingTitle !== 'Unknown Listing' && (
                <p className="text-sm">
                  <span className="font-medium">Listing:</span>{' '}
                  <span 
                    onClick={handleListingClick}
                    className={`bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 transition-colors ${listingId ? 'text-blue-600 hover:underline' : ''}`}
                  >
                    {listingTitle}
                    {listingId && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 inline-block ml-1 mb-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4M14 4v2m0 0v2m0-2h2m-2 0H10m2 2v2m0 0h2m-2 0H8m2 2v2m0 0h2m-2 0H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M16 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2v2a2 2 0 002 2h2a2 2 0 002-2V6a2 2 0 012-2h2a2 2 0 012 2V6z" 
                        />
                      </svg>
                    )}
                  </span>
                </p>
              )}
              
              {notification.content && (
                <div>
                  <p className="text-sm font-medium mb-1">Message:</p>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded">
                    {notification.content}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const style = document.createElement('style');
  style.textContent = `
    @keyframes popup {
      0% {
        opacity: 0;
        transform: scale(0.8);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-popup {
      animation: popup 0.3s ease-out;
    }

    .backdrop-blur {
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }

    /* Smooth Scrolling Enhancements */
    .notifications-container {
      scroll-behavior: smooth;
      overscroll-behavior: contain;
    }

    .notifications-section {
      scroll-snap-type: y mandatory;
      overflow-y: scroll;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.2) transparent;
    }

    .notifications-section::-webkit-scrollbar {
      width: 6px;
    }

    .notifications-section::-webkit-scrollbar-track {
      background: transparent;
    }

    .notifications-section::-webkit-scrollbar-thumb {
      background-color: rgba(0,0,0,0.2);
      border-radius: 10px;
    }

    .notification-item {
      scroll-snap-align: start;
      transition: all 0.3s ease-in-out;
      will-change: transform, box-shadow;
    }

    .notification-item:hover {
      transform: scale(1.02);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    }
  `;
  document.head.appendChild(style);

  return (
    <div 
      className="container mx-auto px-4 py-8 notifications-container"
      style={{ 
        scrollBehavior: 'smooth',
        overscrollBehavior: 'contain'
      }}
    >
      {loading ? (
        <div className="flex justify-center items-center h-full min-h-[300px]">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-500">No notifications</div>
      ) : (
        <div>
          <div 
            className="mb-8 notifications-section"
            style={{ 
              scrollSnapType: 'y mandatory',
              overflowY: 'scroll',
              position: 'relative',
              paddingTop: '60px'
            }}
          >
            <div className="relative h-[120px] mb-8 overflow-visible">
              <motion.h1 
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="text-[150px] font-bold text-gray-100 uppercase absolute -top-20 left-0 w-full text-left whitespace-nowrap overflow-visible"
                style={{ color: '#d2d1e6', opacity: 0.1 }}
              >
                NOTIFICATIONS
              </motion.h1>
              <motion.h2 
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                className='text-2xl font-semibold text-slate-600 absolute bottom-0 left-0 z-10'
              >
                Notifications
              </motion.h2>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800"></h2>
            <div className="space-y-4">
              {notifications.flat().map((notification, index) => (
                <div 
                  key={notification._id || index} 
                  className="notification-item transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    scrollSnapAlign: 'start',
                    willChange: 'transform, box-shadow'
                  }}
                >
                  {renderNotification(notification)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {disputePopup.show && (
        <DisputeRatingPopup
          show={disputePopup.show}
          onClose={handleCloseDisputePopup}
          notification={disputePopup.notification}
          ratingId={disputePopup.ratingId}
          ratingType={disputePopup.ratingType}
          raterName={disputePopup.raterName}
          currentUser={currentUser}
          onSubmitSuccess={superUserProps?.onDisputeSubmit || onDisputeSubmit || handleDisputeSubmitSuccess}
        />
      )}
      {viewingRequestPopup.show && (
        viewingRequestPopup.notification?.data?.type === 'viewing_rejection' ? (
          <ViewingRejectionPopup 
            notification={viewingRequestPopup.notification} 
            onClose={() => setViewingRequestPopup({ show: false, notification: null })} 
          />
        ) : (
          <ViewingRequestPopup 
            notification={viewingRequestPopup.notification} 
            onClose={() => setViewingRequestPopup({ show: false, notification: null })} 
          />
        )
      )}
      {showConfirmation && disputeDetails && renderConfirmationPopup()}
      {showAlreadyDisputedPopup && alreadyDisputedDetails && renderAlreadyDisputedPopup()}
      {showDisputeSubmittedPopup && disputeSubmittedDetails && renderDisputeSubmittedPopup()}
      {showDisputeDoneAlready && (
        <DisputeDoneAlreadyPopup 
          onClose={() => setShowDisputeDoneAlready(false)} 
        />
      )}
      {showNewRatingPopup && selectedNotification && (
        <NewRatingPopup
          ratingData={{
            ratingId: selectedNotification.data?.ratingId,
            ratedBy: selectedNotification.data?.ratedBy || selectedNotification.from,
            categories: selectedNotification.data?.categories || [],
            comment: selectedNotification.data?.comment || '',
            createdAt: selectedNotification.createdAt
          }}
          onClose={() => {
            setShowNewRatingPopup(false);
            setSelectedNotification(null);
          }}
          onDispute={(disputeData) => {
            handleOpenDisputePopup({
              ...selectedNotification,
              data: {
                ...selectedNotification.data,
                ...disputeData
              }
            });
          }}
        />
      )}
    </div>
  );
}
