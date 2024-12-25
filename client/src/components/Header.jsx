import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaUsers, FaChevronDown } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { signoutSuccess, realEstateSignInSuccess } from '../redux/user/userSlice';

export default function Header() {
  const { currentUser, isRealEstateCompany } = useSelector((state) => state.user);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";
  const usersMenuRef = useRef(null);

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
    if (isRealEstateCompany && currentUser?.avatar) {
      return currentUser.avatar;
    }
    if (currentUser?.avatar) {
      return currentUser.avatar;
    }
    return defaultProfilePic;
  };

  // Check if user is logged in
  const isLoggedIn = currentUser || isAgent || isRealEstateCompany;

  const handleSignOut = async () => {
    try {
      // Clear all auth tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('agentToken');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('agentInfo');
      
      // Reset states
      setIsAgent(false);
      setIsProfileDropdownOpen(false);

      // Dispatch signout action
      dispatch(signoutSuccess());

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

  return (
    <header className="bg-slate-200 shadow-md">
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3">
        <Link to="/">
          <h1 className="font-bold text-sm sm:text-xl flex flex-wrap">
            <span className="text-slate-500">Dzimba</span>
            <span className="text-slate-700">Estate</span>
          </h1>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-100 p-3 rounded-lg flex items-center"
        >
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent focus:outline-none w-24 sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button>
            <FaSearch className="text-slate-600" />
          </button>
        </form>

        <ul className="flex gap-4 items-center">
          <Link to="/">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              Home
            </li>
          </Link>
          
          <Link to="/search">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              Listings
            </li>
          </Link>

          {/* Users Menu */}
          <div className="relative" ref={usersMenuRef}>
            <button
              onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)}
              className="flex items-center gap-1 text-slate-700 hover:underline px-2 py-1 rounded-md"
            >
              <FaUsers className="text-lg" />
              <span className="hidden sm:inline">Users</span>
              <FaChevronDown className={`transition-transform duration-200 ${
                isUsersMenuOpen ? 'rotate-180' : ''
              }`} />
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

          <Link to="/about">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              About
            </li>
          </Link>

          {isLoggedIn ? (
            <div className="relative">
              <img
                src={getAvatar()}
                alt="profile"
                className="rounded-full h-7 w-7 object-cover cursor-pointer"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              />
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-xl z-20">
                  <button 
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Profile
                  </button>

                  {isRealEstateCompany && (
                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/real-estate-dashboard');
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Dashboard
                    </button>
                  )}

                  {isAgent && (
                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/agent-dashboard');
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Agent Dashboard
                    </button>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/sign-in">
              <li className="text-slate-700 hover:underline">Sign in</li>
            </Link>
          )}
        </ul>
      </div>
    </header>
  );
}