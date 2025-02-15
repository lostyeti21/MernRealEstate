import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function SessionChart({ sessionMetrics }) {
  const trafficData = {
    labels: sessionMetrics.peakTrafficHours.map(hour => `${hour.hour}:00`),
    datasets: [
      {
        label: 'Traffic by Hour',
        data: sessionMetrics.peakTrafficHours.map(hour => hour.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const userTypeData = {
    labels: ['Registered Users', 'Unregistered Users'],
    datasets: [
      {
        data: [sessionMetrics.registeredUsers, sessionMetrics.unregisteredUsers],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Traffic Distribution by Hour',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'User Distribution',
      },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="w-full h-64">
        <Line data={trafficData} options={lineOptions} />
      </div>
      <div className="w-full h-64">
        <Doughnut data={userTypeData} options={doughnutOptions} />
      </div>
    </div>
  );
}
