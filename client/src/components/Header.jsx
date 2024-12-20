import { FaSearch } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

const Header = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

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
          {currentUser ? (
            <Link to="/profile">
              <img
                src={currentUser.avatar || "https://via.placeholder.com/150"}
                alt="avatar"
                className="rounded-full h-10 w-10 object-cover border border-slate-300"
              />
            </Link>
          ) : (
            <Link to="/sign-in">
              <li className="text-slate-700 hover:underline">Sign In</li>
            </Link>
          )}
        </ul>
      </div>
    </header>
  );
};

export default Header;