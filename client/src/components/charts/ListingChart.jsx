import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ListingChart({ listings }) {
  // Calculate listings by type
  const typeCount = listings.reduce((acc, listing) => {
    acc[listing.type] = (acc[listing.type] || 0) + 1;
    return acc;
  }, {});

  // Calculate average price by type
  const priceByType = listings.reduce((acc, listing) => {
    if (!acc[listing.type]) {
      acc[listing.type] = { total: 0, count: 0 };
    }
    acc[listing.type].total += listing.regularPrice;
    acc[listing.type].count += 1;
    return acc;
  }, {});

  const avgPriceByType = Object.entries(priceByType).reduce((acc, [type, data]) => {
    acc[type] = data.total / data.count;
    return acc;
  }, {});

  const typeData = {
    labels: Object.keys(typeCount),
    datasets: [
      {
        label: 'Number of Listings',
        data: Object.values(typeCount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
        ],
      },
    ],
  };

  const priceData = {
    labels: Object.keys(avgPriceByType),
    datasets: [
      {
        label: 'Average Price',
        data: Object.values(avgPriceByType),
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
      },
    ],
  };

  const typeOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Listings by Type',
      },
    },
  };

  const priceOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Average Price by Type',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="w-full h-64">
        <Pie data={typeData} options={typeOptions} />
      </div>
      <div className="w-full h-64">
        <Bar data={priceData} options={priceOptions} />
      </div>
    </div>
  );
}
