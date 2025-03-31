import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaStar, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import StarRating from '../components/StarRating';

export default function CompanyDetails() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setLoading(true);
        const companyRes = await fetch(`/api/real-estate/company/${id}`);
        const companyData = await companyRes.json();

        if (!companyData.success) {
          throw new Error(companyData.message || 'Failed to fetch company details');
        }

        console.log('Company data:', companyData); // Debug log
        setCompany(companyData.company);
        setAgents(companyData.company.agents || []);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Company not found
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Company Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg overflow-hidden mb-8"
      >
        {/* Banner Section */}
        <div className="relative h-64">
          {company.banner ? (
            <img
              src={company.banner}
              alt={company.companyName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = company.avatar || 'https://via.placeholder.com/800x400?text=' + encodeURIComponent(company.companyName);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              {company.avatar ? (
                <img
                  src={company.avatar}
                  alt={company.companyName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/800x400?text=' + encodeURIComponent(company.companyName);
                  }}
                />
              ) : (
                <span className="text-gray-500 text-2xl font-semibold">{company.companyName}</span>
              )}
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2 text-center">{company.companyName}</h1>
          <div className="flex items-center gap-4 mb-4 justify-center">
            {company.companyRating ? (
              <>
                <StarRating rating={Number(company.companyRating)} />
                <span className="text-lg">({Number(company.companyRating).toFixed(1)})</span>
              </>
            ) : (
              <span className="text-gray-500">N/A</span>
            )}
          </div>
          <p className="text-gray-600 text-center">{company.email}</p>
        </div>
      </motion.div>

      {/* Top Rated Agent Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Our Top Rated Agent</h2>
        {agents.some(agent => agent.averageRating > 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto"
          >
            {(() => {
              const topAgent = [...agents].sort((a, b) => 
                (b.averageRating || 0) - (a.averageRating || 0)
              )[0];

              return (
                <div className="p-6">
                  <div className="flex items-center gap-6">
                    <img
                      src={topAgent.avatar || 'https://via.placeholder.com/150?text=' + encodeURIComponent(topAgent.name.charAt(0))}
                      alt={topAgent.name}
                      className="w-24 h-24 rounded-full object-cover shadow-md"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=' + encodeURIComponent(topAgent.name.charAt(0));
                      }}
                    />
                    <div>
                      <h3 className="text-2xl font-semibold mb-2">{topAgent.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={Number(topAgent.averageRating)} />
                        <span className="text-lg">({Number(topAgent.averageRating).toFixed(1)})</span>
                      </div>
                      <p className="text-gray-600">{topAgent.email}</p>
                      {topAgent.specialization && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-semibold">Specialization:</span> {topAgent.specialization}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        ) : (
          <div className="text-center text-gray-600 text-lg bg-white rounded-lg shadow-md p-6">
            Our agents have not been rated yet
          </div>
        )}
      </div>

      {/* Agents Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-center mb-6">Our Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <motion.div
              key={agent._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={agent.avatar || 'https://via.placeholder.com/100?text=' + encodeURIComponent(agent.name.charAt(0))}
                    alt={agent.name}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/100?text=' + encodeURIComponent(agent.name.charAt(0));
                    }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    <div className="flex items-center gap-2">
                      {agent.averageRating ? (
                        <>
                          <StarRating rating={Number(agent.averageRating)} />
                          <span>({Number(agent.averageRating).toFixed(1)})</span>
                        </>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 truncate">{agent.email}</p>
                {agent.specialization && (
                  <p className="text-gray-500 mt-2">
                    <span className="font-semibold">Specialization:</span> {agent.specialization}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
