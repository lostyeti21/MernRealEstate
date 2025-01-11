import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaUsers, FaChevronDown, FaHome, FaList, FaBell } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { signOut, realEstateSignInSuccess } from '../redux/user/userSlice';
import { io } from 'socket.io-client';

export default function Header() {
  const { currentUser, isRealEstateCompany } = useSelector((state) => state.user);
  const [searchTerm, setSearchTerm] = useState("");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('searchTerm', searchTerm);
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
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
    <header className={`${
      isHomePage 
        ? 'bg-transparent absolute top-0 left-0 right-0 z-50' 
        : 'bg-white shadow-md'
    }`}>
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3">
        <div className="flex items-center gap-4">
          <Link to="/">
            <h1 className={`font-bold text-sm sm:text-xl flex flex-wrap ${
              isHomePage ? 'text-white' : ''
            }`}>
              <span className={isHomePage ? 'text-white' : 'text-slate-500'}>
                Dzimba
              </span>
              <span className={isHomePage ? 'text-white' : 'text-slate-700'}>
                Estate
              </span>
            </h1>
          </Link>

          <form
            onSubmit={handleSubmit}
            className="relative"
          >
            <div className="w-[40px] h-[40px] hover:w-[200px] bg-[#F20505] shadow-[2px_2px_20px_rgba(0,0,0,0.08)] rounded-full flex group items-center transition-all duration-300 overflow-hidden">
              <button className="flex items-center justify-center min-w-[40px]">
                <FaSearch className="w-4 h-4 text-white" />
              </button>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="outline-none text-[16px] bg-transparent w-full text-white font-normal px-2 placeholder-white/70"
              />
            </div>
          </form>
        </div>

        <ul className="flex gap-4 items-center">
          <Link to="/">
            <button className={`text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] ${
              isHomePage 
                ? 'text-white border-white' 
                : 'text-[#C62300] border-[#C62300]'
            } rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#F20505] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100`}>
            <div className="flex items-center gap-1">
              <FaHome className={`text-sm ${isHomePage ? 'text-white' : ''}`} />
              <span>Home</span>
            </div>
          </button>
          </Link>
          
          <Link to="/search">
            <button className={`text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] ${
              isHomePage 
                ? 'text-white border-white' 
                : 'text-[#C62300] border-[#C62300]'
            } rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#F20505] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100`}>
            <div className="flex items-center gap-1">
              <FaList className={`text-sm ${isHomePage ? 'text-white' : ''}`} />
              <span>Listings</span>
            </div>
          </button>
          </Link>

          <div className="relative" ref={usersMenuRef}>
            <button 
              onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)}
              className={`text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] ${
                isHomePage 
                  ? 'text-white border-white' 
                  : 'text-[#C62300] border-[#C62300]'
              } rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#F20505] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100`}
            >
              <div className="flex items-center gap-1">
                <FaUsers className={`text-sm ${isHomePage ? 'text-white' : ''}`} />
                <span className="hidden sm:inline">Users</span>
              </div>
            </button>

            {isUsersMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50">
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
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <div className='relative' ref={dropdownRef}>
              <img
                src={getAvatar()}
                alt="profile"
                className="h-10 w-10 object-cover cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";
                }}
              />
              {shouldShowNotifications && unreadCount > 0 && (
                <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-lg z-20">
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
              <button className={`text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] ${
                isHomePage 
                  ? 'text-white border-white' 
                  : 'text-[#C62300] border-[#C62300]'
              } rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#F20505] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100`}>
                Sign in
              </button>
            </Link>
          )}
        </ul>
      </div>
    </header>
  );
}