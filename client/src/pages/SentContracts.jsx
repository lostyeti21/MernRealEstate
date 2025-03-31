import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function SentContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useSelector(state => state.user);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.text();
          errorText = JSON.parse(errorData).message || errorData;
        } catch {
          errorText = await response.text();
        }
        throw new Error(errorText || 'Failed to fetch contracts');
      }
      
      const data = await response.json();
      setContracts(data); 
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto mt-10 p-6 relative bg-white">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Sent Contracts</h1>
        
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-xl border border-white/20">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 relative bg-white">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Sent Contracts</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-xl border border-white/20 text-center">
          <p className="text-gray-600 text-lg">No contracts found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {contracts
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((contract) => (
              <div key={contract._id} className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <h2 className="text-xl font-semibold text-gray-800">{contract.property || 'Unnamed Property'}</h2>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Sent on:</span> {new Date(contract.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Sent by:</span> {contract.userId === currentUser?._id 
                      ? currentUser?.username || 'You'
                      : contract.senderName || 'Unknown Sender'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Contract ID:</span> {contract._id}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-white/50 p-4 rounded-lg">
                  {(contract.landlordFirstname || contract.landlordSurname) && (
                    <div>
                      <h3 className="font-medium text-gray-700">Landlord:</h3>
                      <p className="text-gray-600">{contract.landlordFirstname} {contract.landlordSurname}</p>
                    </div>
                  )}
                  {(contract.agentFirstname || contract.agentSurname) && (
                    <div>
                      <h3 className="font-medium text-gray-700">Agent:</h3>
                      <p className="text-gray-600">{contract.agentFirstname} {contract.agentSurname}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-700">Tenant:</h3>
                    <p className="text-gray-600">{contract.tenantFirstname} {contract.tenantSurname}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Link
                    to="/contract"
                    state={{
                      property: contract.property,
                      landlordFirstname: contract.landlordFirstname,
                      landlordSurname: contract.landlordSurname,
                      agentFirstname: contract.agentFirstname,
                      agentSurname: contract.agentSurname,
                      tenantFirstname: contract.tenantFirstname,
                      tenantSurname: contract.tenantSurname,
                      contractUrl: contract.contractUrl
                    }}
                    className="px-4 py-2 bg-teal-500/80 hover:bg-teal-600/90 text-white rounded-full backdrop-blur-sm transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    View Contract
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
