import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  format, 
  addDays, 
  setHours, 
  setMinutes, 
  parse, 
  getMinutes, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';
import Loader from '../components/Loader';
import RejectionReasonPopup from '../components/RejectionReasonPopup';
import AcceptMorePopup from '../components/AcceptMorePopup';
import ViewingCalendar from '../components/ViewingCalendar';

const TimeSlotDetailPopup = ({ timeSlot, onClose, onSelect }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // Generate available dates (next 6 weeks)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    // Loop through the next 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = addDays(today, i);
      const dayName = format(date, 'EEEE').toLowerCase();
      
      if (dayName === timeSlot.day) {
        dates.push(date);
      }
    }
    return dates;
  };

  // Generate available times within the time slot
  const getAvailableTimes = () => {
    const times = [];
    const startTime = parse(timeSlot.start, 'HH:mm', new Date());
    const endTime = parse(timeSlot.end, 'HH:mm', new Date());
    
    let currentTime = startTime;
    while (currentTime <= endTime) {
      times.push(format(currentTime, 'HH:mm'));
      currentTime = setMinutes(currentTime, getMinutes(currentTime) + 30);
    }
    return times;
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }
    
    const dateTime = setMinutes(
      setHours(
        new Date(selectedDate),
        parseInt(selectedTime.split(':')[0]),
      ),
      parseInt(selectedTime.split(':')[1])
    );
    
    onSelect({
      ...timeSlot,
      selectedDate: dateTime
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Select Date & Time for {timeSlot.day.charAt(0).toUpperCase() + timeSlot.day.slice(1)}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Dates
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a date</option>
              {getAvailableDates().map((date) => (
                <option key={date.toISOString()} value={date.toISOString()}>
                  {format(date, 'EEEE, MMMM d, yyyy')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Times
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a time</option>
              {getAvailableTimes().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime}
            className={`
              w-full py-2 rounded-md transition-colors
              ${(!selectedDate || !selectedTime)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
          >
            {selectedDate && selectedTime ? (
              <>
                Confirm for {format(new Date(selectedDate), 'MMM d')} at {selectedTime}
                <span className="block text-sm opacity-90">
                  {format(new Date(selectedDate), 'EEEE')}
                </span>
              </>
            ) : (
              'Select Date and Time'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ notifications }) => {
  console.log('Notifications passed to CalendarView:', notifications);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  // Get all viewing times from notifications
  const getViewingsForDate = (date) => {
    return notifications.filter(notification => {
      return notification.selectedTimes?.some(time => 
        time.selectedDate && isSameDay(new Date(time.selectedDate), date)
      );
    });
  };

  // Group viewings by time for a specific date
  const getViewingsByTime = (date, viewings) => {
    const timeSlots = {};
    viewings.forEach(viewing => {
      viewing.selectedTimes
        .filter(time => time.selectedDate && isSameDay(new Date(time.selectedDate), date))
        .forEach(time => {
          const timeKey = format(new Date(time.selectedDate), 'HH:mm');
          if (!timeSlots[timeKey]) {
            timeSlots[timeKey] = [];
          }
          timeSlots[timeKey].push({
            username: viewing.from?.username,
            id: viewing._id
          });
        });
    });
    return Object.entries(timeSlots).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentMonth(date => subMonths(date, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          ←
        </button>
        <h3 className="text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(date => addMonths(date, 1))}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2 border-b">
            {day.slice(0, 3)}
          </div>
        ))}
        
        {getDaysInMonth().map((date, i) => {
          const viewings = getViewingsForDate(date);
          const viewingsByTime = getViewingsByTime(date, viewings);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          
          return (
            <div
              key={i}
              className={`
                min-h-[120px] p-2 border rounded-lg relative
                ${!isCurrentMonth ? 'bg-gray-100' : 
                  isSameDay(date, new Date()) ? 'bg-blue-50' : 'bg-white'}
                ${!isCurrentMonth ? 'opacity-50' : ''}
              `}
            >
              <div className="text-right text-sm font-medium mb-1">
                <span className={
                  isSameDay(date, new Date()) ? 'bg-blue-500 text-white' : ''
                }>
                  {format(date, 'd')}
                </span>
              </div>
              
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {viewingsByTime.map(([time, slots], idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-gray-700">{time}</div>
                    {slots.map((slot, slotIdx) => (
                      <div 
                        key={slotIdx}
                        className="bg-green-100 text-green-800 p-1 rounded mt-0.5 truncate"
                        title={`Viewing with ${slot.username}`}
                      >
                        {slot.username}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {viewings.length > 2 && (
                <div className="absolute bottom-1 right-1 text-xs text-gray-500">
                  +{viewings.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ViewingRequestPopup = ({ notification, onClose, onAccept, onReject }) => {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [timeSlotDetailPopup, setTimeSlotDetailPopup] = useState({
    show: false,
    timeSlot: null
  });
  
  const availableTimeSlots = notification.data?.timeSlots || [];

  const handleTimeSlotSelect = (timeSlot) => {
    setTimeSlotDetailPopup({
      show: true,
      timeSlot
    });
  };

  const handleTimeSlotDetailSelect = (detailedTimeSlot) => {
    setSelectedTimeSlots(prev => {
      // Remove any existing slot for the same day
      const filteredSlots = prev.filter(slot => slot.day !== detailedTimeSlot.day);
      return [...filteredSlots, detailedTimeSlot];
    });
    setTimeSlotDetailPopup({ show: false, timeSlot: null });
  };

  const handleAccept = () => {
    if (selectedTimeSlots.length === 0) {
      toast.error('Please select at least one viewing time');
      return;
    }
    onAccept({ ...notification, selectedTimes: selectedTimeSlots });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Viewing Request Details</h2>
        
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={notification.from?.avatar || '/default-avatar.png'} 
              alt="User avatar" 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold">{notification.from?.username}</p>
              <p className="text-sm text-gray-500">ID: {notification.data?.reservation?._id}</p>
            </div>
          </div>
          <p className="text-gray-700 mb-2">
            Status: 
            <span className={
              notification.status === 'pending' ? 'text-yellow-500' : 
              notification.status === 'accepted' ? 'text-green-500' : 
              'text-red-500'
            }>
              {' '}{notification.status}
            </span>
          </p>
          <p className="text-gray-700">{notification.message}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Available Time Slots:</h3>
          <div className="flex flex-wrap gap-2">
            {availableTimeSlots.map((timeSlot, index) => {
              const isSelected = selectedTimeSlots.some(selected => selected.day === timeSlot.day);
              return (
                <div
                  key={index}
                  onClick={() => handleTimeSlotSelect(timeSlot)}
                  className={`
                    px-3 py-1 rounded-full cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'bg-green-800 text-white'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }
                  `}
                >
                  {timeSlot.day.charAt(0).toUpperCase() + timeSlot.day.slice(1)}{' '}
                  {timeSlot.start} - {timeSlot.end}
                </div>
              );
            })}
          </div>
          
          {selectedTimeSlots.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Selected Times:</h4>
              <div className="space-y-2">
                {selectedTimeSlots.map((slot, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {format(slot.selectedDate, 'EEEE, MMMM d, yyyy')} at {format(slot.selectedDate, 'HH:mm')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {(!notification.status || notification.status === 'pending') && (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={selectedTimeSlots.length === 0}
                className={`
                  flex-1 py-3 rounded-md transition-colors flex items-center justify-center gap-2
                  ${selectedTimeSlots.length === 0 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }
                `}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Accept ({selectedTimeSlots.length} times)
              </button>
              <button
                onClick={() => onReject(notification)}
                className="flex-1 bg-red-500 text-white py-3 rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Reject
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Close
          </button>
        </div>
      </div>

      {timeSlotDetailPopup.show && (
        <TimeSlotDetailPopup
          timeSlot={timeSlotDetailPopup.timeSlot}
          onClose={() => setTimeSlotDetailPopup({ show: false, timeSlot: null })}
          onSelect={handleTimeSlotDetailSelect}
        />
      )}
    </div>
  );
};

const Schedule = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [scheduleNotifications, setScheduleNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [showRejectionReasonPopup, setShowRejectionReasonPopup] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showAcceptMorePopup, setShowAcceptMorePopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [blurredNotifications, setBlurredNotifications] = useState(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasListings, setHasListings] = useState(false);

  useEffect(() => {
    localStorage.setItem('scheduleActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/notifications/schedule/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch notifications');
        }

        const data = await res.json();
        
        if (data.success) {
          // Process notifications to ensure consistent data structure
          const processedNotifications = data.notifications.map(notification => {
            // Ensure reservations is always an array
            if (notification.data) {
              notification.data.reservations = notification.data.reservations || 
                (notification.data.reservation ? [notification.data.reservation] : []);
            }
            return notification;
          });
          
          setScheduleNotifications(processedNotifications);
        } else {
          throw new Error(data.message || 'Failed to fetch notifications');
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError(error.message || 'Failed to fetch notifications');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id && currentUser?.token) {
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    // Check if user has listings
    const checkListings = async () => {
      try {
        const res = await fetch(`/api/listing/user/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        const data = await res.json();
        setHasListings(data.listings && data.listings.length > 0);
        
        // If user has no listings and activeTab is 'pending', switch to 'accepted'
        if ((!data.listings || data.listings.length === 0) && activeTab === 'pending') {
          setActiveTab('accepted');
        }
      } catch (error) {
        console.error('Error checking listings:', error);
      }
    };

    if (currentUser?._id && currentUser?.token) {
      checkListings();
    }
  }, [currentUser, activeTab]);

  const handleAcceptViewing = async (notificationId, reservationId) => {
    try {
      // Find the notification and reservation details
      const notification = scheduleNotifications.find(n => n._id === notificationId);
      const reservation = notification?.data?.reservations?.find(r => r._id === reservationId);
      
      if (!notification || !reservation) {
        throw new Error('Notification or reservation not found');
      }

      const response = await fetch(`/api/reservation/accept/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept viewing request');
      }

      // Create acceptance notification
      const contactInfo = [];
      if (currentUser.email) {
        contactInfo.push(currentUser.email);
      }
      if (currentUser.phoneNumber) {
        contactInfo.push(currentUser.phoneNumber);
      }
      
      const contactText = contactInfo.length > 0 
        ? `please reach out to me at ${contactInfo.join(' or ')}` 
        : 'please reach out through the JustListIt messaging';

      const notificationTitle = 'Viewing Request Accepted';
      const notificationContent = `I am available to meet with you to view the property at ${notification.data.listing.name} at the specified time. For more information or any questions you may have, ${contactText}. See you then!`;

      await fetch('http://localhost:3000/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'system',
          title: notificationTitle,
          content: notificationContent,
          message: notificationContent,
          from: currentUser._id,
          to: notification.from._id,
          read: false,
          systemInfo: {
            name: currentUser.username,
            avatar: currentUser.avatar,
            timeSlots: [{
              day: format(new Date(reservation.date), 'EEEE').toLowerCase(),
              time: reservation.startTime,
              end: reservation.endTime
            }]
          },
          data: {
            reservationId: reservationId,
            listingId: notification.data.listing._id,
            type: 'viewing_accepted',
            listing: notification.data.listing,
            message: notificationContent,
            from: {
              _id: currentUser._id,
              username: currentUser.username,
              email: currentUser.email,
              avatar: currentUser.avatar,
              phone: currentUser.phoneNumber
            }
          },
          status: 'accepted'
        })
      });

      // Update the notifications state to reflect the acceptance
      setScheduleNotifications(prevNotifications => 
        prevNotifications.map(notification => {
          if (notification._id === notificationId) {
            return {
              ...notification,
              data: {
                ...notification.data,
                reservations: notification.data.reservations.map(res => 
                  res._id === reservationId 
                    ? { ...res, status: 'accepted' }
                    : res
                )
              }
            };
          }
          return notification;
        })
      );

      toast.success('Viewing request accepted successfully');

      // Check if there are more pending times for this notification
      const updatedNotification = scheduleNotifications.find(n => n._id === notificationId);
      const remainingPendingTimes = updatedNotification.data.reservations.filter(
        r => !r.status || r.status === 'pending'
      ).length;

      if (remainingPendingTimes > 0) {
        setCurrentNotification(updatedNotification);
        setShowAcceptMorePopup(true);
      } else {
        setActiveTab('accepted');
      }
    } catch (error) {
      console.error('Error accepting viewing request:', error);
      toast.error(error.message || 'Error accepting viewing request');
    }
  };

  const handleDoneAccepting = (notificationId) => {
    setBlurredNotifications(prev => new Set([...prev, notificationId]));
    setShowAcceptMorePopup(false);
    setCurrentNotification(null);
    setActiveTab('accepted');
  };

  const getFilteredNotifications = () => {
    return scheduleNotifications.filter(notification => {
      const reservations = notification.data?.reservations || [];
      switch (activeTab) {
        case 'pending':
          return reservations.some(r => !r.status || r.status === 'pending');
        case 'accepted':
          return reservations.some(r => r.status === 'accepted');
        case 'rejected':
          return reservations.some(r => r.status === 'rejected');
        default:
          return true;
      }
    });
  };

  const getAcceptedViewings = () => {
    return scheduleNotifications.flatMap(notification => 
      (notification.data?.reservations || [])
        .filter(r => r.status === 'accepted')
        .map(r => ({
          ...r,
          listing: notification.data.listing,
          viewer: notification.from
        }))
    );
  };

  const renderTabContent = () => {
    const filteredNotifications = getFilteredNotifications();
    
    if (activeTab === 'accepted') {
      const acceptedViewings = getAcceptedViewings();
      return (
        <div>
          <ViewingCalendar acceptedViewings={acceptedViewings} />
          
          <div className="bg-white rounded-lg shadow mb-6">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  View Schedule Notifications
                </h3>
                <p className="text-sm text-gray-600">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </p>
              </div>
              <svg
                className={`w-5 h-5 transform transition-transform ${showNotifications ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            
            {showNotifications && (
              <div className="p-4">
                <div className="space-y-4">
                  {filteredNotifications.map(notification => renderNotificationItem(notification))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredNotifications.map(notification => renderNotificationItem(notification))}
      </div>
    );
  };

  const renderNotificationItem = (notification) => {
    const reservations = notification.data?.reservations || [];
    const listing = notification.data?.listing;
    const viewer = notification.from;
    
    // Filter reservations based on tab
    const relevantReservations = activeTab === 'rejected' 
      ? reservations.filter(r => r.status === 'rejected')
      : reservations;
    
    // If no relevant reservations for this tab, don't show the notification
    if (relevantReservations.length === 0) return null;

    // Check if any reservation is pending
    const hasPendingReservations = reservations.some(r => r.status === 'pending');
    const pendingReservations = reservations.filter(r => r.status === 'pending');
    const isBlurred = blurredNotifications.has(notification._id) || activeTab === 'accepted';
    
    return (
      <div key={notification._id} className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {listing?.name || 'Property Viewing Request'}
            </h3>
            <p className="text-gray-600">
              {viewer?.username || 'Anonymous'} ({viewer?.email})
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(notification.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">
            {activeTab === 'rejected' ? 'Rejected Times:' : 'Requested Viewing Times:'}
          </h4>
          <div className="space-y-2">
            {relevantReservations.map(reservation => {
              const isAccepted = reservation.status === 'accepted';
              const showDetails = !isBlurred || isAccepted;
              
              return (
                <div 
                  key={reservation._id} 
                  className={`p-2 rounded ${
                    activeTab === 'rejected' ? 'bg-red-50 border border-red-100' :
                    isAccepted ? 'bg-green-100' : 'bg-gray-100'
                  } ${!showDetails ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">
                        {new Date(reservation.date).toLocaleDateString()}{' '}
                        {reservation.startTime} - {reservation.endTime}
                      </p>
                      {activeTab === 'rejected' && reservation.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {reservation.rejectionReason}
                        </p>
                      )}
                      {activeTab !== 'rejected' && showDetails && (
                        <>
                          <p className="text-sm capitalize text-gray-600">
                            Status: {reservation.status || 'pending'}
                          </p>
                          {reservation.rejectionReason && (
                            <p className="text-sm text-red-600">
                              Reason: {reservation.rejectionReason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {(!reservation.status || reservation.status === 'pending') && !isBlurred && activeTab !== 'rejected' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptViewing(notification._id, reservation._id)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNotification({
                              _id: notification._id,
                              pendingReservations: [reservation]
                            });
                            setShowRejectionReasonPopup(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show action buttons only if there are pending reservations and not blurred */}
        {hasPendingReservations && !isBlurred && activeTab !== 'rejected' && (
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                // Accept all pending reservations
                pendingReservations.forEach(r => 
                  handleAcceptViewing(notification._id, r._id)
                );
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Accept All
            </button>
            <button
              onClick={() => {
                setSelectedNotification({
                  _id: notification._id,
                  pendingReservations
                });
                setShowRejectionReasonPopup(true);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reject All
            </button>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { label: 'Pending', value: 'pending' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const handleRejectViewing = async (notificationId, reservationId, reason) => {
    try {
      const res = await fetch(`/api/reservation/reject/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ rejectionReason: reason })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reject viewing');
      }

      const notification = scheduleNotifications.find(n => n._id === notificationId);
      const reservation = notification?.data?.reservations?.find(r => r._id === reservationId);
      
      if (notification && reservation) {
        // Create rejection notification
        const contactInfo = [];
        if (currentUser.email) contactInfo.push(currentUser.email);
        if (currentUser.phoneNumber) contactInfo.push(currentUser.phoneNumber);
        
        const contactText = contactInfo.length > 0 
          ? `You can reach me at ${contactInfo.join(' or ')}` 
          : 'You can message me through the JustListIt in-house messaging';

        const notificationTitle = 'Viewing Request Rejected';
        const notificationContent = `Unfortunately, I will be unavailable at ${reservation.startTime} - ${reservation.endTime} on ${new Date(reservation.date).toLocaleDateString()} because ${reason}. I will reschedule with you. If you feel I am taking too long to reschedule, ${contactText}.`;

        await fetch('http://localhost:3000/api/notifications/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'system',
            title: notificationTitle,
            content: notificationContent,
            message: notificationContent,  
            from: currentUser._id,
            to: notification.from._id,
            read: false,
            systemInfo: {
              name: currentUser.username,
              avatar: currentUser.avatar,
              timeSlots: [{
                day: format(new Date(reservation.date), 'EEEE').toLowerCase(),
                time: reservation.startTime,
                end: reservation.endTime
              }]
            },
            data: {
              reservationId: reservationId,
              listingId: notification.data.listing._id,
              type: 'viewing_rejection',
              listing: notification.data.listing,
              message: notificationContent,  
              from: {
                _id: currentUser._id,
                username: currentUser.username,
                email: currentUser.email,
                avatar: currentUser.avatar,
                phone: currentUser.phoneNumber
              }
            },
            status: 'pending'
          })
        });
      }

      // Update the local state
      setScheduleNotifications(prev => prev.map(notification => {
        if (notification._id === notificationId) {
          return {
            ...notification,
            data: {
              ...notification.data,
              reservations: notification.data.reservations.map(reservation => 
                reservation._id === reservationId 
                  ? { ...reservation, status: 'rejected', rejectionReason: reason }
                  : reservation
              )
            }
          };
        }
        return notification;
      }));

      toast.success('Viewing request rejected');
    } catch (error) {
      console.error('Error rejecting viewing:', error);
      toast.error(error.message || 'Failed to reject viewing');
    }
  };

  const handleRejectionReasonSubmit = async (rejectionDetails) => {
    try {
      const { reason, alternativeDateTime, otherReason } = rejectionDetails;
      
      if (!selectedNotification) {
        throw new Error('No notification selected');
      }

      const pendingReservations = selectedNotification.pendingReservations;
      if (!pendingReservations || pendingReservations.length === 0) {
        throw new Error('No pending reservations found');
      }

      // Format the rejection reason
      let formattedReason = '';
      if (reason === 'time_not_suitable' && alternativeDateTime) {
        const date = new Date(alternativeDateTime.date);
        formattedReason = `Time not suitable. Alternative time suggested: ${date.toLocaleDateString()} from ${alternativeDateTime.startTime} to ${alternativeDateTime.endTime}`;
      } else if (reason === 'overbooked') {
        formattedReason = 'Viewing request rejected due to being overbooked.';
      } else if (reason === 'other' && otherReason) {
        formattedReason = `Viewing request rejected. Reason: ${otherReason}`;
      } else {
        formattedReason = 'Viewing request rejected.';
      }

      // Reject all pending reservations
      await Promise.all(
        pendingReservations.map(reservation =>
          handleRejectViewing(selectedNotification._id, reservation._id, formattedReason)
        )
      );

      setShowRejectionReasonPopup(false);
      setSelectedNotification(null);
      toast.success('Viewing requests rejected successfully');

    } catch (error) {
      console.error('Error rejecting viewing requests:', error);
      toast.error(error.message || 'Error rejecting viewing requests');
    }
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center text-red-500 mt-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-4">Schedule Management</h1>
        <div className="flex space-x-4">
          {hasListings && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'pending'
                  ? 'bg-slate-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
          )}
          <button
            onClick={() => setActiveTab('accepted')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'accepted'
                ? 'bg-slate-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'rejected'
                ? 'bg-slate-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        renderTabContent()
      )}

      {showAcceptMorePopup && currentNotification && (
        <AcceptMorePopup
          onClose={() => handleDoneAccepting(currentNotification._id)}
          onAcceptMore={() => {
            setShowAcceptMorePopup(false);
            setCurrentNotification(null);
          }}
          remainingTimes={
            currentNotification.data.reservations.filter(
              r => !r.status || r.status === 'pending'
            ).length
          }
        />
      )}

      {showRejectionReasonPopup && (
        <RejectionReasonPopup
          onClose={() => {
            setShowRejectionReasonPopup(false);
            setSelectedNotification(null);
          }}
          onSubmit={handleRejectionReasonSubmit}
        />
      )}
    </div>
  );
}

export default Schedule;
