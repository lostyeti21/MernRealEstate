import React from 'react'
import { useSelector } from 'react-redux';
import { Outlet, Navigate } from 'react-router-dom';

export default function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user);
  const { currentCompany } = useSelector((state) => state.realEstate);
  const agentInfo = JSON.parse(localStorage.getItem('agentInfo'));

  // Check if user is authenticated through any method
  const isAuthenticated = currentUser || currentCompany || agentInfo;

  return isAuthenticated ? <Outlet /> : <Navigate to='/sign-in' />;
}