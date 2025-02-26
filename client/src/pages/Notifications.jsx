import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import logo from '../assets/tiny logo.png';
import DisputeRatingPopup from '../components/DisputeRatingPopup';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

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
    loading: false,
    notification: null
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
  const [ratingDetailsPopup, setRatingDetailsPopup] = useState({ show: false, notification: null });
  const { currentUser } = useSelector((state) => state.user);

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

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications for user:', currentUser._id);
      
      // Fetch system notifications
      const systemNotificationsResponse = await fetch('http://localhost:3000/api/notifications', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      console.log('System notifications response:', {
        status: systemNotificationsResponse.status,
        ok: systemNotificationsResponse.ok
      });

      let systemNotifications = [];
      if (systemNotificationsResponse.ok) {
        const systemNotificationsData = await systemNotificationsResponse.json();
        console.log('System notifications response:', systemNotificationsData);

        // Handle different possible response formats
        if (systemNotificationsData.unseen && systemNotificationsData.seen) {
          systemNotifications = [...(systemNotificationsData.unseen || []), ...(systemNotificationsData.seen || [])];
        } else if (Array.isArray(systemNotificationsData)) {
          systemNotifications = systemNotificationsData;
        } else if (systemNotificationsData.notifications) {
          systemNotifications = systemNotificationsData.notifications;
        } else {
          console.warn('Unexpected system notifications format:', systemNotificationsData);
        }

        console.log('System notifications fetched:', systemNotifications.length);
      } else {
        const errorText = await systemNotificationsResponse.text();
        console.error('Failed to fetch system notifications:', errorText);
      }

      // Fetch rating notifications
      const ratingNotificationsResponse = await fetch('http://localhost:3000/api/rating-notifications/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      console.log('Rating notifications response:', {
        status: ratingNotificationsResponse.status,
        ok: ratingNotificationsResponse.ok
      });

      let ratingNotifications = [];
      if (ratingNotificationsResponse.ok) {
        ratingNotifications = await ratingNotificationsResponse.json();
        console.log('Rating notifications fetched:', ratingNotifications.length);
      } else {
        const errorText = await ratingNotificationsResponse.text();
        console.error('Failed to fetch rating notifications:', errorText);
      }

      // Combine and sort notifications
      const combinedNotifications = [
        ...(Array.isArray(systemNotifications) ? systemNotifications : []).map(n => ({ 
          ...n, 
          type: n.type || 'system' 
        })),
        ...(Array.isArray(ratingNotifications) ? ratingNotifications : []).map(n => ({ 
          ...n, 
          type: 'rating', 
          createdAt: n.createdAt,
          data: {
            ratingDetails: n.ratingDetails,
            ratedBy: n.ratedBy
          }
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log('Combined notifications:', {
        total: combinedNotifications.length,
        types: combinedNotifications.map(n => n.type)
      });

      setNotifications(combinedNotifications);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message || 'Failed to fetch notifications');
      setLoading(false);
      toast.error('Unable to load notifications. Please try again later.');
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

    const intervalId = setInterval(fetchNotifications, 300000); // Refresh every 30 seconds

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

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/notifications/mark-read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to mark notification as read');
      }

      // Update the notifications state
      setNotifications(prev => ({
        unseen: prev.unseen.filter(n => n.id !== notificationId),
        seen: [...prev.seen, ...prev.unseen.filter(n => n.id === notificationId)]
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

  const handleDisputeClick = async (notification) => {
    console.error('DISPUTE CLICK TRIGGERED', { 
      notification,
      type: notification.type,
      id: notification.id,
      disputed: notification.disputed
    });

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('NO ACCESS TOKEN');
        toast.error('Authentication required');
        return;
      }

      // Check dispute status
      const disputeCheckResponse = await fetch(`http://localhost:3000/api/dispute/check/${notification.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.error('DISPUTE CHECK RESPONSE', {
        status: disputeCheckResponse.status,
        statusText: disputeCheckResponse.statusText
      });

      const disputeCheckData = await disputeCheckResponse.json();

      console.error('DISPUTE CHECK DATA', disputeCheckData);

      // If already disputed
      if (disputeCheckData.disputed) {
        console.error('RATING ALREADY DISPUTED');
        const disputeDetails = disputeCheckData.dispute;
        setAlreadyDisputedDetails({
          id: disputeDetails._id.slice(-6).toUpperCase(),
          message: "You have already submitted a dispute for this rating. Our support team will review your case and get back to you soon.",
          status: disputeDetails.status,
          date: new Date(disputeDetails.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        });
        setShowAlreadyDisputedPopup(true);
        return;
      }

      // Prepare categories for dispute
      const ratingCategories = notification.ratingDetails?.categories || 
        (notification.ratings || [])
          .filter(r => r.category !== 'overall')
          .map(rating => ({
            category: rating.category,
            value: rating.value,
            selected: false
          }));

      console.error('PREPARED RATING CATEGORIES', ratingCategories);

      // Set dispute popup state
      setDisputePopup({
        show: true,
        ratingId: notification.id,
        ratingType: disputeCheckData.ratingType || notification.ratingType || 'tenant', 
        categories: ratingCategories,
        selectedCategories: [],
        reason: '',
        selectedReason: '',
        otherReason: '',
        loading: false,
        notification: notification
      });

      console.error('DISPUTE POPUP STATE SET', {
        ratingId: notification.id,
        ratingType: disputeCheckData.ratingType || notification.ratingType || 'tenant'
      });

    } catch (error) {
      console.error('FULL DISPUTE CLICK ERROR', {
        message: error.message,
        stack: error.stack,
        notification: notification
      });
      toast.error('Error processing dispute request');
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

  const handleSubmitDispute = async () => {
    console.error('SUBMIT DISPUTE CALLED', {
      disputeSelectedCategories: disputePopup.selectedCategories,
      disputeReasonType: disputePopup.selectedReason,
      disputeReason: disputePopup.reason,
      isSubmittingDispute: disputePopup.loading
    });

    // Prevent multiple submissions
    if (disputePopup.loading) {
      console.error('DISPUTE ALREADY SUBMITTING');
      return;
    }

    // Validate inputs
    if (disputePopup.selectedCategories.length === 0) {
      console.error('NO CATEGORIES SELECTED');
      toast.error('Please select at least one category to dispute');
      return;
    }

    if (!disputePopup.selectedReason) {
      console.error('NO REASON TYPE SELECTED');
      toast.error('Please select a reason type');
      return;
    }

    if (disputePopup.selectedReason === 'Other' && !disputePopup.otherReason.trim()) {
      console.error('OTHER REASON REQUIRED BUT EMPTY');
      toast.error('Please provide a detailed reason');
      return;
    }

    // Set submitting state
    setDisputePopup(prev => ({ ...prev, loading: true }));

    try {
      // Prepare dispute data
      const disputeData = {
        ratingId: disputePopup.ratingId,
        ratingType: disputePopup.ratingType || 'tenant',
        categories: disputePopup.selectedCategories.map(category => ({
          category: category.category,
          value: category.value
        })),
        reason: disputePopup.selectedReason === 'Other' 
          ? disputePopup.otherReason 
          : {
              'Inaccurate or unfair assessment': 'Inaccurate or unfair assessment',
              'Rating based on factors outside my control': 'Rating based on factors outside my control',
              'Personal bias or conflict of interest': 'Personal bias or conflict of interest',
              'Incorrect information or misunderstanding': 'Incorrect information or misunderstanding'
            }[disputePopup.selectedReason],
        reasonType: disputePopup.selectedReason === 'Other' ? 'Other' : 
          {
            'Inaccurate or unfair assessment': 'Inaccurate or unfair assessment',
            'Rating based on factors outside my control': 'Rating based on factors outside my control',
            'Personal bias or conflict of interest': 'Personal bias or conflict of interest',
            'Incorrect information or misunderstanding': 'Incorrect information or misunderstanding'
          }[disputePopup.selectedReason]
      };

      console.error('PREPARED DISPUTE DATA', JSON.stringify(disputeData, null, 2));

      // Send dispute to backend
      const response = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        credentials: 'include',
        body: JSON.stringify(disputeData)
      });

      console.error('DISPUTE SUBMISSION RESPONSE', {
        status: response.status,
        statusText: response.statusText
      });

      const result = await response.json();

      console.error('DISPUTE SUBMISSION RESULT', JSON.stringify(result, null, 2));

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit dispute');
      }

      // Create a notification for the super user
      const notificationData = {
        type: 'dispute_submitted',
        title: 'New Rating Dispute',
        content: `A new dispute has been submitted for a ${disputeData.ratingType} rating. Dispute ID: ${result.dispute._id}`,
        from: result.dispute.disputedBy.id,
        to: null, // Will be handled by backend to send to super users
        data: {
          disputeId: result.dispute._id,
          ratingType: disputeData.ratingType,
          categories: disputeData.categories,
          reason: disputeData.reason,
          reasonType: disputeData.reasonType
        },
        read: false
      };

      console.error('SUPER USER NOTIFICATION DATA', JSON.stringify(notificationData, null, 2));

      // Send notification to super users
      const notificationResponse = await fetch('/api/notifications/create-super-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        credentials: 'include',
        body: JSON.stringify(notificationData)
      });

      console.error('SUPER USER NOTIFICATION RESPONSE', {
        status: notificationResponse.status,
        statusText: notificationResponse.statusText
      });

      const notificationResult = await notificationResponse.json();
      console.error('SUPER USER NOTIFICATION RESULT', JSON.stringify(notificationResult, null, 2));

      // Update notifications to show dispute status
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

      // Show confirmation
      setDisputeDetails({
        message: "Your dispute has been submitted successfully. You will be notified when there's an update."
      });
      setShowConfirmation(true);

      // Reset dispute popup
      setDisputePopup({
        show: false,
        ratingId: null,
        ratingType: null,
        categories: [],
        selectedCategories: [],
        reason: '',
        selectedReason: '',
        otherReason: '',
        loading: false,
        notification: null
      });

      toast.success('Dispute submitted successfully');
    } catch (error) {
      console.error('FULL DISPUTE SUBMISSION ERROR', {
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

  const handleNotificationClick = (notification) => {
    if (notification.type === 'system' && 
       (notification.data?.type === 'viewing_rejection' || notification.data?.type === 'viewing_accepted')) {
      setViewingRequestPopup({ show: true, notification });
    } else if (notification.type === 'rating') {
      setRatingDetailsPopup({ show: true, notification });
    }
  };

  const RatingDetailsPopup = ({ notification, onClose }) => {
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    const [disputeCategories, setDisputeCategories] = useState([]);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeReasonType, setDisputeReasonType] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    const ratingDetails = notification.data?.ratingDetails || {};
    const ratedBy = notification.data?.ratedBy || {};

    const handleOpenDisputeModal = () => {
      setIsDisputeModalOpen(true);
    };

    const handleCloseDisputeModal = () => {
      setIsDisputeModalOpen(false);
      setDisputeCategories([]);
      setDisputeReason('');
      setDisputeReasonType('');
    };

    const handleCategoryToggle = (category) => {
      setDisputeCategories(prev => 
        prev.includes(category) 
          ? prev.filter(cat => cat !== category) 
          : [...prev, category]
      );
    };

    const handleSubmitDispute = async () => {
      if (disputeCategories.length === 0 || !disputeReason || !disputeReasonType) {
        toast.error('Please select categories, provide a reason, and choose a reason type.');
        return;
      }

      setIsSubmittingDispute(true);

      try {
        const response = await fetch('http://localhost:3000/api/rating-notifications/dispute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          credentials: 'include',
          body: JSON.stringify({
            ratingId: notification._id,
            ratingType: notification.data.ratingType,
            categories: disputeCategories,
            reason: disputeReason,
            reasonType: disputeReasonType
          })
        });

        toast.success('Dispute submitted successfully');
        handleCloseDisputeModal();
      } catch (error) {
        console.error('Failed to submit dispute:', error);
        toast.error(error.response?.data?.message || 'Failed to submit dispute');
      } finally {
        setIsSubmittingDispute(false);
      }
    };

    return ReactDOM.createPortal(
      <>
        <div 
          className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center overflow-hidden"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            zIndex: 9999 
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full relative z-[10000]"
            style={{ 
              position: 'relative', 
              zIndex: 10000 
            }}
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-6 h-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>

            <h2 className="text-2xl font-bold mb-4 text-blue-600">
              Rating Details
            </h2>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={ratedBy.avatar || '/default-avatar.png'}
                  alt={ratedBy.username || 'Rater'}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-lg">
                    {ratedBy.username || 'Anonymous'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {['communication', 'cleanliness', 'reliability'].map((category) => (
                  <div key={category}>
                    <p className="font-semibold capitalize">
                      {category}
                    </p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, index) => (
                        <svg 
                          key={index} 
                          className={`w-5 h-5 ${index < ratingDetails[category] ? 'text-yellow-400' : 'text-gray-300'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-gray-600">{ratingDetails[category]}/5</span>
                    </div>
                  </div>
                ))}

                <div>
                  <p className="font-semibold">Overall Rating</p>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, index) => (
                      <svg 
                        key={index} 
                        className={`w-6 h-6 ${index < Math.round(ratingDetails.overall) ? 'text-yellow-400' : 'text-gray-300'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-2 text-gray-600">{ratingDetails.overall?.toFixed(1) || 'N/A'}/5</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4 flex justify-between items-center">
              <button
                onClick={handleOpenDisputeModal}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                Dispute Rating
              </button>
            </div>
          </div>
        </div>

        {isDisputeModalOpen && (
          <div 
            className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center overflow-hidden"
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              zIndex: 10000 
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full relative"
              style={{ 
                position: 'relative', 
                zIndex: 10001 
              }}
            >
              <button 
                onClick={handleCloseDisputeModal} 
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-6 h-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>

              <h2 className="text-2xl font-bold mb-4 text-yellow-600">
                Dispute Rating
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2">Select Categories to Dispute</p>
                  
                  {/* Current Rating Display */}
                  <div className="bg-gray-100 rounded-md p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Current Rating</h3>
                    <div className="space-y-2">
                      {['communication', 'cleanliness', 'reliability'].map((category) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="capitalize font-medium text-gray-600">{category}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, index) => (
                              <svg 
                                key={index} 
                                className={`w-5 h-5 ${index < ratingDetails[category] ? 'text-yellow-400' : 'text-gray-300'}`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="ml-2 text-gray-600 font-medium">
                              {ratingDetails[category]}/5
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Overall Rating */}
                      <div className="flex justify-between items-center border-t mt-2 pt-2">
                        <span className="font-semibold text-gray-700">Overall Rating</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, index) => (
                            <svg 
                              key={index} 
                              className={`w-6 h-6 ${index < Math.round(ratingDetails.overall) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-2 text-gray-600 font-medium">
                            {ratingDetails.overall?.toFixed(1) || 'N/A'}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Selection Buttons */}
                  <div className="flex space-x-2">
                    {['communication', 'cleanliness', 'reliability'].map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        className={`px-3 py-1 rounded-md text-sm transition-colors ${
                          disputeCategories.includes(category) 
                            ? 'bg-yellow-500 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Reason Type</label>
                  <select
                    value={disputeReasonType}
                    onChange={(e) => {
                      setDisputeReasonType(e.target.value);
                      // Clear reason if not 'other'
                      if (e.target.value !== 'other') {
                        setDisputeReason('');
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select Reason Type</option>
                    <option value="inaccurate">Inaccurate Rating</option>
                    <option value="unfair">Unfair Assessment</option>
                    <option value="incorrect">Incorrect Information</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {disputeReasonType === 'other' && (
                  <div>
                    <label className="block font-semibold mb-2">Detailed Reason</label>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                      placeholder="Provide details about your dispute..."
                      required
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmitDispute}
                disabled={
                  isSubmittingDispute || 
                  disputeCategories.length === 0 || 
                  !disputeReasonType || 
                  (disputeReasonType === 'other' && !disputeReason.trim())
                }
                className={`
                  w-full px-4 py-2 rounded-md text-white transition-colors
                  ${
                    isSubmittingDispute || 
                    disputeCategories.length === 0 || 
                    !disputeReasonType || 
                    (disputeReasonType === 'other' && !disputeReason.trim())
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-yellow-500 hover:bg-yellow-600'
                  }
                `}
              >
                {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        )}
      </>,
      document.body
    );
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
    if (notification.type === 'rating') {
      return (
        <img
          src={notification.rater?.avatar || '/default-avatar.png'}
          alt={notification.rater?.username || 'User'}
          className="w-10 h-10 rounded-full"
        />
      );
    }

    // Default icon (should never reach here since all types are covered above)
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
    
    if (notification.type === 'rating') {
      return (
        <span className="font-medium">
          <span className="text-blue-600">{notification.rater?.username || 'Anonymous'}</span>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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
        return (
          <>
            <div className="flex items-start space-x-4">
              <img
                src={notification.from?.avatar || notification.systemInfo?.avatar || '/default-avatar.png'}
                alt={notification.from?.username || notification.systemInfo?.name || 'Landlord'}
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
                  From: {notification.from?.username || notification.systemInfo?.name || 'Anonymous'}
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
                {notification.content || notification.message}
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

        {ratingDetailsPopup.show && ratingDetailsPopup.notification._id === notification._id && (
          <RatingDetailsPopup 
            notification={ratingDetailsPopup.notification} 
            onClose={() => setRatingDetailsPopup({ show: false, notification: null })} 
          />
        )}
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
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.77 1.333-.38 1.81.588 1.81h3.461a1 1 0 00.951-.69l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.77-1.333-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
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
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)' }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out animate-popup"
        >
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Dispute {disputeDetails?.id}</h3>
            <p className="text-gray-600 mb-4">{disputeDetails?.message}</p>
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>

          <div className="mb-6 bg-gray-50 p-3 rounded-lg">
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
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Dispute ID:</span>
                <div className="flex items-center">
                  <code className="bg-gray-100 px-2 py-1 rounded mr-2">{disputeSubmittedDetails.id}</code>
                  <button
                    onClick={(e) => handleCopyId(e, disputeSubmittedDetails.id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
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
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const navigate = useNavigate();

    // Clean message for display
    const cleanMessage = (message) => {
      if (!message) {
        message = notification.content || notification.data?.message || 'No message available';
      }
      return message;
    };
    const cleanedMessage = cleanMessage(notification.message);

    // Extract requester information
    const requesterName = notification.from?.username || 
                          notification.systemInfo?.name || 
                          'Anonymous';
    
    const requesterEmail = notification.from?.email || '';
    const requesterPhone = notification.from?.phone || '';

    const requesterAvatar = notification.from?.avatar || 
                            notification.systemInfo?.avatar || 
                            '/default-avatar.png';

    const handleListingClick = () => {
      const listingId = notification.data?.listing?._id;
      if (listingId) {
        onClose();
        navigate(`/listing/${listingId}`);
      }
    };

    const isAccepted = notification.data?.type === 'viewing_accepted';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className={`text-2xl font-bold mb-4 ${isAccepted ? 'text-green-600' : 'text-red-600'}`}>
            {isAccepted ? 'Viewing Request Accepted' : 'Viewing Request Details'}
          </h2>
          
          <div className="mb-6">
            <div 
              onClick={handleListingClick}
              className={`bg-gray-50 rounded-lg p-4 mb-4 ${notification.data?.listing?._id ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
            >
              <h3 className="text-lg font-semibold mb-2">Listing Details</h3>
              <p className="text-gray-700">
                <span className="font-medium">Name: </span>
                {notification.data?.listing?.name || 'Unnamed Listing'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">ID: </span>
                <span className="font-mono text-sm">{notification.data?.listing?._id || 'N/A'}</span>
              </p>
            </div>
            <p className="text-gray-700 text-lg">{cleanedMessage}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">From Landlord</h3>
            <div className="flex items-center gap-3">
              <img
                src={requesterAvatar}
                alt={requesterName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-lg">{requesterName}</p>
                {requesterEmail && (
                  <p className="text-gray-600">{requesterEmail}</p>
                )}
                {requesterPhone && (
                  <p className="text-gray-600">{requesterPhone}</p>
                )}
              </div>
            </div>
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
              {notifications.map((notification, index) => (
                <div 
                  key={notification.id || index} 
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

      {disputePopup.show && renderDisputePopup()}
      {viewingRequestPopup.show && <ViewingRequestPopup notification={viewingRequestPopup.notification} onClose={() => setViewingRequestPopup({ show: false, notification: null })} />}
      {showConfirmation && disputeDetails && renderConfirmationPopup()}
      {showAlreadyDisputedPopup && alreadyDisputedDetails && renderAlreadyDisputedPopup()}
      {showDisputeSubmittedPopup && disputeSubmittedDetails && renderDisputeSubmittedPopup()}
    </div>
  );
}
