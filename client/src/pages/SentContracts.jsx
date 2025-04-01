import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

export default function SentContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inProgress'); 
  const { currentUser } = useSelector(state => state.user);
  const [notificationsSent, setNotificationsSent] = useState([]);
  const [processingContracts, setProcessingContracts] = useState(false);
  const [contractsNeedingSignature, setContractsNeedingSignature] = useState(0);
  const [signedContracts, setSignedContracts] = useState([]);
  const [loadingSignedContracts, setLoadingSignedContracts] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchContracts();
    fetchContractsNeedingSignature();
    fetchSignedContracts();
    
    // Set up polling to periodically check for contracts needing signature
    const intervalId = setInterval(fetchContractsNeedingSignature, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Add effect to refresh data when navigating back to this page
  useEffect(() => {
    // This will run whenever the component is mounted or the location changes
    // which happens when navigating back from another page
    console.log('SentContracts component focused or location changed');
    fetchSignedContracts();
  }, [location]);

  // Add visibility change listener to refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing signed contracts');
        fetchSignedContracts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      
      // Only process contracts if we're not already processing
      if (!processingContracts) {
        await processNewContracts(data);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch contracts that need the user's signature from the dedicated endpoint
  const fetchContractsNeedingSignature = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/pending-signature-count`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contracts needing signature');
      }
      
      const data = await response.json();
      setContractsNeedingSignature(data.count);
    } catch (error) {
      console.error('Error fetching contracts needing signature count:', error);
      // Don't show error to user, just log it
    }
  };

  // Fetch contracts that the user has signed
  const fetchSignedContracts = async () => {
    try {
      setLoadingSignedContracts(true);
      console.log('Fetching signed contracts for user:', currentUser?._id);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/signed-by-me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch signed contracts');
      }
      
      const data = await response.json();
      console.log('Signed contracts fetched:', data.length);
      setSignedContracts(data);
    } catch (error) {
      console.error('Error fetching signed contracts:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingSignedContracts(false);
    }
  };

  // Separate function to process new contracts
  const processNewContracts = async (contractsData) => {
    try {
      setProcessingContracts(true);
      
      // Check for new contracts that need notifications sent
      const contractsNeedingNotifications = contractsData.filter(contract => 
        // Only consider contracts created by the current user
        contract.userId === currentUser?._id &&
        // Only consider contracts that don't have pending signatures yet
        (!contract.pendingSignatures || contract.pendingSignatures.length === 0) &&
        // Don't consider contracts that are already fully signed
        !contract.fullySignedAt &&
        // Don't consider contracts we've already sent notifications for in this session
        !notificationsSent.includes(contract._id)
      );
      
      // Process one contract at a time to avoid overwhelming the server
      for (const contract of contractsNeedingNotifications) {
        try {
          await sendContractNotifications(contract._id);
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing contract ${contract._id}:`, error);
          // Add to sent list anyway to prevent retrying failed contracts
          setNotificationsSent(prev => [...prev, contract._id]);
        }
      }
    } catch (error) {
      console.error('Error processing contracts:', error);
    } finally {
      setProcessingContracts(false);
    }
  };

  // Function to send notifications to users who need to sign the contract
  const sendContractNotifications = async (contractId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/send-notifications`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contractId })
      });
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.text();
          errorText = JSON.parse(errorData).message || errorData;
        } catch {
          errorText = await response.text();
        }
        throw new Error(errorText || 'Failed to send contract notifications');
      }
      
      const data = await response.json();
      
      // Add to sent notifications list to avoid duplicate sends
      setNotificationsSent(prev => [...prev, contractId]);
      
      // Show success toast if notifications were sent
      if (data.success && data.notifiedUsers && data.notifiedUsers.length > 0) {
        toast.success(`Contract sent to ${data.notifiedUsers.join(', ')} for signature`);
        
        // Fetch contracts again to update the UI, but don't process them again
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const updatedData = await response.json();
          setContracts(updatedData);
        }
      } else if (data.success) {
        // If successful but no users found
        toast.info('No matching users found to send contract to');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending contract notifications:', error);
      toast.error(error.message);
      throw error;
    }
  };

  // Filter contracts based on active tab
  const getFilteredContracts = () => {
    if (activeTab === 'signedByYou') {
      return signedContracts;
    }
    
    return contracts.filter(contract => {
      if (activeTab === 'inProgress') {
        // Contracts in progress don't have a fullySignedAt property or it's null
        return !contract.fullySignedAt;
      } else if (activeTab === 'fullySigned') {
        // Fully signed contracts have a fullySignedAt property with a value
        return contract.fullySignedAt;
      }
      return false;
    });
  };

  const filteredContracts = getFilteredContracts();

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
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Contracts</h1>
      
      {/* Tabs with notification bubble */}
      <div className="flex mb-6 border-b border-gray-200 relative">
        <button
          onClick={() => setActiveTab('inProgress')}
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === 'inProgress'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setActiveTab('fullySigned')}
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === 'fullySigned'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Fully Signed
        </button>
        <button
          onClick={() => setActiveTab('signedByYou')}
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === 'signedByYou'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Signed by You
        </button>
        
        {/* Clickable notification bubble */}
        <div className="absolute right-0 top-0 flex items-center h-full">
          <Link 
            to="/signing-contracts" 
            className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md flex items-center hover:bg-red-600 transition-colors duration-200 cursor-pointer"
          >
            <span>Contracts that you need to sign</span>
            {contractsNeedingSignature > 0 && (
              <span className="ml-2 bg-white text-red-500 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {contractsNeedingSignature}
              </span>
            )}
          </Link>
        </div>
      </div>
      
      {(loading && activeTab !== 'signedByYou') || (loadingSignedContracts && activeTab === 'signedByYou') ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-xl border border-white/20 text-center">
          <p className="text-gray-600 text-lg">
            {activeTab === 'inProgress' 
              ? 'No contracts in progress.' 
              : activeTab === 'fullySigned'
                ? 'No fully signed contracts found.'
                : 'No contracts signed by you.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredContracts
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((contract) => (
              <div key={contract._id} className={`bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-xl border ${
                activeTab === 'signedByYou' 
                  ? 'border-blue-300' 
                  : contract.pendingSignatures?.includes(currentUser?._id) 
                    ? 'border-red-300' 
                    : 'border-white/20'
              } hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}>
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-800">{contract.property || 'Unnamed Property'}</h2>
                  
                  {/* Status indicators */}
                  {activeTab === 'signedByYou' && (
                    <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Signed by you
                    </div>
                  )}
                  
                  {contract.pendingSignatures?.includes(currentUser?._id) && activeTab !== 'signedByYou' && (
                    <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Needs your signature
                    </div>
                  )}
                </div>
                
                {activeTab === 'inProgress' && (
                  <div className="mt-4 space-y-3">
                    {/* Signed by section */}
                    <div className="flex flex-wrap gap-2">
                      {contract.signatures && contract.signatures.length > 0 ? (
                        <>
                          <span className="text-sm text-gray-600 font-medium">Signed by:</span>
                          {contract.signatures.map((signature, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center"
                              title={`Signed by ${signature.name || signature.username}`}
                            >
                              {signature.name || signature.username}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No signatures yet</span>
                      )}
                    </div>
                    
                    {/* Awaiting signature section */}
                    {contract.pendingSignatures && contract.pendingSignatures.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 font-medium">Awaiting signature from:</span>
                        {contract.pendingSignatures.map((pendingSignature, index) => {
                          // For debugging
                          console.log('Pending signature:', pendingSignature);
                          
                          // Check if pendingSignature is an object with user info or just an ID
                          const isObject = typeof pendingSignature === 'object' && pendingSignature !== null;
                          const displayName = isObject 
                            ? (pendingSignature.name || pendingSignature.username || 'Unknown User')
                            : 'Pending User';
                            
                          // Check if this is an agent (if user has isAgent property)
                          const isAgent = isObject && pendingSignature.isAgent;
                          
                          return (
                            <span 
                              key={index} 
                              className={`px-2 py-1 ${isAgent ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'} rounded-full text-xs font-medium flex items-center`}
                              title={`Signature pending${isAgent ? ' (Agent)' : ''}`}
                            >
                              {displayName}
                              {isAgent && (
                                <span className="ml-1 text-xs bg-purple-200 text-purple-800 px-1 rounded">Agent</span>
                              )}
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ml-1 ${isAgent ? 'text-purple-500' : 'text-amber-500'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Agent signature section - for contracts with agent details but no agent in pendingSignatures */}
                    {(contract.agentFirstname || contract.agentSurname) && 
                     !(contract.pendingSignatures || []).some(sig => 
                       (typeof sig === 'object' && sig !== null && sig.isAgent) || 
                       (contract.agentId && (sig === contract.agentId || sig.userId === contract.agentId))
                     ) && 
                     !(contract.signatures || []).some(sig => 
                       (typeof sig === 'object' && sig !== null && sig.isAgent) || 
                       (contract.agentId && (sig === contract.agentId || sig.userId === contract.agentId))
                     ) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 font-medium">Agent signature status:</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center">
                          {contract.agentFirstname} {contract.agentSurname}
                          <span className="ml-1 text-xs bg-purple-200 text-purple-800 px-1 rounded">Agent</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Created on:</span> {new Date(contract.createdAt).toLocaleString()}
                  </p>
                  {contract.fullySignedAt && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Fully signed on:</span> {new Date(contract.fullySignedAt).toLocaleString()}
                    </p>
                  )}
                  {activeTab === 'signedByYou' && contract.senderName && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Sent by:</span> {contract.senderName}
                    </p>
                  )}
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
                      needsSignature: contract.pendingSignatures?.includes(currentUser?._id)
                    }}
                    className="px-4 py-2 bg-teal-500/80 hover:bg-teal-600/90 text-white rounded-full backdrop-blur-sm transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
