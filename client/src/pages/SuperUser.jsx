import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaUsers, FaHome, FaChartBar, FaStar, FaStarHalfAlt } from 'react-icons/fa';
import RatingChart from '../components/charts/RatingChart';
import SessionChart from '../components/charts/SessionChart';
import ListingChart from '../components/charts/ListingChart';
import MarketChart from '../components/charts/MarketChart';
import UserDistributionChart from '../components/charts/UserDistributionChart';
import { motion, useScroll, useTransform } from 'framer-motion';
import logo from '../assets/logo.png';

export default function SuperUser() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [agents, setAgents] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [listings, setListings] = useState([]);
  const [ratings, setRatings] = useState({ agents: [], tenants: [], landlords: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'listings', or 'analytics'
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('users');
  const [sessionMetrics, setSessionMetrics] = useState({
    avgSessionDuration: 0,
    avgListingTimeSpent: 0,
    totalListingClicks: 0,
    userRatio: 0,
    peakTrafficHours: [],
    isHardcodedData: true,
    registeredUsers: 0,
    unregisteredUsers: 0
  });
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all', 'rent', or 'sale'

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'ishe') {
      setIsAuthenticated(true);
      setError(null);
      fetchUsers();
      fetchListings();
    } else {
      setError('Invalid credentials');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch tenants with ratings
      const tenantsRes = await fetch('/api/user/get-tenants');
      const tenantsData = await tenantsRes.json();
      const tenantsWithRatings = await Promise.all(
        tenantsData.tenants.map(async (tenant) => {
          try {
            const ratingRes = await fetch(`/api/tenant-rating/${tenant._id}`);
            const ratingData = await ratingRes.json();
            return {
              ...tenant,
              ratings: ratingData.ratings || { overall: { averageRating: 0, totalRatings: 0 } }
            };
          } catch (err) {
            console.error(`Error fetching ratings for tenant ${tenant._id}:`, err);
            return {
              ...tenant,
              ratings: { overall: { averageRating: 0, totalRatings: 0 } }
            };
          }
        })
      );
      setTenants(tenantsWithRatings);

      // Fetch agents with ratings
      const agentsRes = await fetch('/api/real-estate/company/agents');
      const agentsData = await agentsRes.json();
      const agentsWithRatings = await Promise.all(
        agentsData.agents.map(async (agent) => {
          try {
            const ratingRes = await fetch(`/api/agent-rating/${agent._id}`);
            const ratingData = await ratingRes.json();
            return {
              ...agent,
              ratings: ratingData.ratings || { overall: { averageRating: 0, totalRatings: 0 } }
            };
          } catch (err) {
            console.error(`Error fetching ratings for agent ${agent._id}:`, err);
            return {
              ...agent,
              ratings: { overall: { averageRating: 0, totalRatings: 0 } }
            };
          }
        })
      );
      setAgents(agentsWithRatings);

      // Fetch landlords with ratings
      const landlordsRes = await fetch('/api/user/get-landlords');
      const landlordsData = await landlordsRes.json();
      const landlordsWithRatings = landlordsData.landlords.map(landlord => ({
        ...landlord,
        ratings: {
          overall: {
            averageRating: landlord.averageRating || 0,
            totalRatings: landlord.totalRatings || 0
          },
          categories: [
            {
              category: 'responseTime',
              averageRating: landlord.categoryRatings?.responseTime || 0,
              totalRatings: landlord.totalRatings || 0
            },
            {
              category: 'maintenance',
              averageRating: landlord.categoryRatings?.maintenance || 0,
              totalRatings: landlord.totalRatings || 0
            },
            {
              category: 'experience',
              averageRating: landlord.categoryRatings?.experience || 0,
              totalRatings: landlord.totalRatings || 0
            }
          ]
        }
      }));
      setLandlords(landlordsWithRatings);

      // Combine all users
      const allUsers = [
        ...tenantsWithRatings,
        ...agentsWithRatings,
        ...landlordsWithRatings
      ];
      
      setUsers(allUsers);

      // Set ratings data
      setRatings({
        agents: agentsWithRatings,
        tenants: tenantsWithRatings,
        landlords: landlordsWithRatings
      });

      // Fetch session analytics
      const sessionRes = await fetch('/api/session-analytics/metrics', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'X-Super-User-Auth': 'ishe'
        }
      });
      if (!sessionRes.ok) {
        console.error('Failed to fetch session analytics:', await sessionRes.text());
        setSessionMetrics({
          isHardcodedData: true,
          totalSessions: 1250,
          avgSessionDuration: 720,
          avgListingTimeSpent: 300,
          totalListingClicks: 4500,
          registeredUsers: 36,
          unregisteredUsers: 20,
          userRatio: 0.64,
          peakTrafficHours: [
            { hour: 14, count: 180 },
            { hour: 19, count: 165 },
            { hour: 20, count: 150 },
            { hour: 13, count: 145 },
            { hour: 21, count: 140 }
          ]
        });
      } else {
        const sessionData = await sessionRes.json();
        setSessionMetrics(sessionData);
      }

    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/listing/super/all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Super-User-Auth': 'ishe'
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch listings');
      }
      
      const data = await response.json();
      setListings(data);
    } catch (error) {
      setError(error.message || 'Failed to fetch listings');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!isAuthenticated) {
      setError('Not authorized');
      return;
    }

    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/user/superuser/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Super-User-Auth': 'ishe'
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      setUsers(users.filter(user => user._id !== userId));
      setDeleteConfirm(null);
    } catch (error) {
      setError(error.message || 'Failed to delete user');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const scrollRevealVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const filteredListings = listings.filter(listing => {
    if (listingTypeFilter === 'all') return true;
    if (listingTypeFilter === 'rent') return listing.type.includes('rent');
    if (listingTypeFilter === 'sale') return !listing.type.includes('rent');
    return true;
  });

  // Helper function to render stars with half stars
  const renderStars = (rating, size = 'text-xl') => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5

    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(roundedRating)) {
        // Full star
        stars.push(
          <FaStar
            key={i}
            className={`${size} text-yellow-500`}
          />
        );
      } else if (i === Math.ceil(roundedRating) && !Number.isInteger(roundedRating)) {
        // Half star
        stars.push(
          <FaStarHalfAlt
            key={i}
            className={`${size} text-yellow-500`}
          />
        );
      } else {
        // Empty star
        stars.push(
          <FaStar
            key={i}
            className={`${size} text-gray-300`}
          />
        );
      }
    }
    return stars;
  };

  // Scroll animation setup
  const { scrollY } = useScroll();
  const blurValue = useTransform(scrollY, [0, 100], [0, 3]);
  const opacityValue = useTransform(scrollY, [0, 100], [1, 0.97]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl text-center font-semibold mb-8">SuperUser Login</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              className="border p-3 rounded-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="border p-3 rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80"
            >
              Login
            </button>
            {error && <p className="text-red-500 text-center">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gray-50"
      style={{
        scrollBehavior: 'smooth',
        perspective: '1000px',
        WebkitPerspective: '1000px'
      }}
    >
      <motion.div 
        className="max-w-7xl mx-auto px-4 py-6"
        style={{
          backdropFilter: `blur(${blurValue}px)`,
          WebkitBackdropFilter: `blur(${blurValue}px)`,
          opacity: opacityValue,
          transition: 'all 0.3s ease-out'
        }}
      >
        <div className="flex justify-center mb-6">
          <img 
            src={logo}
            alt="JustListIt Logo" 
            className="h-12"
          />
        </div>
        <motion.div variants={itemVariants} className="relative h-[100px] mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-[120px] font-bold text-gray-100 uppercase absolute -top-14 left-0 w-full text-left"
          >
            <span style={{ color: '#d2d1e6', opacity: 0.6 }}>ADMIN</span>
          </motion.h1>
          <motion.h2 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="text-3xl font-semibold text-gray-800 absolute bottom-0 left-0 z-10"
          >
            Dashboard
          </motion.h2>
          <p className="text-gray-600 mt-1 absolute bottom-0 left-0 transform translate-y-8">
            Analytics and Management
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end mb-8">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 mx-2 rounded flex items-center ${
              activeTab === 'users'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FaUsers className="mr-2" /> Users
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 mx-2 rounded flex items-center ${
              activeTab === 'listings'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FaHome className="mr-2" /> Listings
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 mx-2 rounded flex items-center ${
              activeTab === 'analytics'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FaChartBar className="mr-2" /> Analytics
          </button>
        </motion.div>

        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div variants={itemVariants}>
            {/* User Statistics */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-slate-700">{users.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Tenants</h3>
                <p className="text-3xl font-bold text-slate-700">{tenants.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Agents</h3>
                <p className="text-3xl font-bold text-slate-700">{agents.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Landlords</h3>
                <p className="text-3xl font-bold text-slate-700">{landlords.length}</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className={`px-4 py-2 rounded-md text-white ${
                            deleteConfirm === user._id
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          disabled={loading}
                        >
                          {deleteConfirm === user._id ? 'Confirm Delete?' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Listings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Listings</h3>
                <p className="text-3xl font-bold text-slate-700">{listings.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">For Rent</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {listings.filter(l => l.type.includes('rent')).length}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round((listings.filter(l => l.type.includes('rent')).length / listings.length) * 100)}% of total listings
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">For Sale</h3>
                <p className="text-3xl font-bold text-green-600">
                  {listings.filter(l => !l.type.includes('rent')).length}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round((listings.filter(l => !l.type.includes('rent')).length / listings.length) * 100)}% of total listings
                </p>
              </div>
            </div>

            {/* Filter Status */}
            {listingTypeFilter !== 'all' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center bg-white p-4 rounded-lg shadow"
              >
                <p className="text-gray-700">
                  Showing {listingTypeFilter === 'rent' ? 'rental' : 'sale'} properties ({filteredListings.length} listings)
                </p>
                <button
                  onClick={() => setListingTypeFilter('all')}
                  className="text-sm text-slate-700 hover:text-slate-900"
                >
                  Clear Filter
                </button>
              </motion.div>
            )}

            {/* Listings Grid */}
            <motion.div 
              variants={itemVariants} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredListings.map((listing) => (
                <div key={listing._id} className="bg-white p-4 rounded-lg shadow">
                  <img
                    src={listing.imageUrls[0]}
                    alt={listing.name}
                    className="h-48 w-full object-cover mb-4 rounded"
                  />
                  <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">{listing.name}</h3>
                    <span className="text-green-600 font-semibold">
                      ${listing.regularPrice.toLocaleString()}
                      {listing.type === 'rent' && '/month'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 truncate">{listing.address}</p>
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>{listing.bedrooms} beds</span>
                    <span>{listing.bathrooms} baths</span>
                    <span>{listing.type === 'rent' ? 'For Rent' : 'For Sale'}</span>
                  </div>
                  <Link
                    to={`/listing/${listing._id}`}
                    className="block text-center bg-slate-700 text-white p-2 rounded-lg hover:opacity-95"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div variants={itemVariants} className="space-y-8">
            {/* Analytics Navigation */}
            <motion.div variants={itemVariants} className="flex justify-center space-x-4 mb-8">
              <button
                onClick={() => setActiveAnalyticsTab('users')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeAnalyticsTab === 'users'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-gray-700 hover:bg-slate-300'
                }`}
              >
                <FaUsers className="mr-2" /> User Analytics
              </button>
              <button
                onClick={() => setActiveAnalyticsTab('sessions')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeAnalyticsTab === 'sessions'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-gray-700 hover:bg-slate-300'
                }`}
              >
                <FaChartBar className="mr-2" /> Session Analytics
              </button>
              <button
                onClick={() => setActiveAnalyticsTab('market')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeAnalyticsTab === 'market'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-gray-700 hover:bg-slate-300'
                }`}
              >
                <FaHome className="mr-2" /> Market Insights
              </button>
              <button
                onClick={() => setActiveAnalyticsTab('ratings')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeAnalyticsTab === 'ratings'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-gray-700 hover:bg-slate-300'
                }`}
              >
                <FaStar className="mr-2" /> Rating Analytics
              </button>
            </motion.div>

            {/* User Analytics Section */}
            {activeAnalyticsTab === 'users' && (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={scrollRevealVariants}
                className="p-3 bg-slate-100 rounded-lg"
              >
                <h2 className="text-xl font-semibold mb-4">User Analytics</h2>
                <UserDistributionChart 
                  users={users}
                  tenants={tenants}
                  agents={agents}
                  landlords={landlords}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-slate-700">{users.length}</p>
                    <p className="text-sm text-gray-500 mt-2">Active accounts on the platform</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">User Distribution</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Tenants</span>
                        <span className="font-semibold">{users.length ? Math.round((tenants.length / users.length) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Agents</span>
                        <span className="font-semibold">{users.length ? Math.round((agents.length / users.length) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Landlords</span>
                        <span className="font-semibold">{users.length ? Math.round((landlords.length / users.length) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">User Growth</h3>
                    {(() => {
                      const now = new Date();
                      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      startOfMonth.setHours(0, 0, 0, 0);
                      
                      const isNewUser = (user) => {
                        if (!user.createdAt) return false;
                        const createdAt = new Date(user.createdAt);
                        // Debug log for each user
                        console.log(`User ${user._id}:`, {
                          createdAt,
                          startOfMonth,
                          isNew: createdAt >= startOfMonth,
                          role: user.role
                        });
                        return createdAt >= startOfMonth;
                      };

                      // Calculate new users from each category
                      const newTenants = tenants.filter(isNewUser);
                      const newAgents = agents.filter(isNewUser);
                      const newLandlords = landlords.filter(isNewUser);

                      const totalNewUsers = newTenants.length + newAgents.length + newLandlords.length;

                      // Debug information
                      console.log('Start of Month:', startOfMonth.toISOString());
                      console.log('New Tenants:', newTenants.length, newTenants.map(t => ({ 
                        id: t._id, 
                        created: new Date(t.createdAt).toISOString(),
                        role: t.role 
                      })));
                      console.log('New Agents:', newAgents.length, newAgents.map(a => ({ 
                        id: a._id, 
                        created: new Date(a.createdAt).toISOString(),
                        role: a.role
                      })));
                      console.log('New Landlords:', newLandlords.length, newLandlords.map(l => ({ 
                        id: l._id, 
                        created: new Date(l.createdAt).toISOString(),
                        role: l.role
                      })));

                      return (
                        <>
                          <p className="text-3xl font-bold text-green-600">
                            +{totalNewUsers}
                          </p>
                          <div className="text-sm text-gray-500 mt-2">
                            <p>New users this month</p>
                            <div className="mt-1 space-y-1">
                              <p>Tenants: +{newTenants.length}</p>
                              <p>Agents: +{newAgents.length}</p>
                              <p>Landlords: +{newLandlords.length}</p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session Analytics */}
            {activeAnalyticsTab === 'sessions' && (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={scrollRevealVariants}
                className="p-3 bg-slate-100 rounded-lg"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Session Analytics</h2>
                  {sessionMetrics?.isHardcodedData && (
                    <span className="text-sm text-gray-500">Using sample data temporarily until enough data has been collected......</span>
                  )}
                </div>
                <SessionChart sessionMetrics={sessionMetrics} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Average Session Duration</h3>
                    <p className="text-2xl font-bold">
                      {Math.max(0, Math.round((sessionMetrics.avgSessionDuration || 0) / 60))} mins
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Average Time on Listings</h3>
                    <p className="text-2xl font-bold">
                      {Math.max(0, Math.round((sessionMetrics.avgListingTimeSpent || 0) / 60))} mins
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Total Listing Clicks</h3>
                    <p className="text-2xl font-bold">{Math.max(0, sessionMetrics.totalListingClicks || 0)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Market Insights */}
            {activeAnalyticsTab === 'market' && (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={scrollRevealVariants}
                className="p-3 bg-slate-100 rounded-lg"
              >
                <h2 className="text-xl font-semibold mb-4">Market Insights</h2>
                <MarketChart listings={listings} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Market Overview</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Listings</span>
                        <span className="font-semibold">{listings.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Price</span>
                        <span className="font-semibold">
                          ${listings.length
                            ? Math.round(
                                listings.reduce((acc, l) => acc + l.regularPrice, 0) /
                                  listings.length
                              ).toLocaleString()
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Most Popular Type</span>
                        <span className="font-semibold">
                          {(() => {
                            const typeCount = listings.reduce((acc, l) => {
                              acc[l.type] = (acc[l.type] || 0) + 1;
                              return acc;
                            }, {});
                            const mostPopular = Object.entries(typeCount).sort(
                              (a, b) => b[1] - a[1]
                            )[0];
                            return mostPopular ? mostPopular[0] : 'N/A';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rating Analytics */}
            {activeAnalyticsTab === 'ratings' && (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={scrollRevealVariants}
                className="p-3 bg-slate-100 rounded-lg"
              >
                <h2 className="text-xl font-semibold mb-6">Rating Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Agent Ratings */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Agent Ratings</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-2">Average Rating</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {renderStars(
                              ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length > 0
                                ? ratings.agents.reduce((acc, a) => acc + (a.ratings?.overall?.averageRating || 0), 0) /
                                  ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length
                                : 0
                            )}
                          </div>
                          <span className="text-xl font-semibold text-slate-700">
                            {ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length > 0
                              ? (ratings.agents.reduce((acc, a) => acc + (a.ratings?.overall?.averageRating || 0), 0) /
                                 ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length).toFixed(1)
                              : '0.0'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Rated Agents</p>
                        <p className="text-2xl font-bold text-slate-700">
                          {ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Tenant Ratings */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Tenant Ratings</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-2">Average Rating</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {renderStars(
                              ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length > 0
                                ? ratings.tenants.reduce((acc, t) => acc + (t.ratings?.overall?.averageRating || 0), 0) /
                                  ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length
                                : 0
                            )}
                          </div>
                          <span className="text-xl font-semibold text-slate-700">
                            {ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length > 0
                              ? (ratings.tenants.reduce((acc, t) => acc + (t.ratings?.overall?.averageRating || 0), 0) /
                                 ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length).toFixed(1)
                              : '0.0'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Rated Tenants</p>
                        <p className="text-2xl font-bold text-slate-700">
                          {ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Landlord Ratings */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Landlord Ratings</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-2">Average Rating</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {renderStars(
                              ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length > 0
                                ? ratings.landlords.reduce((acc, l) => acc + (l.ratings?.overall?.averageRating || 0), 0) /
                                  ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length
                                : 0
                            )}
                          </div>
                          <span className="text-xl font-semibold text-slate-700">
                            {ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length > 0
                              ? (ratings.landlords.reduce((acc, l) => acc + (l.ratings?.overall?.averageRating || 0), 0) /
                                 ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length).toFixed(1)
                              : '0.0'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Rated Landlords</p>
                        <p className="text-2xl font-bold text-slate-700">
                          {ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Overall Platform Rating */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Platform Rating</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-2">Overall Rating</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {renderStars(
                              (
                                (ratings.agents.reduce((acc, a) => acc + (a.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length)) +
                                (ratings.tenants.reduce((acc, t) => acc + (t.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length)) +
                                (ratings.landlords.reduce((acc, l) => acc + (l.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length))
                              ) / 3
                            )}
                          </div>
                          <span className="text-xl font-semibold text-slate-700">
                            {(
                              (
                                (ratings.agents.reduce((acc, a) => acc + (a.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.agents.filter(a => a.ratings?.overall?.totalRatings > 0).length)) +
                                (ratings.tenants.reduce((acc, t) => acc + (t.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.tenants.filter(t => t.ratings?.overall?.totalRatings > 0).length)) +
                                (ratings.landlords.reduce((acc, l) => acc + (l.ratings?.overall?.averageRating || 0), 0) /
                                  Math.max(1, ratings.landlords.filter(l => l.ratings?.overall?.totalRatings > 0).length))
                              ) / 3
                            ).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Ratings</p>
                        <p className="text-2xl font-bold text-slate-700">
                          {ratings.agents.reduce((acc, a) => acc + (a.ratings?.overall?.totalRatings || 0), 0) +
                           ratings.tenants.reduce((acc, t) => acc + (t.ratings?.overall?.totalRatings || 0), 0) +
                           ratings.landlords.reduce((acc, l) => acc + (l.ratings?.overall?.totalRatings || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
