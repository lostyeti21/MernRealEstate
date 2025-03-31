import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaUser } from 'react-icons/fa';

export default function RealEstateCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/real-estate/companies');
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch companies');
        }

        setCompanies(data.companies);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanyClick = async (companyId) => {
    setSelectedCompanyId(companyId);
    try {
      const res = await fetch(`/api/real-estate/companies/${companyId}/agents`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch agents');
      }

      setAgents(data.agents);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.message);
    }
  };

  const renderRating = (rating) => {
    return (
      <div className="flex items-center gap-1">
        <FaStar className="text-yellow-500" />
        <span>{rating?.toFixed(1) || 'N/A'}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-8 p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-semibold mb-8 text-center">Real Estate Companies</h1>
      
      {companies.length === 0 ? (
        <p className="text-center text-gray-600">No companies found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCompanyClick(company._id)}
            >
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={company.avatar || '/default-company.jpg'}
                    alt={company.companyName}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-company.jpg';
                    }}
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{company.companyName}</h2>
                    <div className="flex items-center gap-2">
                      {renderRating(company.companyRating)}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUser className="text-gray-400" />
                    <span>{company.agents?.length || 0} Agents</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCompanyId && agents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold">Agents for this Company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <FaUser className="text-gray-400" />
                    <div>
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      <div className="flex items-center gap-2">
                        {renderRating(agent.rating)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}