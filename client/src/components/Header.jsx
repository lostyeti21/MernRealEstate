import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaUsers, FaHome, FaList, FaBell } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { signOut, realEstateSignInSuccess } from '../redux/user/userSlice';
import { io } from 'socket.io-client';
import logo from '../assets/logo.png';

export default function Header() {
  const { currentUser, isRealEstateCompany } = useSelector((state) => state.user);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasListings, setHasListings] = useState(false);
  const socket = useRef();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const usersMenuRef = useRef(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isMessagesPage = location.pathname === '/messages';

  useEffect(() => {
    if (!currentUser) return;

    socket.current = io('http://localhost:3000', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });

    // Listen for new messages
    socket.current.on('new_message', (data) => {
      console.log('New message received in header:', data);
      if (!isMessagesPage) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for message read events
    socket.current.on('messages_read', (data) => {
      if (data.userId === currentUser._id) {
        setUnreadCount(prev => Math.max(0, prev - data.count));
      }
    });

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/messages/unread-count', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch unread count');
        }

        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Set up interval to fetch unread count
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUser, isMessagesPage]);

  // Reset unread count when entering messages page
  useEffect(() => {
    if (isMessagesPage) {
      setUnreadCount(0);
    }
  }, [isMessagesPage]);

  // Check if user has listings
  useEffect(() => {
    const checkUserListings = async () => {
      if (!currentUser) {
        setHasListings(false);
        localStorage.removeItem('isLandlord');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/user/listings/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          console.error('Failed to fetch listings:', res.status);
          setHasListings(false);
          localStorage.removeItem('isLandlord');
          return;
        }
        
        const data = await res.json();
        const userHasListings = Array.isArray(data.listings) && data.listings.length > 0;
        setHasListings(userHasListings);
        
        if (userHasListings) {
          localStorage.setItem('isLandlord', 'true');
        } else {
          localStorage.removeItem('isLandlord');
        }
        
      } catch (error) {
        console.error('Error checking listings:', error);
        setHasListings(false);
        localStorage.removeItem('isLandlord');
      }
    };

    checkUserListings();
  }, [currentUser]);

  // Debug log when hasListings changes
  useEffect(() => {
    console.log('hasListings state changed:', hasListings);
  }, [hasListings]);

  // Don't show notifications on Messages page
  const shouldShowNotifications = location.pathname !== '/messages';

  // Close users menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usersMenuRef.current && !usersMenuRef.current.contains(event.target)) {
        setIsUsersMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Check for real estate company login
    const realEstateCompany = localStorage.getItem('realEstateCompany');
    const realEstateToken = localStorage.getItem('realEstateToken');
    const agentInfo = localStorage.getItem('agentInfo');

    // If real estate company data exists in localStorage, restore the state
    if (realEstateCompany && realEstateToken && !currentUser) {
      dispatch(realEstateSignInSuccess(JSON.parse(realEstateCompany)));
    }

    setIsAgent(!!agentInfo);
  }, [currentUser, dispatch]);

  // Get the avatar based on user type
  const getAvatar = () => {
    const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";
    
    // For Real Estate Company
    if (isRealEstateCompany && currentUser?.avatar) {
      return currentUser.avatar;
    }
    
    // For regular user
    if (currentUser?.avatar) {
      return currentUser.avatar;
    }

    // Fallback to default
    return defaultProfilePic;
  };

  // Check if user is logged in
  const isLoggedIn = currentUser || isAgent || isRealEstateCompany;

  const handleSignOut = async () => {
    try {
      const res = await fetch('/api/auth/signout');
      const data = await res.json();
      
      if (data.success === false) {
        console.error('Error signing out:', data.message);
        return;
      }

      // Clear all auth tokens
      localStorage.removeItem('token');
      localStorage.removeItem('agentToken');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('agentInfo');
      localStorage.removeItem('realEstateCompany');
      
      // Reset states
      setIsAgent(false);
      setHasListings(false);
      setIsProfileDropdownOpen(false);

      // Dispatch signout action
      dispatch(signOut());

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close dropdown when clicking outside
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMessagesClick = (e) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }
    navigate('/messages');
  };

  return (
    <header 
      className="bg-white shadow-sm sticky top-0 z-50"
    >
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-4">
          <Link 
            to="/search?type=sale" 
            className="text-black hover:text-[#d54d39] font-medium flex items-center gap-1 text-lg transition-colors duration-300"
          >
            For Sale
          </Link>
          <Link 
            to="/search?type=rent" 
            className="text-black hover:text-[#d54d39] font-medium flex items-center gap-1 text-lg transition-colors duration-300"
          >
            For Rent
          </Link>
          <Link 
            to="/search" 
            className="text-black hover:text-[#d54d39] font-medium text-lg transition-colors duration-300"
          >
            Listings
          </Link>
          <div className="relative">
            <button 
              onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)}
              className="text-black hover:text-[#d54d39] font-medium text-lg transition-colors duration-300"
            >
              Users
            </button>
            {isUsersMenuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
                <Link
                  to="/landlords"
                  className="block px-4 py-2 text-gray-700 hover:bg-slate-100"
                  onClick={() => setIsUsersMenuOpen(false)}
                >
                  Landlords
                </Link>
                <Link
                  to="/tenants"
                  className="block px-4 py-2 text-gray-700 hover:bg-slate-100"
                  onClick={() => setIsUsersMenuOpen(false)}
                >
                  Tenants
                </Link>
                {isRealEstateCompany && (
                  <Link 
                    to="/real-estate-company"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setIsUsersMenuOpen(false)}
                  >
                    Real Estate Company
                  </Link>
                )}
                {isAgent && (
                  <Link 
                    to="/agent-dashboard"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setIsUsersMenuOpen(false)}
                  >
                    Agent Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4">
          {isLoggedIn ? (
            <div className='relative flex items-center gap-2' ref={dropdownRef}>
              <div 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 cursor-pointer text-black hover:text-slate-700"
              >
                <span className="text-black font-medium mr-2">
                  {hasListings ? 'Welcome Back' : 'Hello'} {currentUser.username}
                </span>
                <img 
                  src={getAvatar()} 
                  alt="profile" 
                  className="rounded-none h-[43px] w-[43px] object-cover"
                />
              </div>
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg py-2 z-50">
                  {currentUser && (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-700">
                        <span className="block font-medium text-gray-900">
                          {currentUser.username || currentUser.name}
                        </span>
                        <span className="block text-gray-500 text-xs">
                          {currentUser.email}
                        </span>
                      </div>
                      <hr className="border-gray-200" />
                      
                      {/* Debug info */}
                      <div className="px-4 py-1 text-xs text-gray-500">
                      Status:{hasListings ? 'Has Listings' : 'No Listings'}
                      </div>
                      
                      <Link
                        to={currentUser && hasListings ? '/landlord-profile' : '/profile'}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        {currentUser && hasListings ? 'Landlord Profile' : 'Profile'}
                      </Link>
                      
                      <Link
                        to="/messages"
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 relative ${
                          shouldShowNotifications && unreadCount > 0 ? 'font-bold text-[#FF0072]' : 'text-gray-700'
                        }`}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>Messages</span>
                          {shouldShowNotifications && unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                      
                      <Link
                        to="/create-listing"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        Create Listing
                      </Link>
                      
                      <Link
                        to="/my-listings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        My Listings
                      </Link>
                      
                      <hr className="border-gray-200" />
                      
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link to="/sign-in">
              <button className={`text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] text-black border-black rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#373386] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100`}>
                Sign in
              </button>
            </Link>
          )}
        </div>
        <div className="mx-auto">
          <Link to="/">
            <img src={logo} alt="Just List+It Logo" className="h-10 w-auto" />
          </Link>
        </div>
      </div>
    </header>
  );
}