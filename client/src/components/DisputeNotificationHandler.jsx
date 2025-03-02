import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

export default function DisputeNotificationHandler({ disputeData, onNotificationSent }) {
  console.log(' [DisputeNotificationHandler] Component rendered with data:', {
    disputeData
  });

  const { currentUser } = useSelector((state) => state.user);
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const createDisputeNotification = async () => {
      if (notificationSent) {
        console.log(' [DisputeNotificationHandler] Notification already sent, skipping...', {
          disputeData
        });
        return;
      }

      try {
        console.log(' [DisputeNotificationHandler] Starting notification creation...', {
          currentUser: currentUser?._id,
          disputeData
        });

        if (!currentUser?._id || !currentUser?.token) {
          console.error(' [DisputeNotificationHandler] Missing user data:', { 
            userId: currentUser?._id,
            hasToken: !!currentUser?.token 
          });
          return;
        }

        if (!disputeData?.id || !disputeData?.raterName) {
          console.error(' [DisputeNotificationHandler] Missing dispute data:', { 
            id: disputeData?.id,
            raterName: disputeData?.raterName,
            fullData: disputeData 
          });
          return;
        }

        const notificationData = {
          type: 'dispute_received',
          to: currentUser._id,
          from: currentUser._id, 
          message: `Your dispute against ${disputeData.raterName}'s rating has been successfully submitted. Our team is reviewing your dispute. Thank you for your patience. Dispute ID: ${disputeData.id}`,
          data: {
            disputeId: disputeData.id,
            raterName: disputeData.raterName,
            status: 'pending',
            categories: disputeData.categories.map(cat => ({
              category: typeof cat === 'string' ? cat : cat.category,
              rating: typeof cat === 'string' ? null : cat.rating || cat.value
            })),
            reason: disputeData.reason,
            reasonType: disputeData.reasonType
          }
        };

        console.log(' [DisputeNotificationHandler] Sending notification:', {
          message: notificationData.message,
          data: notificationData.data
        });

        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify(notificationData)
        });

        const responseText = await response.text();
        console.log(' [DisputeNotificationHandler] Raw response:', responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error(' [DisputeNotificationHandler] Failed to parse response:', responseText);
          throw new Error('Invalid response format');
        }

        if (!response.ok) {
          console.error(' [DisputeNotificationHandler] Failed to create notification:', {
            status: response.status,
            response: responseData
          });
          throw new Error(`Failed to create notification: ${responseData.message || 'Unknown error'}`);
        }

        console.log(' [DisputeNotificationHandler] Notification created successfully:', {
          response: responseData,
          notificationId: responseData._id || responseData.id
        });

        if (isMounted) {
          setNotificationSent(true);
          toast.success('Dispute confirmation notification sent!');
          
          if (onNotificationSent) {
            console.log(' [DisputeNotificationHandler] Calling onNotificationSent callback...');
            onNotificationSent(responseData);
          }
        }
      } catch (error) {
        console.error(' [DisputeNotificationHandler] Error creating notification:', {
          error: error.message,
          stack: error.stack
        });
        if (isMounted) {
          toast.error('Failed to send dispute confirmation notification');
        }
      }
    };

    // Start the notification creation process
    console.log(' [DisputeNotificationHandler] Starting notification creation process...');
    createDisputeNotification();

    return () => {
      isMounted = false;
    };
  }, [disputeData, currentUser, notificationSent, onNotificationSent]);

  return null;
}
