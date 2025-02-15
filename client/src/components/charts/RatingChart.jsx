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

export default function RatingChart({ ratings }) {
  const { agents, tenants, landlords } = ratings;

  // Calculate average ratings only for users who have ratings
  const calculateAverageRating = (users) => {
    const usersWithRatings = users.filter(user => user.ratings?.overall?.totalRatings > 0);
    if (usersWithRatings.length === 0) return 0;
    
    const sum = usersWithRatings.reduce((acc, user) => 
      acc + (user.ratings?.overall?.averageRating || 0), 0);
    return Number((sum / usersWithRatings.length).toFixed(1));
  };

  const barData = {
    labels: ['Agents', 'Tenants', 'Landlords'],
    datasets: [
      {
        label: 'Average Rating',
        data: [
          calculateAverageRating(agents),
          calculateAverageRating(tenants),
          calculateAverageRating(landlords)
        ],
        backgroundColor: [
          'rgba(53, 162, 235, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Average Ratings by User Type',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Bar options={barOptions} data={barData} />
    </div>
  );
}
