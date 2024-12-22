import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function RealEstateDashboard() {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const token = localStorage.getItem('realEstateToken');
        const companyInfo = JSON.parse(localStorage.getItem('realEstateInfo'));

        if (!token || !companyInfo) {
          throw new Error('Authentication required');
        }

        const res = await fetch(`/api/real-estate/company/${companyInfo._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch company data');
        }

        setCompanyData(data.company);
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError(error.message);
        if (error.message === 'Authentication required') {
          navigate('/real-estate-signin');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [navigate]);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-8">Error: {error}</div>;
  if (!companyData) return <div className="text-center mt-8">No company data found</div>;

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>
        Real Estate Company Dashboard
      </h1>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <img
            src={companyData.avatar}
            alt="company logo"
            className="rounded-full h-24 w-24 object-cover"
          />
          <div>
            <p className="font-semibold">{companyData.companyName}</p>
            <p className="text-gray-600">{companyData.email}</p>
            <p className="text-gray-600">Rating: {companyData.companyRating.toFixed(1)}</p>
          </div>
        </div>

        <Link
          to="/add-agent"
          className='bg-green-700 text-white p-3 rounded-lg uppercase text-center hover:opacity-95'
        >
          Add New Agent
        </Link>

        {companyData.agents.length > 0 && (
          <div className="mt-4">
            <h2 className="text-2xl font-semibold mb-4">Your Agents</h2>
            {companyData.agents.map(agent => (
              <div
                key={agent._id}
                className="border rounded-lg p-3 flex items-center gap-4 mb-2"
              >
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="rounded-full h-16 w-16 object-cover"
                />
                <div>
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-gray-600">{agent.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 