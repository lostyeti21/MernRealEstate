import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user);
  const location = useLocation();
  const [hasListings, setHasListings] = useState(false);
  const [loading, setLoading] = useState(true);

  // First check Redux state
  let user = currentUser;

  // If no user in Redux, check localStorage
  if (!user) {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
  }

  useEffect(() => {
    const checkUserListings = async () => {
      if (user && !user.isAgent) {
        try {
          const res = await fetch(`/api/user/listings/${user._id}`);
          const data = await res.json();
          const userHasListings = data.success !== false && Array.isArray(data.listings) && data.listings.length > 0;
          setHasListings(userHasListings);
          
          // Update localStorage based on current status
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
      } else {
        setHasListings(false);
        localStorage.removeItem('isLandlord');
      }
      setLoading(false);
    };

    checkUserListings();
  }, [user]);

  if (!user) {
    localStorage.setItem('redirectUrl', location.pathname);
    return <Navigate to="/sign-in" />;
  }

  if (loading) {
    return null; // or a loading spinner
  }

  // Check if the route requires agent access
  const requiresAgent = location.pathname.includes('/agent-');
  
  if (requiresAgent && !user.isAgent) {
    return <Navigate to="/" />;
  }

  // Check if user is a landlord (has listings)
  const isLandlord = hasListings;

  // Redirect non-agent users who are landlords from /profile to /landlord-profile
  if (!user.isAgent && location.pathname === '/profile' && isLandlord) {
    return <Navigate to="/landlord-profile" />;
  }

  // Prevent non-landlords from accessing landlord-profile
  if (location.pathname === '/landlord-profile' && !isLandlord) {
    return <Navigate to="/profile" />;
  }

  return <Outlet />;
}