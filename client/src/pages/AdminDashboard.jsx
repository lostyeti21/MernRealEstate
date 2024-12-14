import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/data', {
          headers: { Authorization: token },
        });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching admin data.');
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Render admin-specific data */}
    </div>
  );
};

export default AdminDashboard;
