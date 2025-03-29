import { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useSelector((state) => state.user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const isNotificationVeryRecent = (createdAt) => {
    const notificationTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const tenSeconds = 10 * 1000; // 10 seconds in milliseconds
    return currentTime - notificationTime <= tenSeconds;
  };

  const fetchNotifications = async () => {
    if (!currentUser?._id) return;

    try {
      // Fetch system notifications
      const [systemNotificationsRes, ratingNotificationsRes] = await Promise.all([
        fetch('http://localhost:3000/api/notifications', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        }),
        fetch('http://localhost:3000/api/rating-notifications/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        })
      ]);

      if (!systemNotificationsRes.ok) {
        throw new Error('Failed to fetch system notifications');
      }

      // Process system notifications
      const systemNotificationsData = await systemNotificationsRes.json();
      let systemNotifications = [];
      
      if (systemNotificationsData.unseen && systemNotificationsData.seen) {
        systemNotifications = [...(systemNotificationsData.unseen || []), ...(systemNotificationsData.seen || [])];
      } else if (Array.isArray(systemNotificationsData)) {
        systemNotifications = systemNotificationsData;
      } else if (systemNotificationsData.notifications) {
        systemNotifications = systemNotificationsData.notifications;
      }

      // Process rating notifications
      let ratingNotifications = [];
      if (ratingNotificationsRes.ok) {
        ratingNotifications = await ratingNotificationsRes.json();
      }

      // Combine and sort notifications
      const combinedNotifications = [
        ...systemNotifications.map(n => ({
          ...n,
          type: n.type || 'system',
          _id: n._id || n.id
        })),
        ...ratingNotifications.map(n => ({
          ...n,
          type: 'rating',
          _id: n._id || n.id,
          createdAt: n.createdAt,
          data: {
            ratingDetails: n.ratingDetails,
            ratedBy: n.ratedBy
          }
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Only send email for notifications that are less than 10 seconds old
      const veryRecentNotifications = combinedNotifications.filter(notification =>
        isNotificationVeryRecent(notification.createdAt)
      );

      // Send email only if there are very recent notifications
      if (veryRecentNotifications.length > 0) {
        try {
          await fetch('http://localhost:3000/api/auth/send-notification-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: currentUser.email,
              message: 'Hi, a new notification has arrived on your JustListIt account'
            }),
          });
          console.log('Email sent for notifications:', veryRecentNotifications.map(n => n._id));
        } catch (error) {
          console.error('Error sending notification email:', error);
        }
      }

      setNotifications(combinedNotifications);
      setLastFetchTime(new Date());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Poll for notifications every 50 seconds
  useEffect(() => {
    if (currentUser?._id) {
      fetchNotifications(); // Initial fetch
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser?._id]);

  return (
    <NotificationContext.Provider value={{ notifications, loading, fetchNotifications, lastFetchTime }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
