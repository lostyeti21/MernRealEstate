import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const SuperUserNotificationSender = ({ onClose, targetUserId, prefilledData }) => {
  const { currentUser } = useSelector((state) => state.user);
  const [notificationData, setNotificationData] = useState({
    title: prefilledData?.title || '',
    message: prefilledData?.message || '',
    type: prefilledData?.type || 'info',
    priority: prefilledData?.priority || 'normal',
    action: prefilledData?.action || ''
  });
  const [loading, setLoading] = useState(false);

  const notificationTypes = [
    { value: 'info', label: 'Information' },
    { value: 'warning', label: 'Warning' },
    { value: 'action_required', label: 'Action Required' },
    { value: 'dispute_response', label: 'Dispute Response' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      console.log('Sending notification:', {
        ...notificationData,
        targetUserId,
        fromSuperUser: currentUser._id
      });

      const response = await fetch('/api/notifications/send-super-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notificationData,
          targetUserId,
          fromSuperUser: currentUser._id,
          systemInfo: {
            name: currentUser.username,
            role: 'SuperUser',
            avatar: currentUser.avatar
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send notification');
      }

      console.log('Notification sent successfully:', data);
      toast.success('Notification sent successfully');
      onClose();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <h2 className="text-2xl font-semibold mb-6">Send Notification</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={notificationData.title}
              onChange={(e) => setNotificationData(prev => ({
                ...prev,
                title: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter notification title"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={notificationData.message}
              onChange={(e) => setNotificationData(prev => ({
                ...prev,
                message: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              required
              placeholder="Enter notification message"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={notificationData.type}
              onChange={(e) => setNotificationData(prev => ({
                ...prev,
                type: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {notificationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={notificationData.priority}
              onChange={(e) => setNotificationData(prev => ({
                ...prev,
                priority: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorityLevels.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action URL (optional)
            </label>
            <input
              type="text"
              value={notificationData.action}
              onChange={(e) => setNotificationData(prev => ({
                ...prev,
                action: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter action URL (optional)"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : 'Send Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperUserNotificationSender;
