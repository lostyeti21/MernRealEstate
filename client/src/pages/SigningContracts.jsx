import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

export default function SigningContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useSelector(state => state.user);

  useEffect(() => {
    fetchContracts();
    
    // Set up polling to check for new contracts
    const intervalId = setInterval(fetchContracts, 30000); // Check every 30 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchContracts = async () => {
    try {
      console.log('Fetching contracts that need signature for user:', currentUser?._id);
      
      // Use the new endpoint specifically for contracts needing signature
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/pending-signature`, {
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
      console.log('Contracts needing signature:', data);
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
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Contracts Awaiting Your Signature</h1>
        
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-xl border border-white/20">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 relative bg-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Contracts Awaiting Your Signature</h1>
        <Link 
          to="/sentcontracts" 
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium flex items-center gap-2 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to All Contracts
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-xl border border-white/20 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg mb-2">No contracts require your signature at this time.</p>
            <p className="text-gray-500">You're all caught up!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {contracts
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((contract) => (
              <div key={contract._id} className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-xl border border-red-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-800">{contract.property || 'Unnamed Property'}</h2>
                  
                  <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Needs your signature
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Sent on:</span> {new Date(contract.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Sent by:</span> {contract.senderName || (contract.userId === currentUser?._id ? 'You' : 'Unknown Sender')}
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
                
                <div className="mt-6 flex justify-end">
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
                      contractUrl: contract.contractUrl,
                      contractId: contract._id,
                      needsSignature: true
                    }}
                    className="px-4 py-2 bg-red-500/80 hover:bg-red-600/90 text-white rounded-full backdrop-blur-sm transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Sign Contract
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
