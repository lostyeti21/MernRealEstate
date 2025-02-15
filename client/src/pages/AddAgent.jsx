import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AddAgent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, isRealEstateCompany } = useSelector((state) => state.user);

  // Check authentication on mount
  useEffect(() => {
    // Check authentication on mount
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('realEstateToken');
    const companyData = localStorage.getItem('realEstateCompany');
    
    if (!token || !companyData) {
      console.error('No authentication token or company data found');
      navigate('/real-estate-login', { replace: true });
      return;
    }

    try {
      // Verify the token and company data are valid
      const parsedCompanyData = JSON.parse(companyData);
      if (!parsedCompanyData._id) {
        throw new Error('Invalid company data');
      }
    } catch (error) {
      console.error('Error parsing company data:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('realEstateToken');
      localStorage.removeItem('realEstateCompany');
      navigate('/real-estate-login', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Validate all required fields
      if (!formData.name || !formData.email || !formData.contact || !formData.password) {
        setError('All fields are required');
        return;
      }
      
      // Get token from multiple sources
      const token = localStorage.getItem('access_token') || 
                    localStorage.getItem('realEstateToken');
      const companyData = JSON.parse(localStorage.getItem('realEstateCompany'));
      
      if (!token || !companyData) {
        setError('Authentication failed. Please login again.');
        navigate('/real-estate-login');
        return;
      }

      // Comprehensive logging for debugging
      console.group('Add Agent Request');
      console.log('Token:', token);
      console.log('Company ID:', companyData._id);
      console.log('Agent Data:', {
        name: formData.name,
        email: formData.email,
        contact: formData.contact
      });
      console.groupEnd();

      const res = await fetch('/api/real-estate/add-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Debug-Token': token  // Additional debugging header
        },
        body: JSON.stringify({
          companyId: companyData._id,
          agent: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            contact: formData.contact
          }
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Response parsing error:', parseError);
        const rawText = await res.text();
        console.error('Raw server response:', rawText);
        throw new Error('Failed to parse server response');
      }

      // Detailed error handling
      if (!res.ok) {
        console.error('Server error response:', data);
        throw new Error(data.message || 'Failed to add agent');
      }

      if (data.success === false) {
        throw new Error(data.message || 'Agent creation unsuccessful');
      }

      // Verify agent was actually created
      if (!data.agent) {
        throw new Error('No agent data returned from server');
      }

      // Update company data in localStorage with new agent
      const updatedCompanyData = {
        ...companyData,
        agents: [...(companyData.agents || []), data.agent]
      };
      localStorage.setItem('realEstateCompany', JSON.stringify(updatedCompanyData));

      // Show success message
      alert('Agent added successfully!');
      navigate('/real-estate-dashboard');
    } catch (error) {
      console.error('Complete error adding agent:', error);
      setError(error.message || 'Failed to add agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-3xl font-semibold text-center mb-8">Add New Agent</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number
          </label>
          <input
            type="text"
            id="contact"
            value={formData.contact}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Adding Agent...
            </>
          ) : (
            'Add Agent'
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/real-estate-dashboard')}
          className="text-gray-600 hover:text-gray-800 text-center"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
