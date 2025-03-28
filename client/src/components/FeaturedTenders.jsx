import { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';

const FeaturedTenders = () => {
  const [tenders] = useState([
    {
      id: 1,
      title: 'City Infrastructure Development Project',
      category: 'Urban Development',
      budget: '$2.5M - $3M',
      deadline: '2024-04-15'
    },
    {
      id: 2,
      title: 'Healthcare Equipment Supply',
      category: 'Public Health',
      budget: '$800K - $1.2M',
      deadline: '2024-04-10'
    },
    {
      id: 3,
      title: 'Smart City Implementation',
      category: 'Technology',
      budget: '$5M - $7M',
      deadline: '2024-04-20'
    }
  ]);

  return (
    <section className="bg-gray-50 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Tenders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenders.map((tender) => (
            <div
              key={tender.id}
              className="bg-white rounded-lg shadow-md p-6 transition-transform hover:scale-105"
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {tender.title}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{tender.category}</p>
                <p className="text-lg font-medium text-gray-800 mb-2">
                  {tender.budget}
                </p>
                <p className="text-sm text-gray-600">
                  Deadline: {new Date(tender.deadline).toLocaleDateString()}
                </p>
              </div>
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => console.log(`View details for tender ${tender.id}`)}
              >
                View Details
                <FaArrowRight className="text-sm" />
              </button>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button className="bg-gray-800 text-white py-2 px-6 rounded-md hover:bg-gray-900 transition-colors">
            View All Tenders
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedTenders;