import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default function GeneratedCode() {
  const [code, setCode] = useState('');
  const [expiryTime, setExpiryTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    const fetchCode = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/code/generate', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Could not generate code');
        }

        setCode(data.code);
        setExpiryTime(new Date(data.expiryTime).getTime());
      } catch (err) {
        console.error('Error fetching code:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [currentUser, navigate]);

  // Format time remaining
  const getTimeRemaining = () => {
    if (!expiryTime) return '';
    
    const now = new Date().getTime();
    const timeLeft = expiryTime - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Valid for: ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className='max-w-lg mx-auto p-3 text-center'>
        <h1 className='text-3xl font-semibold my-7'>Generated Code</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-lg mx-auto p-3 text-center'>
        <h1 className='text-3xl font-semibold my-7'>Generated Code</h1>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div className='max-w-lg mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-center my-7'>Generated Code</h1>
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
