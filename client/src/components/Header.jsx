import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { clearRealEstateData } from '../redux/realEstate/realEstateSlice';
import { signOutUserSuccess } from '../redux/user/userSlice';

export default function Header() {
  const { currentUser } = useSelector((state) => state.user);
  const { currentCompany } = useSelector((state) => state.realEstate || {});
  const [searchTerm, setSearchTerm] = useState("");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const defaultProfilePic = "https://t4.ftcdn.net/jpg/00/64/67/27/360_F_64672736_U5kpdGs9keUll8CRQ3p3YaEv2M6qkVY5.jpg";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("searchTerm", searchTerm);
      const searchQuery = urlParams.toString();
      navigate(`/search?${searchQuery}`);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get("searchTerm");
    if (searchTermFromUrl) {
      setSearchTerm(searchTermFromUrl);
    }
  }, [window.location.search]);

  const handleSignOut = () => {
    if (currentCompany) {
      dispatch(clearRealEstateData());
      localStorage.removeItem('realEstateToken');
    } else if (agentInfo) {
      localStorage.removeItem('agentToken');
      localStorage.removeItem('agentInfo');
    } else {
      dispatch(signOutUserSuccess());
    }
    setIsProfileDropdownOpen(false);
    navigate('/');
    window.location.reload();
  };

  const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));

  useEffect(() => {
    // Check authentication state
    const checkAuth = () => {
      const agentInfo = localStorage.getItem('agentInfo');
      const realEstateToken = localStorage.getItem('realEstateToken');
      const currentUser = localStorage.getItem('currentUser');

      if (!agentInfo && !realEstateToken && !currentUser) {
        setIsProfileDropdownOpen(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <header className="bg-slate-200 shadow-md relative">
      <div className="flex justify-between items-center max-w-6xl mx-auto p-3 relative">
        {/* Logo Section */}
        <Link to="/">
          <h1 className="font-bold text-sm sm:text-xl flex flex-wrap">
            <span className="text-slate-500">Dzimba</span>
            <span className="text-slate-700"> &nbsp; Estate</span>
          </h1>
        </Link>

        {/* Search Section - Centered */}
        <form
          onSubmit={handleSubmit}
          className="absolute left-1/2 transform -translate-x-1/2 bg-slate-100 p-2 rounded-lg flex items-center w-40 sm:w-64"
        >
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent focus:outline-none w-full text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="pl-2">
            <FaSearch className="text-slate-600" />
          </button>
        </form>

        {/* Navigation Links */}
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

          {(currentUser || currentCompany || agentInfo) ? (
            <div className="relative">
              <img
                src={
                  currentCompany 
                    ? (currentCompany.avatar || defaultProfilePic)
                    : agentInfo
                    ? (agentInfo.avatar || defaultProfilePic)
                    : (currentUser.avatar || defaultProfilePic)
                }
                alt="profile"
                className="rounded-full h-10 w-10 object-cover border border-slate-300 cursor-pointer"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              />
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  {currentCompany ? (
                    <>
                      <Link to="/real-estate-dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link to="/update-company" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Edit Profile
                      </Link>
                    </>
                  ) : agentInfo ? (
                    <Link to="/agent-dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profile
                    </Link>
                  ) : (
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profile
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/sign-in">
              <li className="text-slate-700 hover:underline">Sign In</li>
            </Link>
          )}
        </ul>
      </div>
    </header>
  );
}