import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminPrivateRoute = () => {
  const isAdmin = !!localStorage.getItem("adminToken"); // Check if admin token exists

  return isAdmin ? <Outlet /> : <Navigate to="/sign-in" />;
};

export default AdminPrivateRoute;
