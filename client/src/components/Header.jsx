import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { signoutSuccess } from '../redux/user/userSlice';

export default function Header() {
  const { currentUser } = useSelector((state) => state.user);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const defaultProfilePic = "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg";

  useEffect(() => {
    const agentInfo = localStorage.getItem('agentInfo');
    setIsAgent(!!agentInfo);
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      // Clear all auth tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('agentToken');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('agentInfo');
      
      // Reset agent state
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

  // Determine if user is logged in (either as regular user or agent)
  const isLoggedIn = currentUser || isAgent;

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
          <Link to="/landlords">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              Landlords
            </li>
          </Link>
          <Link to="/tenants">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              Tenants
            </li>
          </Link>
          <Link to="/about">
            <li className="hidden sm:inline text-slate-700 hover:underline">
              About
            </li>
          </Link>

          {isLoggedIn ? (
            <div className="relative">
              <img
                src={currentUser?.avatar || defaultProfilePic}
                alt="profile"
                className="rounded-full h-7 w-7 object-cover cursor-pointer"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              />
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-xl z-20">
                  {isAgent ? (
                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/agent-dashboard');
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Dashboard
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate('/profile');
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Profile
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