import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export default function UserDistributionChart({ users, tenants, agents, landlords }) {
  const data = {
    labels: ['Tenants', 'Agents', 'Landlords'],
    datasets: [
      {
        data: [
          tenants.length,
          agents.length,
          landlords.length
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(53, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(53, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
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
    cutout: '50%',
  };

  return (
    <div className="bg-white p-2 rounded-lg shadow mt-4">
      <div className="w-[300px] h-[300px] mx-auto">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
