import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactApexChart from 'react-apexcharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Analytics() {
  const { currentUser } = useSelector((state) => state.user);
  const [selectedTab, setSelectedTab] = useState(0);
  const [analytics, setAnalytics] = useState({
    clicks: 0,
    views: 14,
    listingsCount: 1,
    averageViewsPerListing: 14
  });
  const [timeAnalytics, setTimeAnalytics] = useState({
    overall: Array(24).fill(0),
    listing: Array(24).fill(0)
  });
  const [searchAnalytics, setSearchAnalytics] = useState({
    overall: [],
    listing: []
  });
  const [priceAnalytics, setPriceAnalytics] = useState({
    overall: [],
    listing: null
  });
  const [ctrAnalytics, setCTRAnalytics] = useState({
    overall: [],
    listing: null
  });
  const [selectedListing, setSelectedListing] = useState(null);
  const [listings, setListings] = useState([]);
  const [listingAnalytics, setListingAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedListingsForComparison, setSelectedListingsForComparison] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);

  // Fetch user's listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!currentUser?._id) {
        console.log('No current user ID');
        return;
      }

      try {
        console.log('Current user:', currentUser);
        console.log('Fetching listings for user:', currentUser._id);
        
        // First try the user listings endpoint
        const res = await fetch(`http://localhost:3000/api/listing/user/${currentUser._id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        console.log('Raw API response:', data);
        
        if (data.success === false) {
          console.error('Error in API response:', data.message);
          return;
        }

        let userListings = [];
        if (data.success && Array.isArray(data.listings)) {
          userListings = data.listings;
        } else if (Array.isArray(data)) {
          userListings = data;
        }

        console.log('Processed listings:', userListings);
        
        if (userListings.length === 0) {
          console.log('No listings found for user');
        } else {
          console.log(`Found ${userListings.length} listings for user`);
        }

        setListings(userListings);
        
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
      }
    };

    fetchListings();
  }, [currentUser]);

  // Fetch overall analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/${currentUser._id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    if (currentUser) {
      fetchAnalytics();
    }
  }, [currentUser]);

  // Fetch listing-specific analytics
  useEffect(() => {
    const fetchListingAnalytics = async () => {
      if (!selectedListing) return;
      
      setLoading(true);
      try {
        console.log('Fetching analytics for listing:', selectedListing);
        const res = await fetch(`http://localhost:3000/api/analytics/listing/${selectedListing}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        console.log('Raw listing analytics response:', data);
        
        if (data.success) {
          console.log('Setting listing analytics:', data);
          setListingAnalytics({
            views: parseInt(data.views) || 0,
            clicks: parseInt(data.clicks) || 0,
            inquiries: parseInt(data.inquiries) || 0,
            dailyStats: data.dailyStats || [],
            searchAppearances: data.searchAppearances || 0,
            searchClicks: data.searchClicks || 0,
            price: data.price || 0,
            recommendations: data.recommendations || []
          });
        } else {
          console.error('Error in listing analytics response:', data.message);
          setListingAnalytics(null);
        }
      } catch (error) {
        console.error('Error fetching listing analytics:', error);
        setListingAnalytics(null);
      }
      setLoading(false);
    };

    fetchListingAnalytics();
  }, [selectedListing]);

  // Fetch comparison data
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (selectedListingsForComparison.length === 0) {
        setComparisonData([]);
        return;
      }

      try {
        const data = await Promise.all(
          selectedListingsForComparison.map(async (listingId) => {
            const res = await fetch(`http://localhost:3000/api/analytics/listing/${listingId}`, {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            });
            
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            const listing = listings.find(l => l._id === listingId);
            return {
              id: listingId,
              name: listing?.name || listing?.title || `Listing ${listingId}`,
              views: parseInt(data.views) || 0,
              clicks: parseInt(data.clicks) || 0,
              inquiries: parseInt(data.inquiries) || 0
            };
          })
        );
        setComparisonData(data);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      }
    };

    fetchComparisonData();
  }, [selectedListingsForComparison, listings]);

  // Fetch time-based analytics for overall views
  useEffect(() => {
    const fetchTimeAnalytics = async () => {
      if (!currentUser?._id) return;
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/time/user/${currentUser._id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setTimeAnalytics(prev => ({
            ...prev,
            overall: data.hourlyViews || Array(24).fill(0)
          }));
        }
      } catch (error) {
        console.error('Error fetching time analytics:', error);
      }
    };

    fetchTimeAnalytics();
  }, [currentUser]);

  // Fetch time-based analytics for specific listing
  useEffect(() => {
    const fetchListingTimeAnalytics = async () => {
      if (!selectedListing) {
        setTimeAnalytics(prev => ({
          ...prev,
          listing: Array(24).fill(0)
        }));
        return;
      }
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/time/listing/${selectedListing}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setTimeAnalytics(prev => ({
            ...prev,
            listing: data.hourlyViews || Array(24).fill(0)
          }));
        }
      } catch (error) {
        console.error('Error fetching listing time analytics:', error);
      }
    };

    fetchListingTimeAnalytics();
  }, [selectedListing]);

  // Fetch search analytics for user
  useEffect(() => {
    const fetchSearchAnalytics = async () => {
      if (!currentUser?._id) return;
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/search/user/${currentUser._id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setSearchAnalytics(prev => ({
            ...prev,
            overall: data.searchTerms
          }));
        }
      } catch (error) {
        console.error('Error fetching search analytics:', error);
      }
    };

    fetchSearchAnalytics();
  }, [currentUser]);

  // Fetch search analytics for specific listing
  useEffect(() => {
    const fetchListingSearchAnalytics = async () => {
      if (!selectedListing) {
        setSearchAnalytics(prev => ({
          ...prev,
          listing: []
        }));
        return;
      }
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/search/listing/${selectedListing}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setSearchAnalytics(prev => ({
            ...prev,
            listing: data.searchTerms
          }));
        }
      } catch (error) {
        console.error('Error fetching listing search analytics:', error);
      }
    };

    fetchListingSearchAnalytics();
  }, [selectedListing]);

  // Fetch price analytics for user
  useEffect(() => {
    const fetchPriceAnalytics = async () => {
      if (!currentUser?._id) return;
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/price/user/${currentUser._id}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setPriceAnalytics(prev => ({
            ...prev,
            overall: data.listings
          }));
        }
      } catch (error) {
        console.error('Error fetching price analytics:', error);
      }
    };

    fetchPriceAnalytics();
  }, [currentUser]);

  // Fetch price analytics for specific listing
  useEffect(() => {
    const fetchListingPriceAnalytics = async () => {
      if (!selectedListing) {
        setPriceAnalytics(prev => ({
          ...prev,
          listing: null
        }));
        return;
      }
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/price/listing/${selectedListing}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setPriceAnalytics(prev => ({
            ...prev,
            listing: data
          }));
        }
      } catch (error) {
        console.error('Error fetching listing price analytics:', error);
      }
    };

    fetchListingPriceAnalytics();
  }, [selectedListing]);

  // Fetch CTR analytics for user
  useEffect(() => {
    const fetchCTRAnalytics = async () => {
      if (!currentUser?._id) {
        console.warn('No current user ID for CTR analytics');
        return;
      }
      
      try {
        console.log('Fetching CTR analytics for user:', currentUser._id);
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const res = await fetch(`/api/analytics/ctr/user/${currentUser._id}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('CTR Analytics Response Status:', res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('CTR Analytics Error Response:', errorText);
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }
        
        const data = await res.json();
        console.log('CTR Analytics Raw Response:', data);
        
        if (data.success) {
          console.log('CTR Listings:', data.listings);
          setCTRAnalytics(prev => ({
            ...prev,
            overall: Array.isArray(data.listings) ? data.listings : []
          }));
        } else {
          console.warn('CTR Analytics fetch was not successful:', data.message);
          setCTRAnalytics(prev => ({
            ...prev,
            overall: []
          }));
        }
      } catch (error) {
        console.error('Comprehensive error fetching CTR analytics:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        setCTRAnalytics(prev => ({
          ...prev,
          overall: []
        }));
      }
    };

    fetchCTRAnalytics();
  }, [currentUser]);

  // Fetch CTR analytics for specific listing
  useEffect(() => {
    const fetchListingCTRAnalytics = async () => {
      if (!selectedListing) {
        setCTRAnalytics(prev => ({
          ...prev,
          listing: null
        }));
        return;
      }
      
      try {
        const res = await fetch(`http://localhost:3000/api/analytics/ctr/listing/${selectedListing}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
          setCTRAnalytics(prev => ({
            ...prev,
            listing: data.stats
          }));
        }
      } catch (error) {
        console.error('Error fetching listing CTR analytics:', error);
      }
    };

    fetchListingCTRAnalytics();
  }, [selectedListing]);

  // Chart configuration for overall analytics
  const chartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: ['Listings', 'Views', 'Clicks'],
    },
    yaxis: {
      title: {
        text: 'Count'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val
        }
      }
    },
    colors: ['#4C51BF', '#48BB78', '#F6AD55']
  };

  const chartSeries = [{
    name: 'Analytics',
    data: [analytics.listingsCount, analytics.views, analytics.clicks]
  }];

  // Chart configuration for listing-specific analytics
  const listingChartOptions = {
    ...chartOptions,
    xaxis: {
      categories: ['Views', 'Clicks', 'Inquiries'],
    }
  };

  const listingChartSeries = [{
    name: 'Listing Analytics',
    data: listingAnalytics ? [
      parseInt(listingAnalytics.views) || 0,
      parseInt(listingAnalytics.clicks) || 0,
      parseInt(listingAnalytics.inquiries) || 0
    ] : [0, 0, 0]
  }];

  // Chart configuration for comparison
  const comparisonChartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: false,
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: ['Views', 'Clicks', 'Inquiries'],
    },
    yaxis: {
      title: {
        text: 'Count'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val
        }
      }
    },
    legend: {
      position: 'right',
      offsetY: 40
    }
  };

  const comparisonChartSeries = comparisonData.map(listing => ({
    name: listing.name,
    data: [listing.views, listing.clicks, listing.inquiries]
  }));

  // Time analytics chart configuration
  const timeChartOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: false
      },
      zoom: {
        enabled: true
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => 
        i.toString().padStart(2, '0') + ':00'
      ),
      title: {
        text: 'Hour of Day (24h)'
      }
    },
    yaxis: {
      title: {
        text: 'Number of Views'
      },
      min: 0
    },
    markers: {
      size: 4,
      hover: {
        size: 6
      }
    },
    tooltip: {
      y: {
        formatter: function(val) {
          return val + ' views'
        }
      }
    },
    grid: {
      show: true,
      borderColor: '#e0e0e0',
      strokeDashArray: 5,
      position: 'back'
    }
  };

  // Debug output
  console.log('Current listings:', listings);
  console.log('Selected listing:', selectedListing);
  console.log('Listing analytics state:', listingAnalytics);
  console.log('Chart series data:', listingChartSeries[0].data);

  // Utility functions for time analysis
  const findPeakHours = (hourlyData) => {
    if (!hourlyData || hourlyData.length === 0) return 'No data available';
    
    const maxViews = Math.max(...hourlyData);
    const peakHours = hourlyData
      .map((views, hour) => ({ hour, views }))
      .filter(({ views }) => views === maxViews)
      .map(({ hour }) => {
        const formattedHour = hour.toString().padStart(2, '0');
        return `${formattedHour}:00`;
      })
      .join(', ');
    
    return peakHours || 'No peak hours found';
  };

  const suggestPostingTime = (hourlyData) => {
    if (!hourlyData || hourlyData.length === 0) return 'No data available';
    
    // Find the hour with highest views
    const maxViewsHour = hourlyData.indexOf(Math.max(...hourlyData));
    
    // Suggest posting 1-2 hours before peak time
    const suggestedHour = (maxViewsHour - 1 + 24) % 24;
    return `${suggestedHour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className='max-w-6xl mx-auto p-3'>
      <h1 className='text-3xl font-semibold text-center my-7'>Analytics Dashboard</h1>
      
      <div className='mb-4'>
        <label className='block mb-2'>Select Listing:</label>
        <select
          className='border p-3 rounded-lg w-full'
          onChange={(e) => setSelectedListing(e.target.value || null)}
          value={selectedListing || ''}
        >
          <option value=''>All Listings</option>
          {listings.map((listing) => (
            <option key={listing._id} value={listing._id}>
              {listing.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedListing ? (
        // Keep existing tabbed view for all listings
        <div>
          {/* Tab Navigation - Only show for all listings view */}
          <div className="flex space-x-1 border-b mb-4">
            {['Overall Analytics', 'Time Analytics', 'Search Analytics', 'Price Analytics', 'CTR Analytics'].map((tab, index) => (
              <button
                key={index}
                onClick={() => setSelectedTab(index)}
                className={`py-2 px-4 ${
                  selectedTab === index
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Panels - Only show for all listings view */}
          <div className="mt-4">
            {/* Overall Analytics Panel */}
            {selectedTab === 0 && (
              <div className='p-3 bg-white rounded-lg'>
                <h2 className='text-2xl font-semibold mb-4'>Overall Metrics</h2>
                {!selectedListing && (
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
                    <div className='bg-white p-4 rounded-lg shadow'>
                      <p><span className='font-semibold'>Clicks:</span> {analytics.clicks}</p>
                      <p><span className='font-semibold'>Views:</span> {analytics.views}</p>
                      <p><span className='font-semibold'>Listings:</span> {analytics.listingsCount}</p>
                      <p><span className='font-semibold'>Avg Views/Listing:</span> {analytics.averageViewsPerListing}</p>
                    </div>
                  </div>
                )}
                {!selectedListing && (
                  <div className='mt-8'>
                    <ReactApexChart
                      options={chartOptions}
                      series={chartSeries}
                      type="bar"
                      height={350}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Time Analytics Panel */}
            {selectedTab === 1 && (
              <div className='p-3 bg-white rounded-lg'>
                <h2 className='text-2xl font-semibold mb-4'>Views by Time of Day</h2>
                {timeAnalytics.overall && (
                  <div className='mt-8'>
                    <ReactApexChart
                      options={timeChartOptions}
                      series={[{
                        name: 'Views',
                        data: timeAnalytics.overall
                      }]}
                      type="line"
                      height={350}
                    />
                    <div className='mt-4 text-sm text-gray-600'>
                      <p>Peak viewing hours: {findPeakHours(timeAnalytics.overall)}</p>
                      <p>Recommended posting time: {suggestPostingTime(timeAnalytics.overall)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Analytics Panel */}
            {selectedTab === 2 && (
              <div className='p-3 bg-white rounded-lg'>
                <h2 className='text-2xl font-semibold mb-4'>Popular Search Terms</h2>
                {searchAnalytics.overall.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead>
                        <tr>
                          <th className='px-4 py-2 text-left'>Search Term</th>
                          <th className='px-4 py-2 text-right'>Searches</th>
                          <th className='px-4 py-2 text-right'>Listings Found</th>
                          <th className='px-4 py-2 text-right'>Last Searched</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {searchAnalytics.overall.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className='px-4 py-2'>{item.term}</td>
                            <td className='px-4 py-2 text-right'>{item.count}</td>
                            <td className='px-4 py-2 text-right'>{item.listingCount}</td>
                            <td className='px-4 py-2 text-right'>
                              {new Date(item.lastSearched).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className='text-gray-500 text-center py-4'>
                    No search data available yet
                  </p>
                )}
              </div>
            )}

            {/* Price Analytics Panel */}
            {selectedTab === 3 && (
              <div className='p-3 bg-white rounded-lg'>
                <h2 className='text-2xl font-semibold mb-4'>Price Competitiveness</h2>
                {priceAnalytics.overall.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead>
                        <tr>
                          <th className='px-4 py-2 text-left'>Listing</th>
                          <th className='px-4 py-2 text-right'>Your Price</th>
                          <th className='px-4 py-2 text-right'>Market Average</th>
                          <th className='px-4 py-2 text-right'>Difference</th>
                          <th className='px-4 py-2 text-center'>Position</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {priceAnalytics.overall.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className='px-4 py-2'>{item.name}</td>
                            <td className='px-4 py-2 text-right'>
                              ${item.currentPrice.toLocaleString()}
                            </td>
                            <td className='px-4 py-2 text-right'>
                              ${item.avgMarketPrice.toLocaleString()}
                            </td>
                            <td className='px-4 py-2 text-right'>
                              <span className={
                                item.percentDiff > 0 ? 'text-red-500' :
                                item.percentDiff < 0 ? 'text-green-500' :
                                'text-gray-500'
                              }>
                                {item.percentDiff > 0 ? '+' : ''}{item.percentDiff}%
                              </span>
                            </td>
                            <td className='px-4 py-2 text-center'>
                              <span className={`px-2 py-1 rounded text-sm ${
                                item.competitiveness === 'Below Market' ? 'bg-green-100 text-green-800' :
                                item.competitiveness === 'Above Market' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.competitiveness}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className='text-gray-500 text-center py-4'>
                    No price analytics available yet
                  </p>
                )}
              </div>
            )}

            {/* CTR Analytics Panel */}
            {selectedTab === 4 && (
              <div className='p-3 bg-white rounded-lg'>
                <h2 className='text-2xl font-semibold mb-4'>Click-through Rate Analysis</h2>
                {(ctrAnalytics.overall.length === 0 && !selectedListing) ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <p className="text-lg mb-4">No CTR data available yet</p>
                    <p className="text-sm">
                      CTR data will be generated as your listings receive more views and interactions.
                    </p>
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead>
                        <tr>
                          <th className='px-4 py-2 text-left'>Listing</th>
                          <th className='px-4 py-2 text-right'>Impressions</th>
                          <th className='px-4 py-2 text-right'>Clicks</th>
                          <th className='px-4 py-2 text-right'>CTR</th>
                          <th className='px-4 py-2 text-center'>Performance</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {ctrAnalytics.overall.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className='px-4 py-2'>{item.name}</td>
                            <td className='px-4 py-2 text-right'>{item.impressions.toLocaleString()}</td>
                            <td className='px-4 py-2 text-right'>{item.clicks.toLocaleString()}</td>
                            <td className='px-4 py-2 text-right'>{item.ctr}%</td>
                            <td className='px-4 py-2 text-center'>
                              <span className={`px-2 py-1 rounded text-sm ${
                                parseFloat(item.ctr) > 5 ? 'bg-green-100 text-green-800' :
                                parseFloat(item.ctr) > 2 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {parseFloat(item.ctr) > 5 ? 'High' :
                                 parseFloat(item.ctr) > 2 ? 'Average' :
                                 'Low'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Single Listing Analytics View */
        <div className='space-y-8'>
          {loading ? (
            <div className='text-center py-4'>Loading listing analytics...</div>
          ) : (
            <>
              {/* Overview Section */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Overview</h2>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Performance</h3>
                    <p className='mb-1'><span className='font-medium'>Views:</span> {listingAnalytics?.views || 0}</p>
                    <p className='mb-1'><span className='font-medium'>Clicks:</span> {listingAnalytics?.clicks || 0}</p>
                    <p><span className='font-medium'>CTR:</span> {((listingAnalytics?.clicks || 0) / (listingAnalytics?.views || 1) * 100).toFixed(1)}%</p>
                  </div>
                  
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Search Metrics</h3>
                    <p className='mb-1'><span className='font-medium'>Search Appearances:</span> {listingAnalytics?.searchAppearances || 0}</p>
                    <p><span className='font-medium'>Search CTR:</span> {((listingAnalytics?.searchClicks || 0) / (listingAnalytics?.searchAppearances || 1) * 100).toFixed(1)}%</p>
                  </div>
                  
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Price Info</h3>
                    <p className='mb-1'><span className='font-medium'>Current Price:</span> ${listingAnalytics?.price?.toLocaleString() || 0}</p>
                    <p className='mb-1'><span className='font-medium'>Market Avg:</span> ${priceAnalytics.listing?.priceStats?.avg?.toLocaleString() || 0}</p>
                    <p><span className='font-medium'>Position:</span> {priceAnalytics.listing?.marketPosition || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Performance Over Time */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Performance Trends</h2>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* Views and Clicks Trend */}
                  <div>
                    <h3 className='text-lg font-medium mb-4'>Views and Clicks</h3>
                    <ReactApexChart
                      options={{
                        ...chartOptions,
                        title: {
                          text: 'Daily Performance',
                          align: 'left'
                        }
                      }}
                      series={[
                        {
                          name: 'Views',
                          data: listingAnalytics?.dailyStats?.map(stat => stat.views) || []
                        },
                        {
                          name: 'Clicks',
                          data: listingAnalytics?.dailyStats?.map(stat => stat.clicks) || []
                        }
                      ]}
                      type="line"
                      height={350}
                    />
                  </div>

                  {/* CTR Trend */}
                  <div>
                    <h3 className='text-lg font-medium mb-4'>Click-through Rate</h3>
                    <ReactApexChart
                      options={{
                        ...chartOptions,
                        title: {
                          text: 'Daily CTR',
                          align: 'left'
                        }
                      }}
                      series={[
                        {
                          name: 'CTR',
                          data: listingAnalytics?.dailyStats?.map(stat => 
                            ((stat.clicks / (stat.views || 1)) * 100).toFixed(1)
                          ) || []
                        }
                      ]}
                      type="line"
                      height={350}
                    />
                  </div>
                </div>
              </div>

              {/* Time of Day Analysis */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Time of Day Analysis</h2>
                <ReactApexChart
                  options={{
                    ...timeChartOptions,
                    title: {
                      text: 'Views by Hour of Day',
                      align: 'left'
                    }
                  }}
                  series={[{
                    name: 'Views',
                    data: timeAnalytics.listing || []
                  }]}
                  type="bar"
                  height={350}
                />
                <div className='mt-4 text-sm text-gray-600'>
                  <p>Peak viewing hours: {findPeakHours(timeAnalytics.listing)}</p>
                  <p>Best time to update: {suggestPostingTime(timeAnalytics.listing)}</p>
                </div>
              </div>

              {/* Search Terms Analysis */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Search Performance</h2>
                {searchAnalytics.listing?.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead>
                        <tr>
                          <th className='px-4 py-2 text-left'>Search Term</th>
                          <th className='px-4 py-2 text-right'>Searches</th>
                          <th className='px-4 py-2 text-right'>Clicks</th>
                          <th className='px-4 py-2 text-right'>CTR</th>
                          <th className='px-4 py-2 text-right'>Last Searched</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {searchAnalytics.listing.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className='px-4 py-2'>{item.term}</td>
                            <td className='px-4 py-2 text-right'>{item.count}</td>
                            <td className='px-4 py-2 text-right'>{item.clicks}</td>
                            <td className='px-4 py-2 text-right'>
                              {((item.clicks / item.count) * 100).toFixed(1)}%
                            </td>
                            <td className='px-4 py-2 text-right'>
                              {new Date(item.lastSearched).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className='text-gray-500 text-center py-4'>No search data available yet</p>
                )}
              </div>

              {/* Price Analysis */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Price Analysis</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Market Position</h3>
                    <div className='space-y-2'>
                      <p>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          priceAnalytics.listing?.marketPosition === 'Below Market' ? 'bg-green-100 text-green-800' :
                          priceAnalytics.listing?.marketPosition === 'Above Market' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {priceAnalytics.listing?.marketPosition || 'N/A'}
                        </span>
                      </p>
                      <p>Price Percentile: {Math.round(priceAnalytics.listing?.percentileRank || 0)}th</p>
                      <p>Difference from Average: {priceAnalytics.listing?.percentDiff > 0 ? '+' : ''}{priceAnalytics.listing?.percentDiff || 0}%</p>
                    </div>
                  </div>

                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Similar Listings</h3>
                    <div className='space-y-2'>
                      <p>Found {priceAnalytics.listing?.similarListings || 0} similar properties</p>
                      <p>Price Range: ${priceAnalytics.listing?.priceStats?.min?.toLocaleString() || 0} - ${priceAnalytics.listing?.priceStats?.max?.toLocaleString() || 0}</p>
                      <p>Average Price: ${priceAnalytics.listing?.priceStats?.avg?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  <div className='bg-gray-50 p-4 rounded-lg col-span-2'>
                    <h3 className='text-lg font-medium mb-2'>Price Recommendations</h3>
                    <div className='space-y-2'>
                      <p>Recommended Range: ${priceAnalytics.listing?.recommendedRange?.min?.toLocaleString() || 0} - ${priceAnalytics.listing?.recommendedRange?.max?.toLocaleString() || 0}</p>
                      <p className='text-sm text-gray-600'>Based on market analysis and similar properties in your area</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTR Analysis */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-6'>Click-through Rate Analysis</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Overall CTR</h3>
                    <div className='space-y-2'>
                      <p>Total Impressions: {ctrAnalytics.listing?.impressions?.toLocaleString() || 0}</p>
                      <p>Total Clicks: {ctrAnalytics.listing?.clicks?.toLocaleString() || 0}</p>
                      <p>Overall CTR: {ctrAnalytics.listing?.ctr || 0}%</p>
                      <p className='text-sm text-gray-600 mt-2'>
                        Performance Rating: 
                        <span className={`ml-2 px-2 py-1 rounded ${
                          parseFloat(ctrAnalytics.listing?.ctr || 0) > 5 ? 'bg-green-100 text-green-800' :
                          parseFloat(ctrAnalytics.listing?.ctr || 0) > 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {parseFloat(ctrAnalytics.listing?.ctr || 0) > 5 ? 'High' :
                           parseFloat(ctrAnalytics.listing?.ctr || 0) > 2 ? 'Average' :
                           'Low'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h3 className='text-lg font-medium mb-2'>Performance by Source</h3>
                    <div className='space-y-2'>
                      {ctrAnalytics.listing?.sources?.map((source, index) => (
                        <div key={index} className='flex justify-between items-center'>
                          <span className='capitalize'>{source.name}</span>
                          <div className='text-right'>
                            <span className='font-medium'>{source.ctr}%</span>
                            <span className='text-sm text-gray-600 ml-2'>
                              ({source.clicks}/{source.impressions})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='col-span-2'>
                    <h3 className='text-lg font-medium mb-4'>CTR Trend</h3>
                    <Line
                      data={{
                        labels: ctrAnalytics.listing?.dailyStats?.slice(-7).map(stat => 
                          new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' })
                        ) || [],
                        datasets: [{
                          label: 'CTR %',
                          data: ctrAnalytics.listing?.dailyStats?.slice(-7).map(stat => 
                            ((stat.clicks / (stat.impressions || 1)) * 100).toFixed(1)
                          ) || [],
                          borderColor: 'rgb(75, 192, 192)',
                          tension: 0.1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'CTR %'
                            }
                          }
                        }
                      }}
                      height={200}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className='bg-white p-6 rounded-lg shadow-md'>
                <h2 className='text-2xl font-semibold mb-4'>Recommendations</h2>
                <div className='bg-blue-50 p-4 rounded-lg'>
                  <ul className='list-disc list-inside space-y-2 text-gray-700'>
                    {listingAnalytics?.recommendations?.length > 0 ? (
                      listingAnalytics.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))
                    ) : (
                      <li>No recommendations available at this time</li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
