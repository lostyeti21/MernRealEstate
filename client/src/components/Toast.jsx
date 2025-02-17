import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom notification types
export const showRatingNotification = (rating, raterName, userType) => {
  const message = `You have just been rated ${rating} stars by ${raterName}`;
  const userTypeLabel = userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();
  
  toast.success(message, {
    position: "bottom-left",
    autoClose: false,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    icon: '⭐',
    className: `rating-notification ${userType.toLowerCase()}-notification`,
    closeButton: true
  });
};

// Toast container component
const Toast = () => {
  return (
    <ToastContainer
      position="bottom-left"
      autoClose={false}
      hideProgressBar
      newestOnTop
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
};

export default Toast;
