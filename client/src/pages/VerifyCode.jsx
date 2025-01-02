import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function VerifyCode() {
  const [code, setCode] = useState('');
  const [expiryTime, setExpiryTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sender, setSender] = useState(null);
  const { userId, code: urlCode } = useParams();

  useEffect(() => {
    const fetchCode = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user details
        const userRes = await fetch(`/api/user/${userId}`);
        const userData = await userRes.json();
        
        if (!userRes.ok) {
          throw new Error(userData.message || 'Could not find sender');
        }
        
        setSender(userData);

        // Fetch code details using POST
        const codeRes = await fetch('/api/code/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            code: urlCode,
            landlordId: userId
          })
        });

        const codeData = await codeRes.json();

        if (!codeRes.ok) {
          throw new Error(codeData.message || 'Could not verify code');
        }

        setCode(urlCode);
        // Convert expiry time string to timestamp
        if (codeData.expiryTime) {
          setExpiryTime(new Date(codeData.expiryTime).getTime());
        }
      } catch (err) {
        console.error('Error fetching code:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId && urlCode) {
      fetchCode();
    }
  }, [userId, urlCode]);

  // Format time remaining
  const getTimeRemaining = () => {
    if (!expiryTime) return '';
    
    const now = new Date().getTime();
    const timeLeft = expiryTime - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    // Add leading zeros for better formatting
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `Valid for: ${formattedHours}h ${formattedMinutes}m`;
  };

  if (loading) {
    return (
      <div className='max-w-lg mx-auto p-3 text-center'>
        <h1 className='text-3xl font-semibold my-7'>Verification Code</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-lg mx-auto p-3 text-center'>
        <h1 className='text-3xl font-semibold my-7'>Verification Code</h1>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div className='max-w-lg mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-center my-7'>Verification Code</h1>
      {sender && (
        <div className='flex items-center justify-center mb-4'>
          <img
            src={sender.avatar || "https://via.placeholder.com/150"}
            alt={sender.username}
            className='w-16 h-16 rounded-full object-cover'
          />
          <div className='ml-4'>
            <h2 className='text-xl font-semibold'>{sender.username}</h2>
            <p className='text-gray-500'>{sender.email}</p>
          </div>
        </div>
      )}
      <div className='bg-white p-8 rounded-lg shadow-md'>
        <div className='text-6xl font-mono tracking-wider bg-gray-100 p-6 rounded-lg text-center select-all'>
          {code.split('').map((char, index) => (
            <span 
              key={index} 
              className={`mx-1 ${/[0-9]/.test(char) ? 'text-blue-600' : 
                /[A-Z]/.test(char) ? 'text-green-600' : 'text-purple-600'}`}
            >
              {char}
            </span>
          ))}
        </div>
        <p className='text-center text-gray-500 mt-4'>
          {getTimeRemaining()}
        </p>
      </div>
    </div>
  );
}
