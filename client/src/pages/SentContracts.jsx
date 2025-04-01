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
  const [fullySignedContracts, setFullySignedContracts] = useState([]);
  const [loadingSignedContracts, setLoadingSignedContracts] = useState(false);
  const [loadingFullySignedContracts, setLoadingFullySignedContracts] = useState(false);
  const location = useLocation();

  // Add a state to store user information for signatures
  const [signatureUsers, setSignatureUsers] = useState({});

  useEffect(() => {
    fetchContracts();
    fetchContractsNeedingSignature();
    fetchSignedContracts();
    
    // If user is an agent, also fetch agent-specific contracts
    if (currentUser?.isAgent) {
      console.log('User is an agent, fetching agent contracts');
      fetchAgentContracts();
    }
    
    // Set up polling to periodically check for contracts needing signature
    const intervalId = setInterval(fetchContractsNeedingSignature, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [currentUser]);

  useEffect(() => {
    fetchContracts();
    fetchContractsNeedingSignature();
    fetchSignedContracts();
    
    // If user is an agent, also fetch agent-specific contracts
    if (currentUser?.isAgent) {
      console.log('User is an agent, fetching agent contracts');
      fetchAgentContracts();
    }
    
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

  useEffect(() => {
    // Function to fetch user information for a signature ID
    const fetchSignatureUserInfo = async (signatureId) => {
      try {
        // Don't fetch if signatureId is 'find' or not a valid ID
        if (signatureId === 'find' || !signatureId || typeof signatureId !== 'string') {
          console.log('Skipping invalid signature ID:', signatureId);
          return;
        }
        
        // First try to get user from regular users
        let response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/${signatureId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Found user data:', userData);
          
          // Add isAgent flag if not present
          if (userData && !('isAgent' in userData)) {
            userData.isAgent = false;
          }
          
          setSignatureUsers(prev => ({
            ...prev,
            [signatureId]: userData
          }));
        } else {
          // If not found in regular users, try to get from agents
          console.log('User not found in regular users, trying agents API');
          response = await fetch(`${import.meta.env.VITE_API_URL}/api/agent/${signatureId}`, {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const agentData = await response.json();
            console.log('Found agent data:', agentData);
            
            // Format agent data to match user data structure
            const formattedAgentData = {
              _id: agentData._id || signatureId,
              username: agentData.name || agentData.username || 'Agent',
              name: agentData.name || agentData.username || 'Agent',
              avatar: agentData.avatar || '',
              isAgent: true
            };
            
            setSignatureUsers(prev => ({
              ...prev,
              [signatureId]: formattedAgentData
            }));
          } else {
            console.log('User not found in agents either');
            
            // Special handling for agent IDs - check if this is an agent ID that matches the contract
            const contracts = [...(contracts || []), ...(signedContracts || [])];
            const matchingContract = contracts.find(c => 
              c.agentId === signatureId || 
              (c.agentFirstname && c.agentSurname)
            );
            
            if (matchingContract && matchingContract.agentFirstname && matchingContract.agentSurname) {
              // Create a placeholder agent entry using contract information
              setSignatureUsers(prev => ({
                ...prev,
                [signatureId]: { 
                  _id: signatureId,
                  username: `${matchingContract.agentFirstname} ${matchingContract.agentSurname}`,
                  name: `${matchingContract.agentFirstname} ${matchingContract.agentSurname}`,
                  avatar: '',
                  isAgent: true
                }
              }));
            } else {
              // Set a placeholder for the user to avoid repeated failed lookups
              setSignatureUsers(prev => ({
                ...prev,
                [signatureId]: { 
                  _id: signatureId,
                  username: 'Unknown User', 
                  name: 'Unknown User', 
                  avatar: '',
                  isAgent: false
                }
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user info for signature:', error);
        // Set a placeholder for the user to avoid repeated failed lookups
        setSignatureUsers(prev => ({
          ...prev,
          [signatureId]: { 
            _id: signatureId,
            username: 'Unknown User', 
            name: 'Unknown User', 
            avatar: '',
            isAgent: false
          }
        }));
      }
    };

    // Collect all signature IDs from all contracts
    const signatureIds = new Set();
    
    // Add IDs from contracts
    contracts.forEach(contract => {
      if (contract.signatures) {
        contract.signatures.forEach(sig => {
          const sigId = typeof sig === 'object' ? sig.userId : sig?.toString();
          if (sigId && sigId !== 'find') signatureIds.add(sigId);
        });
      }
      
      // Also add agent ID if present
      if (contract.agentId && contract.agentId !== 'find') {
        signatureIds.add(contract.agentId.toString());
      }
    });
    
    // Add IDs from signed contracts
    signedContracts.forEach(contract => {
      if (contract.signatures) {
        contract.signatures.forEach(sig => {
          const sigId = typeof sig === 'object' ? sig.userId : sig?.toString();
          if (sigId && sigId !== 'find') signatureIds.add(sigId);
        });
      }
      
      // Also add agent ID if present
      if (contract.agentId && contract.agentId !== 'find') {
        signatureIds.add(contract.agentId.toString());
      }
    });
    
    // Fetch user info for each signature ID
    signatureIds.forEach(id => {
      if (!signatureUsers[id]) {
        fetchSignatureUserInfo(id);
      }
    });
  }, [contracts, signedContracts]);

  useEffect(() => {
    // Function to fetch all users for signatures
    const fetchAllSignatureUsers = async () => {
      try {
        // Get all contracts to extract signature IDs
        const allContracts = [...contracts, ...signedContracts, ...fullySignedContracts];
        const signatureIds = new Set();
        
        // Collect all signature and pending signature IDs
        allContracts.forEach(contract => {
          // Add signatures
          if (contract.signatures) {
            contract.signatures.forEach(sig => {
              if (typeof sig === 'string') {
                signatureIds.add(sig);
              } else if (sig && sig.userId) {
                signatureIds.add(sig.userId);
              }
            });
          }
          
          // Add pending signatures
          if (contract.pendingSignatures) {
            contract.pendingSignatures.forEach(sig => {
              if (typeof sig === 'string') {
                signatureIds.add(sig);
              } else if (sig && sig.userId) {
                signatureIds.add(sig.userId);
              }
            });
          }
          
          // Add landlord, agent, and tenant IDs if available
          if (contract.landlordId) signatureIds.add(contract.landlordId.toString());
          if (contract.agentId) signatureIds.add(contract.agentId.toString());
          if (contract.tenantId) signatureIds.add(contract.tenantId.toString());
        });
        
        // Fetch user information for each signature ID
        const uniqueIds = Array.from(signatureIds).filter(id => 
          id && id !== 'placeholder' && id !== 'find' && typeof id === 'string'
        );
        
        console.log('Fetching user information for signature IDs:', uniqueIds);
        
        // Fetch in parallel for better performance
        await Promise.all(uniqueIds.map(id => fetchSignatureUserInfo(id)));
        
      } catch (error) {
        console.error('Error fetching signature users:', error);
      }
    };

    fetchAllSignatureUsers();
  }, [contracts, signedContracts, fullySignedContracts]);

  // Function to filter contracts by search term
  const filterContractsBySearchTerm = (contracts, searchTerm) => {
    if (!searchTerm) return contracts;
    
    return contracts.filter(contract => {
      // Check if contract title contains search term
      const titleMatch = contract.title && contract.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Check if contract description contains search term
      const descriptionMatch = contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Check if any user name in the contract contains search term
      const username = searchTerm.toLowerCase();
      const isNameIncluded = 
        (contract.landlordFirstname && username && 
         contract.landlordFirstname.toLowerCase().includes(username.toLowerCase())) ||
        (contract.landlordSurname && username && 
         contract.landlordSurname.toLowerCase().includes(username.toLowerCase())) ||
        (contract.tenantFirstname && username && 
         contract.tenantFirstname.toLowerCase().includes(username.toLowerCase())) ||
        (contract.tenantSurname && username && 
         contract.tenantSurname.toLowerCase().includes(username.toLowerCase())) ||
        (contract.agentFirstname && username && 
         contract.agentFirstname.toLowerCase().includes(username.toLowerCase()));
      
      return titleMatch || descriptionMatch || isNameIncluded;
    });
  };

  const fetchContracts = async () => {
    try {
      console.log('Fetching contracts for user:', currentUser?._id, 'isAgent:', currentUser?.isAgent);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      
      const data = await response.json();
      console.log('Fetched contracts:', data.length);
      setContracts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  // Add a new function to fetch contracts specifically for agents
  const fetchAgentContracts = async () => {
    if (!currentUser?.isAgent) return;
    
    try {
      console.log('Fetching agent contracts for:', currentUser?._id);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/agent-contracts`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch agent contracts');
      }
      
      const data = await response.json();
      console.log('Fetched agent contracts:', data.length);
      
      // Merge with existing contracts, avoiding duplicates
      setContracts(prevContracts => {
        const combinedContracts = [...prevContracts];
        
        // Add agent contracts that aren't already in the array
        data.forEach(contract => {
          if (!combinedContracts.some(c => c._id === contract._id)) {
            combinedContracts.push(contract);
          }
        });
        
        return combinedContracts;
      });
    } catch (error) {
      console.error('Error fetching agent contracts:', error);
      // Don't set error state here as it would override the main contracts
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
    console.log('Filtering contracts for tab:', activeTab);
    console.log('Current user:', currentUser?._id, 'isAgent:', currentUser?.isAgent);
    console.log('Total contracts available:', contracts.length);
    console.log('Total signed contracts available:', signedContracts.length);
    
    if (activeTab === 'signedByYou') {
      return signedContracts;
    } else if (activeTab === 'fullySigned') {
      // For the Fully Signed tab, combine contracts from both sources:
      // 1. Contracts the user sent that are fully signed
      // 2. Contracts from the signedContracts array that are fully signed
      
      // First, get contracts the user sent that are fully signed
      const sentAndFullySigned = contracts.filter(contract => 
        contract.fullySignedAt || 
        (contract.pendingSignatures && contract.pendingSignatures.length === 0)
      );
      
      // Then, get contracts the user signed that are fully signed
      const receivedAndFullySigned = signedContracts.filter(contract =>
        contract.fullySignedAt || 
        (contract.pendingSignatures && contract.pendingSignatures.length === 0)
      );
      
      // Combine both arrays, avoiding duplicates by checking IDs
      const combinedContracts = [...sentAndFullySigned];
      
      // Add contracts from receivedAndFullySigned that aren't already in combinedContracts
      receivedAndFullySigned.forEach(contract => {
        if (!combinedContracts.some(c => c._id === contract._id)) {
          combinedContracts.push(contract);
        }
      });
      
      return combinedContracts;
    } else if (activeTab === 'inProgress') {
      // Get all contracts that need signatures (from both sources)
      const allContractsNeedingSignatures = [...contracts, ...signedContracts].filter((contract, index, self) => 
        // Remove duplicates
        index === self.findIndex(c => c._id === contract._id) &&
        // Only include contracts that need signatures
        !contract.fullySignedAt && 
        (contract.pendingSignatures && contract.pendingSignatures.length > 0)
      );
      
      console.log('All contracts needing signatures:', allContractsNeedingSignatures.length);
      
      // For agents, we need to include contracts where they are mentioned as the agent
      if (currentUser?.isAgent) {
        console.log('User is an agent, applying agent-specific filtering');
        
        const agentContracts = allContractsNeedingSignatures.filter(contract => {
          // Check if agent is the sender
          if (contract.userId === currentUser._id) {
            console.log('Agent is sender of contract:', contract._id);
            return true;
          }
          
          // Check if agent is in pendingSignatures or signatures
          const pendingSignatureIds = Array.isArray(contract.pendingSignatures) 
            ? contract.pendingSignatures.map(sig => 
                typeof sig === 'object' ? sig.userId || sig : sig
              )
            : [];
            
          const signatureIds = Array.isArray(contract.signatures)
            ? contract.signatures.map(sig => 
                typeof sig === 'object' ? sig.userId || sig : sig
              )
            : [];
            
          if (pendingSignatureIds.some(id => id === currentUser._id || id === currentUser._id?.toString()) ||
              signatureIds.some(id => id === currentUser._id || id === currentUser._id?.toString())) {
            console.log('Agent is in signatures/pendingSignatures of contract:', contract._id);
            return true;
          }
          
          // Check if agent ID matches contract's agentId
          if (contract.agentId && 
              (contract.agentId === currentUser._id || 
               contract.agentId.toString() === currentUser._id.toString())) {
            console.log('Agent ID matches contract agentId:', contract._id);
            return true;
          }
          
          // Check agent name against contract fields
          const userFirstName = currentUser?.name?.split(' ')[0] || '';
          const userLastName = currentUser?.name?.split(' ').slice(1).join(' ') || '';
          const username = currentUser?.username || '';
          
          // Check if agent name matches contract agent fields (case insensitive)
          if (contract.agentFirstname || contract.agentSurname) {
            const isAgentNameMatch = 
              (userFirstName && contract.agentFirstname && 
               contract.agentFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
              (userLastName && contract.agentSurname && 
               contract.agentSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
              (username && contract.agentFirstname && 
               contract.agentFirstname.toLowerCase().includes(username.toLowerCase()));
               
            if (isAgentNameMatch) {
              console.log('Agent name matches contract agent fields:', contract._id);
              return true;
            }
          }
          
          // If none of the above conditions are met, don't include this contract
          return false;
        });
        
        console.log('Filtered agent contracts:', agentContracts.length);
        return agentContracts;
      }
      
      // For regular users, filter contracts to only include those where the user's name is in the contract
      // or they are in the pendingSignatures or signatures arrays
      const contractsInvolvingUser = allContractsNeedingSignatures.filter(contract => {
        // Check if user is the sender
        if (contract.userId === currentUser?._id) {
          console.log('User is sender of contract:', contract._id);
          return true;
        }
        
        // Check if user is in pendingSignatures
        const pendingSignatureIds = Array.isArray(contract.pendingSignatures) 
          ? contract.pendingSignatures.map(sig => 
              typeof sig === 'object' ? sig.userId || sig : sig
            )
          : [];
          
        if (pendingSignatureIds.some(id => id === currentUser?._id || id === currentUser?._id?.toString())) {
          console.log('User is in pendingSignatures of contract:', contract._id);
          return true;
        }
        
        // Check if user is in signatures
        const signatureIds = Array.isArray(contract.signatures)
          ? contract.signatures.map(sig => 
              typeof sig === 'object' ? sig.userId || sig : sig
            )
          : [];
          
        if (signatureIds.some(id => id === currentUser?._id || id === currentUser?._id?.toString())) {
          console.log('User is in signatures of contract:', contract._id);
          return true;
        }
        
        // Check if user's name is in the contract details
        const userFirstName = currentUser?.name?.split(' ')[0] || '';
        const userLastName = currentUser?.name?.split(' ').slice(1).join(' ') || '';
        const username = currentUser?.username || '';
        
        const isNameIncluded = 
          // Check landlord fields
          (contract.landlordFirstname && userFirstName && 
           contract.landlordFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
          (contract.landlordSurname && userLastName && 
           contract.landlordSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
          // Check agent fields
          (contract.agentFirstname && userFirstName && 
           contract.agentFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
          (contract.agentSurname && userLastName && 
           contract.agentSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
          // Check tenant fields
          (contract.tenantFirstname && userFirstName && 
           contract.tenantFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
          (contract.tenantSurname && userLastName && 
           contract.tenantSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
          // Check username
          (contract.tenantFirstname && username && 
           contract.tenantFirstname.toLowerCase().includes(username.toLowerCase())) ||
          (contract.landlordFirstname && username && 
           contract.landlordFirstname.toLowerCase().includes(username.toLowerCase())) ||
          (contract.agentFirstname && username && 
           contract.agentFirstname.toLowerCase().includes(username.toLowerCase()));
        
        return isNameIncluded;
      });
      
      console.log('Contracts involving user:', contractsInvolvingUser.length);
      
      return contractsInvolvingUser;
    }
    
    return [];
  };

  // Get the filtered contracts based on the active tab
  const filteredContracts = getFilteredContracts();
  
  // Calculate counts for each tab
  const inProgressCount = [...contracts, ...signedContracts].filter((contract, index, self) => 
    // Remove duplicates
    index === self.findIndex(c => c._id === contract._id) &&
    // Only include contracts that need signatures
    !contract.fullySignedAt && 
    (contract.pendingSignatures && contract.pendingSignatures.length > 0)
  ).filter(contract => {
    // Check if user is the sender
    if (contract.userId === currentUser?._id) {
      return true;
    }
    
    // Check if user is in pendingSignatures or signatures
    const pendingSignatureIds = Array.isArray(contract.pendingSignatures) 
      ? contract.pendingSignatures.map(sig => 
          typeof sig === 'object' ? sig.userId || sig : sig
        )
      : [];
    const signatureIds = Array.isArray(contract.signatures)
      ? contract.signatures.map(sig => 
          typeof sig === 'object' ? sig.userId || sig : sig
        )
      : [];
    
    if (pendingSignatureIds.some(id => id === currentUser?._id || id === currentUser?._id?.toString()) ||
        signatureIds.some(id => id === currentUser?._id || id === currentUser?._id?.toString())) {
      return true;
    }
    
    // Check if user's name is in the contract details
    const userFirstName = currentUser?.name?.split(' ')[0] || '';
    const userLastName = currentUser?.name?.split(' ').slice(1).join(' ') || '';
    const username = currentUser?.username || '';
    
    const isNameIncluded = 
      // Check landlord fields
      (contract.landlordFirstname && userFirstName && 
       contract.landlordFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
      (contract.landlordSurname && userLastName && 
       contract.landlordSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
      // Check agent fields
      (contract.agentFirstname && userFirstName && 
       contract.agentFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
      (contract.agentSurname && userLastName && 
       contract.agentSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
      // Check tenant fields
      (contract.tenantFirstname && userFirstName && 
       contract.tenantFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
      (contract.tenantSurname && userLastName && 
       contract.tenantSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
      // Check username
      (contract.tenantFirstname && username && 
       contract.tenantFirstname.toLowerCase().includes(username.toLowerCase())) ||
      (contract.landlordFirstname && username && 
       contract.landlordFirstname.toLowerCase().includes(username.toLowerCase())) ||
      (contract.agentFirstname && username && 
       contract.agentFirstname.toLowerCase().includes(username.toLowerCase()));
    
    return isNameIncluded;
  }).length;
  
  const signedByYouCount = signedContracts.length;
  
  const fullySignedCount = (() => {
    // First, get contracts the user sent that are fully signed
    const sentAndFullySigned = contracts.filter(contract => 
      contract.fullySignedAt || 
      (contract.pendingSignatures && contract.pendingSignatures.length === 0)
    );
    
    // Then, get contracts the user signed that are fully signed
    const receivedAndFullySigned = signedContracts.filter(contract =>
      contract.fullySignedAt || 
      (contract.pendingSignatures && contract.pendingSignatures.length === 0)
    );
    
    // Combine both arrays, avoiding duplicates by checking IDs
    const combinedContracts = [...sentAndFullySigned];
    
    // Add contracts from receivedAndFullySigned that aren't already in combinedContracts
    receivedAndFullySigned.forEach(contract => {
      if (!combinedContracts.some(c => c._id === contract._id)) {
        combinedContracts.push(contract);
      }
    });
    
    return combinedContracts.length;
  })();

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
          In Progress <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{inProgressCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('signedByYou')}
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === 'signedByYou'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Signed by You <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{signedByYouCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('fullySigned')}
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === 'fullySigned'
              ? 'text-teal-600 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Fully Signed <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{fullySignedCount}</span>
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
                  
                  {activeTab === 'fullySigned' && contract.contractNumber && (
                    <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Contract #{contract.contractNumber}
                    </div>
                  )}
                </div>
                
                {activeTab === 'inProgress' && (
                  <div className="mt-4 space-y-3">
                    {/* Sent by information */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 font-medium">Sent by:</span>
                      {contract.userId ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center">
                          {contract.userId === currentUser?._id 
                            ? (currentUser?.name || currentUser?.username || 'You')
                            : (contract.senderName || 
                              (contract.userInfo && (contract.userInfo.name || contract.userInfo.username)) || 
                              'Unknown Sender')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Unknown sender</span>
                      )}
                    </div>
                    
                    {/* Signed by section */}
                    <div className="flex flex-wrap gap-2">
                      {contract.signatures && contract.signatures.length > 0 ? (
                        <>
                          <span className="text-sm text-gray-600 font-medium">Signed by:</span>
                          {contract.signatures.map((signature, index) => {
                            // Handle different signature formats
                            let displayName = 'Unknown User';
                            let userRole = '';
                            let userId = '';
                            
                            if (typeof signature === 'object' && signature !== null) {
                              // If it's an object with user info
                              userId = signature.userId;
                              displayName = signature.name || signature.username || 'Unknown User';
                              
                              // Check if this signature is from the current user
                              if (signature.userId === currentUser?._id || signature.isCurrentUser) {
                                displayName = currentUser?.name || currentUser?.username || 'You';
                              }
                              
                              // Check if user is an agent
                              if (signature.isAgent) {
                                userRole = 'Agent';
                              }
                              
                              // For debugging
                              console.log('Signature object:', signature);
                            } else {
                              // If it's just an ID, try to match it with current user or contract roles
                              userId = signature?.toString();
                              const signatureId = userId;
                              
                              // For debugging
                              console.log('Signature ID to match:', signatureId, 'Current user ID:', currentUser?._id);
                              
                              // Check if this is the current user's signature
                              if (signatureId === currentUser?._id?.toString()) {
                                displayName = currentUser?.name || currentUser?.username || 'You';
                              } 
                              // If we have contract role information, use it
                              else if (contract.landlordId && contract.landlordId.toString() === signatureId) {
                                displayName = `${contract.landlordFirstname || ''} ${contract.landlordSurname || ''}`;
                                userRole = 'Landlord';
                              } else if (contract.agentId && contract.agentId.toString() === signatureId) {
                                displayName = `${contract.agentFirstname || ''} ${contract.agentSurname || ''}`;
                                userRole = 'Agent';
                              } else if (contract.tenantId && contract.tenantId.toString() === signatureId) {
                                displayName = `${contract.tenantFirstname || ''} ${contract.tenantSurname || ''}`;
                                userRole = 'Tenant';
                              } else {
                                // Check if we have this user in our signatureUsers state
                                const userInfo = signatureUsers[signatureId];
                                if (userInfo) {
                                  displayName = userInfo.name || userInfo.username || 'Unknown User';
                                  if (userInfo.isAgent) {
                                    userRole = 'Agent';
                                  }
                                }
                              }
                            }
                            
                            // Try to get additional info from signatureUsers if we have it
                            if (userId && signatureUsers[userId]) {
                              const userInfo = signatureUsers[userId];
                              if (!displayName || displayName === 'Unknown User') {
                                displayName = userInfo.name || userInfo.username || displayName;
                              }
                              if (!userRole && userInfo.isAgent) {
                                userRole = 'Agent';
                              }
                            }
                                
                            // Clean up the display name
                            displayName = displayName.trim();
                            if (displayName === '' || displayName === ' ') displayName = 'Unknown User';
                            
                            // Add role if available, but avoid "Agent (Agent)" redundancy
                            let displayWithRole = displayName;
                            if (userRole && !(userRole === 'Agent' && displayName === 'Agent')) {
                              displayWithRole = `${displayName} (${userRole})`;
                            }
                            
                            // Special handling for agents - make sure we show their name
                            if (userRole === 'Agent' && displayName === 'Agent' && contract.agentFirstname && contract.agentSurname) {
                              displayWithRole = `${contract.agentFirstname} ${contract.agentSurname} (Agent)`;
                            }
                            
                            return (
                              <React.Fragment key={index}>
                                <span 
                                  className={`px-2 py-1 ${userRole === 'Agent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} rounded-full text-xs font-medium flex items-center`}
                                  title={`Signed by ${displayWithRole}`}
                                >
                                  {displayWithRole}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              </React.Fragment>
                            );
                          })}
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
                          let displayName = 'Unknown User';
                          let isAgent = false;
                          
                          if (typeof pendingSignature === 'object' && pendingSignature !== null) {
                            // If it's an object with user info
                            displayName = pendingSignature.name || pendingSignature.username || 'Unknown User';
                            isAgent = pendingSignature.isAgent;
                          } else {
                            // If it's just an ID, try to match it with contract roles
                            const pendingId = pendingSignature?.toString();
                            
                            // For debugging
                            console.log('Pending ID to match:', pendingId);
                            
                            // First check if we have this user in our signatureUsers state
                            const userInfo = signatureUsers[pendingId];
                            if (userInfo) {
                              displayName = userInfo.name || userInfo.username || 'Unknown User';
                              isAgent = userInfo.isAgent || false;
                            } 
                            // If we don't have user info, try to match with contract roles
                            else if (contract.landlordId && contract.landlordId.toString() === pendingId) {
                              displayName = `${contract.landlordFirstname || ''} ${contract.landlordSurname || ''}`;
                              if (displayName.trim()) displayName += ' (Landlord)';
                              else displayName = 'Landlord';
                            } else if (contract.agentId && contract.agentId.toString() === pendingId) {
                              displayName = `${contract.agentFirstname || ''} ${contract.agentSurname || ''}`;
                              if (displayName.trim()) displayName += ' (Agent)';
                              else displayName = 'Agent';
                              isAgent = true;
                            } else if (contract.tenantId && contract.tenantId.toString() === pendingId) {
                              displayName = `${contract.tenantFirstname || ''} ${contract.tenantSurname || ''}`;
                              if (displayName.trim()) displayName += ' (Tenant)';
                              else displayName = 'Tenant';
                            } 
                            // If we still don't have a match, use contract role information based on the current user
                            else {
                              // For landlord contracts
                              if (currentUser?.isLandlord && contract.landlordFirstname && contract.landlordSurname) {
                                displayName = `${contract.landlordFirstname} ${contract.landlordSurname} (Landlord)`;
                              } 
                              // For agent contracts
                              else if (currentUser?.isAgent && contract.agentFirstname && contract.agentSurname) {
                                displayName = `${contract.agentFirstname} ${contract.agentSurname} (Agent)`;
                                isAgent = true;
                              }
                              // For tenant contracts
                              else if (contract.tenantFirstname && contract.tenantSurname) {
                                displayName = `${contract.tenantFirstname} ${contract.tenantSurname} (Tenant)`;
                              }
                              // If all else fails, use the first available role information
                              else if (contract.landlordFirstname && contract.landlordSurname) {
                                displayName = `${contract.landlordFirstname} ${contract.landlordSurname} (Landlord)`;
                              } else if (contract.agentFirstname && contract.agentSurname) {
                                displayName = `${contract.agentFirstname} ${contract.agentSurname} (Agent)`;
                                isAgent = true;
                              }
                            }
                          }
                          
                          return (
                            <React.Fragment key={index}>
                              <span 
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
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Agent signature section - for contracts with agent details but no agent in pendingSignatures */}
                    {(contract.agentId || contract.agentFirstname || contract.agentSurname) && 
                      // Check if agent is NOT in the signatures array
                      !(contract.signatures || []).some(sig => 
                        (typeof sig === 'object' && sig !== null && sig.isAgent) || 
                        (contract.agentId && (sig === contract.agentId || (sig.userId && sig.userId === contract.agentId)))
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
                  {contract.fullySignedAt && activeTab !== 'fullySigned' && (
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
                
                {activeTab === 'fullySigned' && (
                  <div className="mt-4 space-y-3">
                    {/* Contract Number */}
                    {contract.contractNumber && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600 font-medium">Contract Number:</span>
                        <span className="text-base font-semibold text-gray-800 mt-1 bg-green-50 p-2 rounded border border-green-100">
                          {contract.contractNumber}
                        </span>
                      </div>
                    )}
                    
                    {/* Fully Signed Date */}
                    {contract.fullySignedAt && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600 font-medium">Fully Signed On:</span>
                        <span className="text-sm text-gray-800 mt-1">
                          {new Date(contract.fullySignedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {/* Sent by information */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 font-medium">Sent by:</span>
                      {contract.userId ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center">
                          {contract.userId === currentUser?._id 
                            ? (currentUser?.name || currentUser?.username || 'You')
                            : (contract.senderName || 
                              (contract.userInfo && (contract.userInfo.name || contract.userInfo.username)) || 
                              'Unknown Sender')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Unknown sender</span>
                      )}
                    </div>
                    
                    {/* Signed by section */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 font-medium">Signed by:</span>
                      {contract.signatures && contract.signatures.length > 0 ? (
                        <>
                          {contract.signatures.map((signature, index) => {
                            // Variables to store signature information
                            let userId = '';
                            let displayName = 'Unknown User';
                            let userRole = '';
                            
                            // Check if signature is an object with user info or just an ID
                            if (typeof signature === 'object' && signature !== null) {
                              // If it's an object with user info
                              userId = signature.userId;
                              displayName = signature.name || signature.username || 'Unknown User';
                              if (signature.isAgent) {
                                userRole = 'Agent';
                              }
                            } else {
                              // If it's just an ID, try to match it with contract roles
                              const signatureId = signature?.toString();
                              
                              // If we have contract role information, use it
                              if (contract.landlordId === signatureId) {
                                displayName = `${contract.landlordFirstname || ''} ${contract.landlordSurname || ''}`;
                                userRole = 'Landlord';
                              } else if (contract.agentId === signatureId) {
                                displayName = `${contract.agentFirstname || ''} ${contract.agentSurname || ''}`;
                                userRole = 'Agent';
                              } else if (contract.tenantId === signatureId) {
                                displayName = `${contract.tenantFirstname || ''} ${contract.tenantSurname || ''}`;
                                userRole = 'Tenant';
                              }
                              
                              // Try to get additional info from signatureUsers if we have it
                              if (signatureId && signatureUsers[signatureId]) {
                                const userInfo = signatureUsers[signatureId];
                                if (userInfo) {
                                  displayName = userInfo.name || userInfo.username || 'Unknown User';
                                  if (userInfo.isAgent) {
                                    userRole = 'Agent';
                                  }
                                }
                              }
                            }
                            
                            // Try to get additional info from signatureUsers if we have it
                            if (userId && signatureUsers[userId]) {
                              const userInfo = signatureUsers[userId];
                              if (!displayName || displayName === 'Unknown User') {
                                displayName = userInfo.name || userInfo.username || displayName;
                              }
                              if (!userRole && userInfo.isAgent) {
                                userRole = 'Agent';
                              }
                            }
                                
                            // Clean up the display name
                            displayName = displayName.trim();
                            if (displayName === '' || displayName === ' ') displayName = 'Unknown User';
                            
                            // Add role if available, but avoid "Agent (Agent)" redundancy
                            let displayWithRole = displayName;
                            if (userRole && !(userRole === 'Agent' && displayName === 'Agent')) {
                              displayWithRole = `${displayName} (${userRole})`;
                            }
                            
                            // Special handling for agents - make sure we show their name
                            if (userRole === 'Agent' && displayName === 'Agent' && contract.agentFirstname && contract.agentSurname) {
                              displayWithRole = `${contract.agentFirstname} ${contract.agentSurname} (Agent)`;
                            }
                            
                            return (
                              <React.Fragment key={index}>
                                <span 
                                  className={`px-2 py-1 ${userRole === 'Agent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} rounded-full text-xs font-medium flex items-center`}
                                  title={`Signed by ${displayWithRole}`}
                                >
                                  {displayWithRole}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </> 
                      ) : (
                        <span className="text-sm text-gray-500 italic">No signatures available</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Created on:</span> {new Date(contract.createdAt).toLocaleString()}
                  </p>
                  {contract.fullySignedAt && activeTab !== 'fullySigned' && (
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
