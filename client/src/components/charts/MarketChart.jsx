import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MarketChart({ listings }) {
  // Extract unique locations
  const locations = [...new Set(listings.map(listing => 
    listing.address.split(',').pop().trim()
  ))];

  // Calculate rental trends by location
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  // Group listings by location and calculate average rent over time
  const locationRentTrends = locations.map(location => {
    // Filter listings for this location
    const locationListings = listings.filter(listing => 
      listing.address.split(',').pop().trim() === location
    );

    // If no listings, return zero values
    if (locationListings.length === 0) {
      return {
        location,
        rentTrends: months.map(() => 0)
      };
    }

    // Calculate average rent for the location
    const avgRent = locationListings.reduce((sum, listing) => 
      sum + (listing.regularPrice || 0), 0) / locationListings.length;

    // Generate a simple trend based on the average rent
    const rentTrends = months.map((_, index) => 
      Math.round(avgRent * (1 + (index - 2) * 0.05))
    );

    return {
      location,
      rentTrends
    };
  });

  // Prepare chart data
  const rentTrendData = {
    labels: months,
    datasets: locationRentTrends.map((trend, index) => ({
      label: trend.location,
      data: trend.rentTrends,
      borderColor: `hsl(${index * 60}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.5)`,
    }))
  };

  const rentTrendOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Rental Price Trends by Location',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Rent Price ($)',
        },
        ticks: {
          callback: (value) => `$${value}`
        }
      },
    },
  };

  // Calculate listing distribution by area
  const areaDistribution = listings.reduce((acc, listing) => {
    const area = listing.address.split(',').pop().trim();
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  const saleTrendData = {
    labels: months,
    datasets: [
      {
        label: 'Average Sale Price',
        data: [250000, 255000, 260000, 258000, 262000, 265000],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const saleTrendOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sale Price Trends',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Sale Price ($)',
        },
        ticks: {
          callback: (value) => `$${value}`
        }
      },
    },
  };

  const areaData = {
    labels: Object.keys(areaDistribution),
    datasets: [
      {
        label: 'Listings by Area',
        data: Object.values(areaDistribution),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <Line options={rentTrendOptions} data={rentTrendData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Line options={saleTrendOptions} data={saleTrendData} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow h-[400px]">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Area Distribution Details</h3>
          <div className="overflow-y-auto h-[calc(100%-2rem)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Number of Listings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(areaDistribution).sort((a, b) => b[1] - a[1]).map(([area, count]) => (
                  <tr key={area}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round((count / listings.length) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow h-[400px]">
          <Bar options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Listings by Area',
              },
            },
          }} data={areaData} />
        </div>
      </div>
    </div>
  );
}
