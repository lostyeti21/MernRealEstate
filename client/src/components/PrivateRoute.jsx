import React from 'react'
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user);
  const location = useLocation();

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

  // Check if the route requires agent access
  const requiresAgent = location.pathname.includes('/agent-');
  
  if (!user) {
    // Save the attempted URL
    localStorage.setItem('redirectUrl', location.pathname);
    return <Navigate to="/sign-in" />;
  }

  if (requiresAgent && !user.isAgent) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}