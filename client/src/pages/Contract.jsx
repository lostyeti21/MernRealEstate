import { useState, useEffect, useRef } from 'react';
import { FaCheckCircle, FaFilePdf, FaPlus, FaSearch, FaTimes, FaSignature } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

export default function Contract() {
  const { currentUser } = useSelector(state => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const contractData = location.state || {};
  const isViewMode = !!contractData.contractUrl;
  const needsSignature = contractData.needsSignature || false;

  const [formData, setFormData] = useState({
    property: contractData.property || '',
    landlordFirstname: contractData.landlordFirstname || '',
    landlordSurname: contractData.landlordSurname || '',
    agentFirstname: contractData.agentFirstname || '',
    agentSurname: contractData.agentSurname || '',
    tenantFirstname: contractData.tenantFirstname || '',
    tenantSurname: contractData.tenantSurname || '',
    contract: null
  });
  
  const [contractFile, setContractFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [signingSuccess, setSigningSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [hasSigned, setHasSigned] = useState(false);
  const [fullContractData, setFullContractData] = useState(null);
  const [loadingContractData, setLoadingContractData] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(contractData.contractUrl || null);
  const [formErrors, setFormErrors] = useState({
    property: '',
    landlordFirstname: '',
    landlordSurname: '',
    agentFirstname: '',
    agentSurname: '',
    tenantFirstname: '',
    tenantSurname: '',
    contract: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const searchRef = useRef(null);
  const agentSearchRef = useRef(null);
  const tenantSearchRef = useRef(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAgentSearch, setShowAgentSearch] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [agentSearchResults, setAgentSearchResults] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showTenantSearch, setShowTenantSearch] = useState(false);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  const [tenantSearchResults, setTenantSearchResults] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Fetch full contract data if we have a contractId
  useEffect(() => {
    const fetchContractData = async () => {
      if (!contractData.contractId) return;
      
      try {
        setLoadingContractData(true);
        console.log('Fetching contract details for ID:', contractData.contractId);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/${contractData.contractId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch contract details');
        }
        
        const data = await response.json();
        console.log('Fetched contract details:', data);
        
        setFullContractData(data);
        setSignatures(data.signatures || []);
        setHasSigned(data.userHasSigned || false);
        
        // Update form data with any additional information from the server
        setFormData(prev => ({
          ...prev,
          property: data.property || prev.property,
          landlordFirstname: data.landlordFirstname || prev.landlordFirstname,
          landlordSurname: data.landlordSurname || prev.landlordSurname,
          agentFirstname: data.agentFirstname || prev.agentFirstname,
          agentSurname: data.agentSurname || prev.agentSurname,
          tenantFirstname: data.tenantFirstname || prev.tenantFirstname,
          tenantSurname: data.tenantSurname || prev.tenantSurname,
        }));
      } catch (err) {
        console.error('Error fetching contract details:', err);
        setError(err.message);
      } finally {
        setLoadingContractData(false);
      }
    };
    
    fetchContractData();
  }, [contractData.contractId]);

  useEffect(() => {
    // Close search dropdowns when clicking outside
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowUserSearch(false);
      }
      if (agentSearchRef.current && !agentSearchRef.current.contains(event.target)) {
        setShowAgentSearch(false);
      }
      if (tenantSearchRef.current && !tenantSearchRef.current.contains(event.target)) {
        setShowTenantSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isViewMode && contractData.contractId) {
      fetchContractSignatures();
    }
  }, [isViewMode, contractData.contractId]);

  const fetchContractSignatures = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/${contractData.contractId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contract signatures');
      }

      const data = await response.json();
      
      // If the contract has signatures, fetch user information for each signature
      if (data.contract.signatures && data.contract.signatures.length > 0) {
        const signaturePromises = data.contract.signatures.map(async (userId) => {
          try {
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/user/${userId}`, {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              return {
                userId,
                name: userData.username || 'Unknown User',
                signed: true
              };
            }
            return { userId, name: 'Unknown User', signed: true };
          } catch (error) {
            console.error('Error fetching user info:', error);
            return { userId, name: 'Unknown User', signed: true };
          }
        });
        
        const signatureDetails = await Promise.all(signaturePromises);
        setSignatures(signatureDetails);
        
        // Check if current user has already signed
        if (currentUser && data.contract.signatures.includes(currentUser._id)) {
          setHasSigned(true);
        }
      }
    } catch (error) {
      console.error('Error fetching contract signatures:', error);
    }
  };

  const searchUsers = async (term) => {
    try {
      setError(null);
      const queryParams = new URLSearchParams({
        searchTerm: term,
        limit: '10'
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/get-landlords?${queryParams}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      
      // The API returns { landlords: [...] }, so we use data.landlords
      const formattedData = data.landlords.map(user => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }));

      setSearchResults(formattedData);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      const delayDebounceFn = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      landlordFirstname: user.username.split(' ')[0] || '',
      landlordSurname: user.username.split(' ')[1] || ''
    }));
    setShowUserSearch(false);
    setSearchTerm('');
  };

  const searchAgents = async (term) => {
    try {
      setError(null);
      const queryParams = new URLSearchParams({
        searchTerm: term,
        limit: '10'
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/real-estate/company/agents`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to search agents');
      const data = await response.json();
      
      // Log the data structure to debug
      console.log('Agent data:', data);
      
      // Filter agents based on search term
      const filteredAgents = data.agents.filter(agent => {
        // Check if name or email exists before using them
        const agentName = agent.name || '';
        const agentEmail = agent.email || '';
        
        return agentName.toLowerCase().includes(term.toLowerCase()) ||
               agentEmail.toLowerCase().includes(term.toLowerCase());
      });
      
      // Format the filtered agents
      const formattedData = filteredAgents.map(agent => ({
        _id: agent._id,
        username: agent.name, // Use name instead of username
        email: agent.email || '',
        avatar: agent.avatar || ''
      }));

      setAgentSearchResults(formattedData);
    } catch (err) {
      console.error('Error searching agents:', err);
      setAgentSearchResults([]);
    }
  };

  useEffect(() => {
    if (agentSearchTerm) {
      const delayDebounceFn = setTimeout(() => {
        searchAgents(agentSearchTerm);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setAgentSearchResults([]);
    }
  }, [agentSearchTerm]);

  const handleAgentSelect = (user) => {
    setSelectedAgent(user);
    setFormData(prev => ({
      ...prev,
      agentFirstname: user.username.split(' ')[0] || '',
      agentSurname: user.username.split(' ')[1] || ''
    }));
    setShowAgentSearch(false);
    setAgentSearchTerm('');
  };

  const searchTenants = async (term) => {
    try {
      setError(null);
      const queryParams = new URLSearchParams({
        searchTerm: term,
        limit: '10'
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/get-tenants?${queryParams}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to search tenants');
      const data = await response.json();
      
      // Log the data structure to debug
      console.log('Tenant data:', data);
      
      // Filter tenants based on search term
      const filteredTenants = (data.tenants || []).filter(tenant => {
        const tenantName = tenant.username || '';
        const tenantEmail = tenant.email || '';
        
        return tenantName.toLowerCase().includes(term.toLowerCase()) ||
               tenantEmail.toLowerCase().includes(term.toLowerCase());
      });
      
      // Format the filtered tenant data
      const formattedData = filteredTenants.map(tenant => ({
        _id: tenant._id,
        username: tenant.username,
        email: tenant.email,
        avatar: tenant.avatar
      }));

      console.log('Filtered tenant results:', formattedData);
      setTenantSearchResults(formattedData);
    } catch (err) {
      console.error('Error searching tenants:', err);
      setTenantSearchResults([]);
    }
  };

  useEffect(() => {
    if (tenantSearchTerm) {
      const delayDebounceFn = setTimeout(() => {
        searchTenants(tenantSearchTerm);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setTenantSearchResults([]);
    }
  }, [tenantSearchTerm]);

  const handleTenantSelect = (user) => {
    setSelectedTenant(user);
    setFormData(prev => ({
      ...prev,
      tenantFirstname: user.username.split(' ')[0] || '',
      tenantSurname: user.username.split(' ')[1] || ''
    }));
    setShowTenantSearch(false);
    setTenantSearchTerm('');
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.property.trim()) {
      errors.property = 'Property is required';
    }
    const hasAgentDetails = formData.agentFirstname.trim() && formData.agentSurname.trim();
    const hasLandlordDetails = formData.landlordFirstname.trim() && formData.landlordSurname.trim();

    // Either landlord or agent details must be provided
    if (!hasLandlordDetails && !hasAgentDetails) {
      errors.landlordFirstname = 'Either Landlord or Agent details must be provided';
      errors.landlordSurname = 'Either Landlord or Agent details must be provided';
      errors.agentFirstname = 'Either Landlord or Agent details must be provided';
      errors.agentSurname = 'Either Landlord or Agent details must be provided';
    }

    // If agent details are provided, validate them
    if (formData.agentFirstname.trim() || formData.agentSurname.trim()) {
      if (!formData.agentFirstname.trim()) {
        errors.agentFirstname = 'Agent Firstname is required';
      }
      if (!formData.agentSurname.trim()) {
        errors.agentSurname = 'Agent Surname is required';
      }
    }

    // If landlord details are provided, validate them
    if (formData.landlordFirstname.trim() || formData.landlordSurname.trim()) {
      if (!formData.landlordFirstname.trim()) {
        errors.landlordFirstname = 'Landlord Firstname is required';
      }
      if (!formData.landlordSurname.trim()) {
        errors.landlordSurname = 'Landlord Surname is required';
      }
    }

    // Tenant details are always required
    if (!formData.tenantFirstname.trim()) {
      errors.tenantFirstname = 'Tenant Firstname is required';
    }
    if (!formData.tenantSurname.trim()) {
      errors.tenantSurname = 'Tenant Surname is required';
    }

    // Validate file
    if (!formData.contract) {
      errors.contract = 'Please select a PDF file';
    }

    setFormErrors(errors);
    const valid = Object.keys(errors).length === 0;
    setIsFormValid(valid);
    return valid;
  };

  useEffect(() => {
    validateForm();
  }, [formData, selectedFile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        contract: file
      }));
      // Create a preview URL for the selected file
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      setError(null);
      // Clear contract error
      setFormErrors(prev => ({
        ...prev,
        contract: ''
      }));
    } else {
      setError('Please upload a PDF file');
      setPreviewUrl(null);
      setFormData(prev => ({
        ...prev,
        contract: null
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    console.log('Property value:', formData.property);
    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const formDataToSend = new FormData();
      formDataToSend.append('contract', formData.contract);
      formDataToSend.append('property', formData.property);
      formDataToSend.append('landlordFirstname', formData.landlordFirstname);
      formDataToSend.append('landlordSurname', formData.landlordSurname);
      formDataToSend.append('agentFirstname', formData.agentFirstname);
      formDataToSend.append('agentSurname', formData.agentSurname);
      formDataToSend.append('tenantFirstname', formData.tenantFirstname);
      formDataToSend.append('tenantSurname', formData.tenantSurname);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload contract');
      }

      const data = await response.json();
      setPreviewUrl(data.contractUrl);
      setShowSuccessPopup(true);
      setUploadSuccess(true);

      // Reset form except for success state and preview
      setFormData({
        property: '',
        landlordFirstname: '',
        landlordSurname: '',
        agentFirstname: '',
        agentSurname: '',
        tenantFirstname: '',
        tenantSurname: '',
        contract: null
      });
      setFormErrors({});

    } catch (err) {
      setError(err.message);
      console.error('Upload error:', err);
      setUploadSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePopup = () => {
    setShowSuccessPopup(false);
  };

  // Function to sign a contract
  const handleSignContract = async () => {
    if (!agreed) {
      setError('You must agree to the contract terms before signing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the contractId from fullContractData if available, otherwise fall back to contractData
      const contractIdToUse = fullContractData?._id || contractData.contractId;

      // Debug information
      console.log('Contract data being sent:', {
        contractId: contractIdToUse,
        currentUser: currentUser,
        agreed: agreed,
        fullContractData: fullContractData ? {
          _id: fullContractData._id,
          pendingSignatures: fullContractData.pendingSignaturesArray,
          userNeedsToSign: fullContractData.userNeedsToSign
        } : null
      });

      if (!contractIdToUse) {
        throw new Error('Contract ID is missing');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contracts/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          contractId: contractIdToUse,
          agreed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sign contract');
      }

      const data = await response.json();
      setSigningSuccess(true);
      
      // Add the current user's signature
      const newSignature = {
        userId: currentUser._id,
        name: currentUser.name || currentUser.username || 'You',
        username: currentUser.username || '',
        avatar: currentUser.avatar || '',
        isAgent: currentUser.isAgent || false,
        signedAt: new Date()
      };
      
      setSignatures(prev => [...prev, newSignature]);
      setHasSigned(true);
      setShowSuccessPopup(true);
      toast.success('Contract signed successfully!');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Contract Upload</h2>
      
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          
          {/* Popup content with glassmorphism */}
          <div className="relative bg-white/70 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20 w-96 flex flex-col items-center transform transition-all">
            {/* Large green tick icon */}
            <div className="mb-6 text-green-500">
              <FaCheckCircle className="text-6xl animate-bounce" />
            </div>
            
            {/* Success message */}
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              {signingSuccess 
                ? 'You have successfully signed the contract!' 
                : 'You have successfully sent the contract!'}
            </h3>
            
            {/* Signatures */}
            {signatures.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Signatures:</h4>
                <ul>
                  {signatures.map((signature, index) => (
                    <li key={index} className="flex items-center gap-2 mb-1">
                      <FaSignature className="text-blue-500" />
                      <span className="text-gray-600">{signature.name}</span>
                      <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                        Signed
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* OK button */}
            <button
              onClick={() => {
                handleClosePopup();
                if (signingSuccess) {
                  window.location.href = '/signing-contracts';
                } else {
                  window.location.href = '/sentcontracts';
                }
              }}
              className="px-8 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 font-medium"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 mb-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
            <FaCheckCircle className="text-green-500 text-xl" />
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-600 hover:underline"
            >
              Contract uploaded successfully. Click here to view.
            </a>
          </div>
        </div>
      )}
      {!uploadSuccess && previewUrl && (
        <div className="mt-4 mb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
            <FaFilePdf className="text-red-500 text-xl" />
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-600 hover:underline"
            >
              View Contract
            </a>
          </div>
        </div>
      )}
      {!uploadSuccess && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <form className="space-y-4">
              {/* Property Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="property"
                  value={formData.property}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.property ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-100' : ''}`}
                  placeholder="Enter property address or name"
                  readOnly={isViewMode}
                />
                {formErrors.property && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.property}</p>
                )}
              </div>

              {/* Landlord Details */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">
                    Landlord Details
                    {!formData.agentFirstname && !formData.agentSurname && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowUserSearch(prev => !prev)}
                    className={`text-blue-600 hover:text-blue-700 ${isViewMode ? 'hidden' : ''}`}
                  >
                    <FaPlus className="text-xl" />
                  </button>
                </div>

                {selectedUser && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 p-2 rounded">
                    <img
                      src={selectedUser.avatar || 'https://via.placeholder.com/40'}
                      alt={selectedUser.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="flex-1">{selectedUser.username}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                {showUserSearch && (
                  <div 
                    ref={searchRef}
                    className="absolute z-10 w-full bg-white border rounded-lg shadow-lg p-4 mt-1"
                  >
                    <div className="flex items-center gap-2 border rounded p-2 mb-2">
                      <FaSearch className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <div
                          key={user._id}
                          onClick={() => handleUserSelect(user)}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <img
                            src={user.avatar || 'https://via.placeholder.com/40'}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      ))}
                      {searchTerm && searchResults.length === 0 && (
                        <div className="text-center text-gray-500 py-2">
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Landlord Firstname
                      {!formData.agentFirstname && !formData.agentSurname && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="landlordFirstname"
                      value={formData.landlordFirstname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.landlordFirstname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.landlordFirstname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.landlordFirstname}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Landlord Surname
                      {!formData.agentFirstname && !formData.agentSurname && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="landlordSurname"
                      value={formData.landlordSurname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.landlordSurname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.landlordSurname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.landlordSurname}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">
                    Agent Details
                    {!formData.landlordFirstname && !formData.landlordSurname && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAgentSearch(prev => !prev)}
                    className={`text-blue-600 hover:text-blue-700 ${isViewMode ? 'hidden' : ''}`}
                  >
                    <FaPlus className="text-xl" />
                  </button>
                </div>

                {selectedAgent && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 p-2 rounded">
                    <img
                      src={selectedAgent.avatar || 'https://via.placeholder.com/40'}
                      alt={selectedAgent.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="flex-1">{selectedAgent.username}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAgent(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                {showAgentSearch && (
                  <div 
                    ref={agentSearchRef}
                    className="absolute z-10 w-full bg-white border rounded-lg shadow-lg p-4 mt-1"
                  >
                    <div className="flex items-center gap-2 border rounded p-2 mb-2">
                      <FaSearch className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search agents..."
                        value={agentSearchTerm}
                        onChange={(e) => setAgentSearchTerm(e.target.value)}
                        className="flex-1 outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {agentSearchResults.map(user => (
                        <div
                          key={user._id}
                          onClick={() => handleAgentSelect(user)}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <img
                            src={user.avatar || 'https://via.placeholder.com/40'}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      ))}
                      {agentSearchTerm && agentSearchResults.length === 0 && (
                        <div className="text-center text-gray-500 py-2">
                          No agents found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Firstname
                      {!formData.landlordFirstname && !formData.landlordSurname && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="agentFirstname"
                      value={formData.agentFirstname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.agentFirstname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.agentFirstname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.agentFirstname}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Surname
                      {!formData.landlordFirstname && !formData.landlordSurname && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="agentSurname"
                      value={formData.agentSurname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.agentSurname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.agentSurname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.agentSurname}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tenant Details */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">Tenant Details</h3>
                  <button
                    type="button"
                    onClick={() => setShowTenantSearch(prev => !prev)}
                    className={`text-blue-600 hover:text-blue-700 ${isViewMode ? 'hidden' : ''}`}
                  >
                    <FaPlus className="text-xl" />
                  </button>
                </div>

                {selectedTenant && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 p-2 rounded">
                    <img
                      src={selectedTenant.avatar || 'https://via.placeholder.com/40'}
                      alt={selectedTenant.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="flex-1">{selectedTenant.username}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTenant(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                {showTenantSearch && (
                  <div 
                    ref={tenantSearchRef}
                    className="absolute z-10 w-full bg-white border rounded-lg shadow-lg p-4 mt-1"
                  >
                    <div className="flex items-center gap-2 border rounded p-2 mb-2">
                      <FaSearch className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tenants..."
                        value={tenantSearchTerm}
                        onChange={(e) => setTenantSearchTerm(e.target.value)}
                        className="flex-1 outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {tenantSearchResults.map(user => (
                        <div
                          key={user._id}
                          onClick={() => handleTenantSelect(user)}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <img
                            src={user.avatar || 'https://via.placeholder.com/40'}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      ))}
                      {tenantSearchTerm && tenantSearchResults.length === 0 && (
                        <div className="text-center text-gray-500 py-2">
                          No tenants found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Firstname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tenantFirstname"
                      value={formData.tenantFirstname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.tenantFirstname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.tenantFirstname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.tenantFirstname}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tenantSurname"
                      value={formData.tenantSurname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.tenantSurname ? 'border-red-500' : 'border-gray-300'
                      } ${isViewMode ? 'bg-gray-100' : ''}`}
                      readOnly={isViewMode}
                    />
                    {formErrors.tenantSurname && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.tenantSurname}</p>
                    )}
                  </div>
                </div>
              </div>

              {!isViewMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract (PDF) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full mb-2"
                    />
                    {formErrors.contract && (
                      <p className="text-red-500 text-sm mb-2">{formErrors.contract}</p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleUpload}
                    className={`w-full px-4 py-2 text-white rounded ${
                      loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Uploading...' : 'Upload Contract'}
                  </button>
                </>
              )}

              {isViewMode && needsSignature && (
                <>
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-2">Contract Signature Required</h3>
                    <p className="text-gray-600 mb-4">Please review the contract carefully before signing.</p>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="contract-agreement"
                        name="agreed"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <label htmlFor="contract-agreement" className="text-sm text-gray-700 font-medium">
                        I hereby agree to the contents of the contract
                      </label>
                    </div>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                        {error}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      disabled={loading || !agreed}
                      onClick={handleSignContract}
                      className={`w-full px-4 py-2 text-white rounded ${
                        loading || !agreed
                          ? 'bg-red-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {loading ? 'Signing...' : 'Sign Contract'}
                    </button>
                  </div>
                </>
              )}
            </form>

          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Contract Preview</h3>
            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              {(previewUrl || contractData.contractUrl) ? (
                <embed
                  src={previewUrl || contractData.contractUrl}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">No PDF selected for preview</p>
                </div>
              )}
            </div>
            {hasSigned && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-lg font-medium mb-2">Signed by:</h4>
                <ul>
                  {signatures.map((signature, index) => {
                    // Determine the display name and role
                    let displayName = 'Unknown User';
                    let isAgent = false;
                    
                    if (typeof signature === 'object' && signature !== null) {
                      displayName = signature.name || signature.username || 'Unknown User';
                      isAgent = signature.isAgent || false;
                      
                      // If it's the current user, show "You"
                      if (signature.userId === currentUser?._id) {
                        displayName = 'You';
                      }
                    } else if (typeof signature === 'string') {
                      // For string signatures (legacy format)
                      if (signature === currentUser?._id) {
                        displayName = 'You';
                      } else if (fullContractData) {
                        // Try to match with contract roles
                        if (fullContractData.agentId === signature) {
                          displayName = `${fullContractData.agentFirstname || ''} ${fullContractData.agentSurname || ''}`;
                          isAgent = true;
                        } else if (fullContractData.landlordId === signature) {
                          displayName = `${fullContractData.landlordFirstname || ''} ${fullContractData.landlordSurname || ''}`;
                        } else if (fullContractData.tenantId === signature) {
                          displayName = `${fullContractData.tenantFirstname || ''} ${fullContractData.tenantSurname || ''}`;
                        }
                      }
                    }
                    
                    return (
                      <li key={index} className="flex items-center gap-2 mb-1">
                        <FaSignature className={isAgent ? "text-purple-500" : "text-blue-500"} />
                        <span className="text-gray-600">{displayName}</span>
                        {isAgent && (
                          <span className="bg-purple-500 text-white rounded-full px-2 py-1 text-xs">
                            Agent
                          </span>
                        )}
                        <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                          Signed
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
