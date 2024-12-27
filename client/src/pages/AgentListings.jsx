import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import ListingItem from '../components/ListingItem';

const AgentListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { agentId } = useParams();
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchAgentListings = async () => {
      try {
        setLoading(true);
        console.log('Fetching listings for agent:', agentId);

        const res = await fetch(`/api/listing/agent/${agentId}`);
        const data = await res.json();

        if (data.success === false) {
          setError(data.message);
          return;
        }

        console.log('Received listings:', data);
        setListings(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setError('Error fetching listings');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentListings();
  }, [agentId]);

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-3 max-w-4xl mx-auto'>
        <p className='text-red-700 text-center my-7'>{error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className='p-3 max-w-4xl mx-auto'>
        <p className='text-xl text-slate-700 text-center my-7'>No listings found for this agent</p>
      </div>
    );
  }

  return (
    <div className='p-3 max-w-6xl mx-auto'>
      <h1 className='text-3xl font-semibold text-center my-7'>Agent Listings</h1>
      
      <div className='flex flex-wrap gap-4'>
        {listings.map((listing) => (
          <ListingItem key={listing._id} listing={listing} />
        ))}
      </div>
    </div>
  );
};

export default AgentListings;
