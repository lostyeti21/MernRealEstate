import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactApexChart from 'react-apexcharts';

export default function Analytics() {
  const { currentUser } = useSelector((state) => state.user);
  const [analytics, setAnalytics] = useState({
    clicks: 0,
    views: 14,
    listingsCount: 1,
    averageViewsPerListing: 14
  });
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingAnalytics, setListingAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

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
        const res = await fetch(`/api/listing/user/${currentUser._id}`);
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
        const res = await fetch(`/api/analytics/${currentUser._id}`);
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
        const res = await fetch(`/api/analytics/listing/${selectedListing}`);
        const data = await res.json();
        
        console.log('Raw listing analytics response:', data);
        
        if (data.success) {
          console.log('Setting listing analytics:', data);
          setListingAnalytics({
            views: parseInt(data.views) || 0,
            clicks: parseInt(data.clicks) || 0,
            inquiries: parseInt(data.inquiries) || 0
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

  // Chart configuration for overall analytics
  const chartOptions = {
    chart: {
      type: 'bar',
      height: 350
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

  // Debug output
  console.log('Current listings:', listings);
  console.log('Selected listing:', selectedListing);
  console.log('Listing analytics state:', listingAnalytics);
  console.log('Chart series data:', listingChartSeries[0].data);

  return (
    <div className='p-3 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>
        Your Analytics
      </h1>

      <div className='bg-white p-6 rounded-lg shadow-md'>
        {/* Listing Selector */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Select Listing
          </label>
          <select
            className='w-full p-2 border rounded-lg'
            onChange={(e) => {
              console.log('Selected listing:', e.target.value);
              setSelectedListing(e.target.value);
            }}
            value={selectedListing || ''}
          >
            <option value="">Overall Analytics</option>
            {listings && listings.length > 0 ? (
              listings.map((listing) => {
                console.log('Rendering listing option:', listing);
                return (
                  <option key={listing._id} value={listing._id}>
                    {listing.name || listing.title || `Listing ${listing._id}`}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>No listings available ({listings?.length || 0} listings)</option>
            )}
          </select>
        </div>

        {/* Overall Analytics */}
        {!selectedListing && (
          <>
            <h2 className='text-xl font-semibold mb-4'>Overall Metrics</h2>
            <div className='space-y-4'>
              <p><span className='font-semibold'>Clicks:</span> {analytics.clicks}</p>
              <p><span className='font-semibold'>Views:</span> {analytics.views}</p>
              <p><span className='font-semibold'>Listings:</span> {analytics.listingsCount}</p>
              <p><span className='font-semibold'>Average Views per Listing:</span> {analytics.averageViewsPerListing}</p>
            </div>

            <div className='mt-8 border p-4 rounded-lg'>
              <h3 className='text-lg font-semibold mb-4'>Overall Analytics</h3>
              <ReactApexChart 
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={350}
              />
            </div>
          </>
        )}

        {/* Listing-specific Analytics */}
        {selectedListing && (
          <>
            <h2 className='text-xl font-semibold mb-4'>Listing Metrics</h2>
            {loading ? (
              <div className='text-center py-4'>Loading listing analytics...</div>
            ) : listingAnalytics ? (
              <>
                <div className='space-y-4'>
                  <p><span className='font-semibold'>Views:</span> {listingAnalytics.views || 0}</p>
                  <p><span className='font-semibold'>Clicks:</span> {listingAnalytics.clicks || 0}</p>
                  <p><span className='font-semibold'>Inquiries:</span> {listingAnalytics.inquiries || 0}</p>
                  <p className='text-sm text-gray-500'>Last updated: {new Date().toLocaleString()}</p>
                </div>

                <div className='mt-8 border p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-4'>Listing Performance</h3>
                  <ReactApexChart 
                    options={listingChartOptions}
                    series={listingChartSeries}
                    type="bar"
                    height={350}
                  />
                </div>
              </>
            ) : (
              <div className='text-center py-4'>
                No analytics available for this listing. 
                <br />
                <span className='text-sm text-gray-500'>
                  Analytics will be tracked as users interact with your listing.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
