import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { signOut, realEstateSignInSuccess } from '../redux/user/userSlice';
import { io } from 'socket.io-client';
import logo from '../assets/logo.png';
import { FaSearch } from 'react-icons/fa';
import { FaUserCircle } from 'react-icons/fa';
import { IoMdNotifications } from 'react-icons/io';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

export default function Header() {
  const { currentUser, isRealEstateCompany, realEstateCompany } = useSelector((state) => state.user);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [persistentUnreadCount, setPersistentUnreadCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasListings, setHasListings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize dark mode from localStorage
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  const socket = useRef();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const usersMenuRef = useRef(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isMessagesPage = location.pathname === '/messages';
  const isNotificationsPage = location.pathname === '/notifications';
  const [showListingsDropdown, setShowListingsDropdown] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [scheduleNotifications, setScheduleNotifications] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState(null);

  // Dropdown management function
  const handleDropdownToggle = (dropdown) => {
    // Close all dropdowns first
    setShowListingsDropdown(false);
    setShowResourcesDropdown(false);
    setIsUsersMenuOpen(false);

    // Open the selected dropdown
    switch(dropdown) {
      case 'listings':
        setShowListingsDropdown(true);
        break;
      case 'resources':
        setShowResourcesDropdown(true);
        break;
      case 'users':
        setIsUsersMenuOpen(true);
        break;
      default:
        break;
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setIsMenuOpen(false), 2000);
    setCloseTimeout(timeout);
  };

  const handleMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  // Determine which user object to use
  const user = isRealEstateCompany ? realEstateCompany : currentUser;

  // Determine avatar
  const avatarUrl = isRealEstateCompany 
    ? (realEstateCompany?.banner || realEstateCompany?.avatar || '/default-company-avatar.png')
    : (currentUser?.avatar || '/default-user-avatar.png');

  // Global notification state management
  useEffect(() => {
    // Comprehensive logging function
    const logNotificationState = (context) => {
      console.log(`NOTIFICATION DEBUG [${context}]:`, {
        user: user?._id,
        storedUnreadCount: localStorage.getItem(`unreadMessages_${user?._id}`),
        storedHasUnread: localStorage.getItem(`hasUnread_${user._id}`),
        currentUnreadCount: persistentUnreadCount,
        hasUnreadMessages: hasUnreadMessages,
        isMessagesPage: isMessagesPage
      });
    };

    // Guard against invalid user state
    if (!user) {
      console.log('No user found, skipping notification initialization');
      return;
    }

    // Fetch and synchronize unread count
    const synchronizeUnreadCount = async () => {
      try {
        // Skip for real estate companies and agents
        if (isRealEstateCompany || isAgent) {
          console.log('Skipping unread count for company/agent');
          return;
        }

        // Retrieve authentication token
        const token = 
          localStorage.getItem('access_token') || 
          localStorage.getItem('token') || 
          (currentUser && currentUser.token);

        if (!token) {
          console.log('No authentication token found');
          return;
        }

        // Fetch unread count from server
        const res = await fetch('/api/messages/unread-count', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Unread count fetch error:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText
          });
          return;
        }

        // Parse server response
        const data = await res.json();
        console.log('Server Response:', data);

        // Get count from correct field in response
        const serverUnreadCount = data.count || 0;
        
        console.log('Server Unread Count:', serverUnreadCount);

        // Synchronize state and storage
        const shouldUpdateState = 
          serverUnreadCount !== persistentUnreadCount || 
          (serverUnreadCount > 0) !== hasUnreadMessages;

        if (shouldUpdateState) {
          console.log('Synchronizing notification state with server:', {
            serverUnreadCount,
            currentCount: persistentUnreadCount,
            currentHasUnread: hasUnreadMessages
          });
          
          // Update component state
          setPersistentUnreadCount(serverUnreadCount);
          setHasUnreadMessages(serverUnreadCount > 0);
          
          // Update localStorage
          localStorage.setItem(`unreadMessages_${user._id}`, serverUnreadCount.toString());
          localStorage.setItem(`hasUnread_${user._id}`, (serverUnreadCount > 0).toString());

          // Log final state
          logNotificationState('ServerSync');
        }
      } catch (error) {
        console.error('Comprehensive error in unread count synchronization:', error);
      }
    };

    // Initial synchronization with debug log
    console.log('Starting initial synchronization');
    synchronizeUnreadCount();

    // Setup periodic synchronization
    const intervalId = setInterval(() => {
      console.log('Running periodic synchronization');
      synchronizeUnreadCount();
    }, 3000);

    // Socket event listeners for real-time updates
    if (!socket.current) {
      socket.current = io('http://localhost:3000', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling']
      });
    }

    // Listen for new messages
    socket.current.on('new_message', (data) => {
      console.log('New message received:', data);
      synchronizeUnreadCount();
    });

    // Listen for message read events
    socket.current.on('messages_read', (data) => {
      console.log('Messages read event:', data);
      synchronizeUnreadCount();
    });

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      if (socket.current) {
        socket.current.off('new_message');
        socket.current.off('messages_read');
      }
    };
  }, [user?._id, currentUser, isRealEstateCompany, isAgent]);

  useEffect(() => {
    const checkUnreadNotifications = async () => {
      if (!currentUser?._id || !currentUser?.token) return;

      try {
        const res = await fetch(`/api/notifications/unread/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch unread notifications');
        }

        const data = await res.json();
        setHasUnreadNotifications(data.hasUnreadNotifications || false);
      } catch (error) {
        console.error('Error checking unread notifications:', error);
      }
    };

    checkUnreadNotifications();
    const intervalId = setInterval(checkUnreadNotifications, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Messages page effect
  useEffect(() => {
    if (isMessagesPage && user) {
      console.log('Entering Messages Page:', {
        userId: user._id,
        previousUnreadCount: persistentUnreadCount,
        previousHasUnread: hasUnreadMessages
      });

      // Only clear if actually on messages page
      if (location.pathname === '/messages') {
        localStorage.removeItem(`unreadMessages_${user._id}`);
        localStorage.setItem(`hasUnread_${user._id}`, 'false');
        
        setPersistentUnreadCount(0);
        setHasUnreadMessages(false);
      }
    }
  }, [isMessagesPage, user?._id, location.pathname]);

  useEffect(() => {
    if (!user) return;

    // Initialize from localStorage with more robust checking
    const storedUnreadCount = localStorage.getItem(`unreadMessages_${user._id}`) || '0';
    const storedHasUnread = localStorage.getItem(`hasUnread_${user._id}`);
    
    // Prioritize hasUnread flag, fallback to unread count
    const initialHasUnread = 
      storedHasUnread === 'true' || 
      (storedUnreadCount && parseInt(storedUnreadCount, 10) > 0);

    // Set initial states immediately
    setPersistentUnreadCount(parseInt(storedUnreadCount, 10));
    setHasUnreadMessages(initialHasUnread);

    // Fetch initial unread count from server to confirm
    const fetchUnreadCount = async () => {
      try {
        if (isRealEstateCompany || isAgent) return;

        const token = 
          localStorage.getItem('access_token') || 
          localStorage.getItem('token') || 
          (currentUser && currentUser.token);

        if (!token) {
          console.log('No authentication token found');
          return;
        }

        const res = await fetch('/api/messages/unread-count', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Unread count fetch error:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText
          });
          return;
        }

        const data = await res.json();
        const unreadCount = data.count || 0;
        
        // Update both states and localStorage
        setPersistentUnreadCount(unreadCount);
        const serverHasUnread = unreadCount > 0;
        
        // Prefer server-side unread status
        setHasUnreadMessages(serverHasUnread);
        localStorage.setItem(`unreadMessages_${user._id}`, unreadCount.toString());
        localStorage.setItem(`hasUnread_${user._id}`, serverHasUnread.toString());
      } catch (error) {
        console.error('Comprehensive error in unread count fetch:', error);
        // Fallback to local storage if server fetch fails
        setHasUnreadMessages(initialHasUnread);
      }
    };

    // Delay server fetch to ensure initial state is set
    const timeoutId = setTimeout(fetchUnreadCount, 100);

    return () => clearTimeout(timeoutId);
  }, [user?._id, currentUser, isRealEstateCompany, isAgent]);

  useEffect(() => {
    if (!user) return;

    // Setup socket connection
    if (!socket.current) {
      socket.current = io('http://localhost:3000', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling']
      });
    }

    // Listen for new messages
    socket.current.on('new_message', (data) => {
      console.log('New message received in header:', data);
      if (!isMessagesPage) {
        const newCount = persistentUnreadCount + 1;
        setPersistentUnreadCount(newCount);
        setHasUnreadMessages(true);
        localStorage.setItem(`unreadMessages_${user._id}`, newCount.toString());
        localStorage.setItem(`hasUnread_${user._id}`, 'true');
      }
    });

    // Listen for message read events
    socket.current.on('messages_read', (data) => {
      if (data.userId === user._id) {
        const newCount = Math.max(0, persistentUnreadCount - data.count);
        setPersistentUnreadCount(newCount);
        const hasUnread = newCount > 0;
        setHasUnreadMessages(hasUnread);
        localStorage.setItem(`unreadMessages_${user._id}`, newCount.toString());
        localStorage.setItem(`hasUnread_${user._id}`, hasUnread.toString());
      }
    });

    return () => {
      if (socket.current) {
        socket.current.off('new_message');
        socket.current.off('messages_read');
      }
    };
  }, [user?._id, isMessagesPage, currentUser]);

  useEffect(() => {
    if (currentUser && !isRealEstateCompany && !isAgent) {
      checkUserListings();
    }
  }, [currentUser]);

  const checkUserListings = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/user/listings/${currentUser._id}`);
      const data = await res.json();

      if (data.success && data.listings && data.listings.length > 0) {
        setHasListings(true);
      } else {
        setHasListings(false);
      }
    } catch (error) {
      console.error('Error checking listings:', error);
      setHasListings(false);
    }
  };

  // Reset unread count when entering messages page
  useEffect(() => {
    if (isMessagesPage && user) {
      // Instead of resetting to 0, mark as read
      localStorage.removeItem(`unreadMessages_${user._id}`);
      localStorage.setItem(`hasUnread_${user._id}`, 'false');
      
      setPersistentUnreadCount(0);
      setHasUnreadMessages(false);
    }
  }, [isMessagesPage, user?._id]);

  // Use persistentUnreadCount for rendering
  const displayUnreadCount = isMessagesPage ? 0 : persistentUnreadCount;

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
    
    // More robust agent status check
    const determineAgentStatus = () => {
      // If there's no current user, definitely not an agent
      if (!currentUser) return false;
      
      // Check if the user has an explicit agent role
      const userIsAgent = currentUser.role === 'agent' || 
                          currentUser.isAgent === true || 
                          (agentInfo && JSON.parse(agentInfo)._id === currentUser._id);
      
      return userIsAgent;
    };

    // If real estate company data exists in localStorage, restore the state
    if (realEstateCompany && realEstateToken && !currentUser) {
      dispatch(realEstateSignInSuccess(JSON.parse(realEstateCompany)));
    }

    setIsAgent(determineAgentStatus());
  }, [currentUser, dispatch]);

  const handleSignOut = () => {
    if (isRealEstateCompany) {
      // Real estate company sign out logic
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('realEstateCompany');
      dispatch(signOut());
      navigate('/real-estate-login');
    } else {
      // Regular user sign out logic
      localStorage.removeItem('token');
      dispatch(signOut());
      navigate('/sign-in');
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
    if (!user) {
      navigate('/sign-in');
      return;
    }
    navigate('/messages');
  };

  // Function to fetch unread notifications count
  const fetchUnreadNotifications = async () => {
    try {
      if (!currentUser?.token) return;

      const res = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch unread notifications');
      }

      const data = await res.json();
      setHasUnreadNotifications(data.count > 0);
      setPersistentUnreadCount(data.count);

      console.log('Unread notifications count:', data.count);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  // Effect to fetch unread notifications count
  useEffect(() => {
    if (!currentUser) return;

    fetchUnreadNotifications();

    // Set up interval to periodically check for new notifications
    const interval = setInterval(fetchUnreadNotifications, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  // Effect to clear notification count when visiting notifications page
  useEffect(() => {
    if (isNotificationsPage && hasUnreadNotifications) {
      setHasUnreadNotifications(false);
      setPersistentUnreadCount(0);
    }
  }, [isNotificationsPage]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    const fetchScheduleNotifications = async () => {
      if (!currentUser?._id || !currentUser?.token) return;

      try {
        const res = await fetch(`/api/notifications/schedule/${currentUser._id}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch schedule notifications');
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
          throw new Error(data.message || 'Failed to fetch schedule notifications');
        }
      } catch (error) {
        console.error('Error fetching schedule notifications:', error);
      }
    };

    fetchScheduleNotifications();
  }, [currentUser]);

  // Add logo styles
  const logoStyles = {
    width: 'auto',
    height: '40px',
    maxWidth: '100%',
    objectFit: 'contain',
    marginRight: 'auto',
    '@media (max-width: 768px)': {
      height: '30px',
    },
    '@media (max-width: 480px)': {
      height: '20px',
    },
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3 relative flex-wrap">
        <button onClick={toggleMenu} className="md:hidden">
          <span className="text-xl">☰</span>
        </button>
        <div 
          className={`absolute left-0 md:static top-full mt-2 md:mt-0 bg-white md:bg-transparent shadow-lg md:shadow-none rounded-md flex flex-col md:flex-row items-center gap-4 ${isMenuOpen ? 'block' : 'hidden'} md:flex`}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <Link to="/" className="text-slate-700 hover:text-[#009688] transition-colors flex items-center gap-1">
            Home
          </Link>
          <div className="relative group">
            <span className="text-slate-700 hover:text-[#009688] transition-colors flex items-center gap-1 group-hover:text-[#009688] cursor-pointer" onMouseEnter={() => handleDropdownToggle('listings')}>
              Listings
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="fill-current transition-transform group-hover:rotate-180">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </span>
            <div className={`absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-50 py-2 px-2 border border-gray-100 transition-all duration-300 ease-in-out transform origin-top ${showListingsDropdown ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'} group-hover:opacity-100 group-hover:scale-y-100 group-hover:pointer-events-auto`} onMouseEnter={() => handleDropdownToggle('listings')} onMouseLeave={() => handleDropdownToggle(null)}>
              <Link to="/search?type=sale" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                For Sale
              </Link>
              <Link to="/search?type=rent" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                For Rent
              </Link>
              <Link to="/search" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                All Listings
              </Link>
            </div>
          </div>
          <div className="relative group">
            <span className="text-slate-700 hover:text-[#009688] transition-colors flex items-center gap-1 group-hover:text-[#009688] cursor-pointer" onMouseEnter={() => handleDropdownToggle('users')}>
              Users
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="fill-current transition-transform group-hover:rotate-180">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </span>
            <div className={`absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-50 py-2 px-2 border border-gray-100 transition-all duration-300 ease-in-out transform origin-top ${isUsersMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'} group-hover:opacity-100 group-hover:scale-y-100 group-hover:pointer-events-auto`} onMouseEnter={() => handleDropdownToggle('users')} onMouseLeave={() => handleDropdownToggle(null)}>
              <Link to="/landlords" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                Landlords
              </Link>
              <Link to="/tenants" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                Tenants
              </Link>
              <Link to="/agents" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                Agents
              </Link>
              {isRealEstateCompany && (
                <Link to="/real-estate-company" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                  Real Estate Company
                </Link>
              )}
            </div>
          </div>
          <div className="relative group">
            <span className="text-slate-700 hover:text-[#009688] transition-colors flex items-center gap-1 group-hover:text-[#009688] cursor-pointer" onMouseEnter={() => handleDropdownToggle('resources')}>
              Resources
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="fill-current transition-transform group-hover:rotate-180">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </span>
            <div className={`absolute top-full left-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-50 py-2 px-2 border border-gray-100 transition-all duration-300 ease-in-out transform origin-top ${showResourcesDropdown ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'} group-hover:opacity-100 group-hover:scale-y-100 group-hover:pointer-events-auto`} onMouseEnter={() => handleDropdownToggle('resources')} onMouseLeave={() => handleDropdownToggle(null)}>
              <Link to="/NeighborhoodGuides" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                Neighborhood Guides
              </Link>
              <Link to="/tutorials" className="block px-4 py-2 text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200">
                Tutorials
              </Link>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-start ml-[16%]">
          <Link to="/">
            <img src={logo} alt="Just List+It Logo" style={logoStyles} />
          </Link>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4">
          {user ? (
            <div className='relative flex items-center gap-2' ref={dropdownRef}>
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="profile"
                  className="rounded-md h-[3.3rem] w-[3.3rem] object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                />
                {(scheduleNotifications?.length > 0 || shouldShowNotifications && hasUnreadMessages) && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg py-2 z-50 overflow-hidden transition-all duration-300 ease-in-out">
                  {user && (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-700">
                        <span className="block font-medium text-gray-900">
                          {user.username || user.name}
                        </span>
                        <span className="block text-gray-500 text-xs">
                          {user.email}
                        </span>
                      </div>
                      <hr className="border-gray-200" />
                      
                      {!isRealEstateCompany && (
                        <div className="px-4 py-1 text-xs text-gray-500">
                          Status: {hasListings ? 'Has Listings' : 'No Listings'}
                        </div>
                      )}
                      
                      <Link
                        to={isRealEstateCompany ? '/real-estate-dashboard' : 
                            isAgent ? '/agent-dashboard' : 
                            hasListings ? '/landlord-profile' : '/profile'}
                        className="block px-4 py-2 text-sm text-slate-700 hover:text-[#009688] hover:bg-slate-100 transition-colors duration-200"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        {isRealEstateCompany ? 'Dashboard' : 
                         isAgent ? 'Agent Dashboard' :
                         hasListings ? 'Landlord Profile' : 'Profile'}
                      </Link>
                      
                      <Link
                        to="/messages"
                        className={`block px-4 py-2 text-sm relative ${
                          location.pathname === '/messages'
                            ? 'bg-slate-100 text-[#009688]'
                            : shouldShowNotifications && hasUnreadMessages
                            ? 'text-[#009688] font-semibold'
                            : 'text-slate-700 hover:text-[#009688] hover:bg-slate-100'
                        } transition-colors duration-200`}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>Messages</span>
                          {shouldShowNotifications && hasUnreadMessages && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                              {persistentUnreadCount > 99 ? '99+' : persistentUnreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                      <Link
                        to="/notifications"
                        className={`block px-4 py-2 text-sm ${
                          location.pathname === '/notifications'
                            ? 'bg-slate-100 text-[#009688]'
                            : hasUnreadNotifications
                            ? 'text-[#009688] font-semibold'
                            : 'text-slate-700 hover:text-[#009688] hover:bg-slate-100'
                        } transition-colors duration-200`}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>Notifications</span>
                          {hasUnreadNotifications && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                              New
                            </span>
                          )}
                        </div>
                      </Link>
                      <Link
                        to={isAgent ? '/agent-schedule' : '/schedule'}
                        className={`block px-4 py-2 text-sm ${
                          location.pathname === '/schedule'
                            ? 'bg-slate-100 text-[#009688]'
                            : 'text-slate-700 hover:text-[#009688] hover:bg-slate-100'
                        } transition-colors duration-200`}
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>Schedule</span>
                          {(() => {
                            console.log('Debug - hasListings:', hasListings);
                            console.log('Debug - scheduleNotifications:', JSON.stringify(scheduleNotifications, null, 2));
                            
                            return scheduleNotifications && (
                              hasListings ? (
                                scheduleNotifications.some(
                                  notification => 
                                    (!notification.status || 
                                     notification.status === 'pending')
                                ) ? (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                    Pending
                                  </span>
                                ) : null
                              ) : (
                                scheduleNotifications.length > 0 ? (
                                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                    Upcoming
                                  </span>
                                ) : null
                              )
                            );
                          })()}
                        </div>
                      </Link>
                      {currentUser && currentUser.role === 'admin' && (
                        <Link
                          to="/admin-center"
                          className="block px-4 py-2 hover:bg-gray-100 text-slate-700 hover:text-[#009688] transition-colors duration-200"
                        >
                          <div className="flex items-center">
                            Admin Center
                          </div>
                        </Link>
                      )}
                      
                      <hr className="border-gray-200" />
                      
                      <button
                        onClick={toggleDarkMode}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-[#009688] hover:bg-gray-100 transition-colors duration-200"
                      >
                        {isDarkMode ? (
                          <div className="flex items-center">
                            <MdLightMode className="mr-2" />
                            Light Mode
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <MdDarkMode className="mr-2" />
                            Dark Mode
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={handleSignOut} 
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/sign-in">
                <button className="text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] text-black border-black rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#009688] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100">
                  Sign In
                </button>
              </Link>
              <Link to="/sign-up">
                <button className="text-sm tracking-[1px] uppercase text-center font-bold py-[0.5em] px-[1.2em] border-[2px] text-black border-black rounded-[2px] relative shadow-[0_2px_10px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-all z-[1] before:transition-all before:duration-500 before:ease-all before:absolute before:top-0 before:left-[50%] before:right-[50%] before:bottom-0 before:opacity-0 before:content-[''] before:bg-[#009688] before:-z-[1] hover:text-white hover:before:left-0 hover:before:right-0 hover:before:opacity-100">
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}