import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const Contact = ({ listing, onClose, isAgentListing = false }) => {
  const [contactPerson, setContactPerson] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContactPerson = async () => {
      try {
        // If it's a real estate agent listing, use agent details
        if (listing.agent) {
          setContactPerson({
            username: listing.agent.name,
            email: listing.agent.email
          });
        } else {
          // Otherwise, fetch landlord details
          const res = await fetch(`/api/user/${listing.userRef}`);
          const data = await res.json();
          if (data.success === false) {
            setError('Could not fetch contact person details');
            return;
          }
          setContactPerson(data);
        }
      } catch (error) {
        console.error('Error fetching contact person:', error);
        setError('Could not fetch contact person details');
      }
    };

    fetchContactPerson();
    
    // Set default message with listing title
    if (isAgentListing) {
      setMessage(`Hi, I am interested in your "${listing.name}" I found on JustListItMarketplace. Please get back to me.`);
    }
  }, [listing, isAgentListing]);

  const onChange = (e) => {
    setMessage(e.target.value);
    setError(null); // Clear any previous errors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    setLoading(true);
    setError(null);
    
    try {
      if (isAgentListing) {
        // Send email to agent for agent listings
        const res = await fetch('/api/email/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contactPerson.email,
            subject: `Interest in "${listing.name}"`,
            message: `
              From: ${currentUser.username || currentUser.name || 'A user'} (${currentUser.email})
              
              Message:
              ${message.trim()}
              
              Property: ${listing.name}
              Location: ${listing.address}
              Price: $${listing.offer ? listing.discountPrice : listing.regularPrice}${listing.type === "rent" ? "/month" : ""}
              
              This message was sent via JustListIt Real Estate Marketplace.
            `,
          }),
        });

        const data = await res.json();
        if (data.success === false) {
          console.error('Server error:', data.message);
          setError(data.message || 'Failed to send message');
          return;
        }

        console.log('Email sent successfully:', data);
        toast.success("Message sent successfully!");

        // Clear the message
        setMessage('');
        
        // Close contact form if onClose is provided
        if (onClose) {
          onClose(true); // Pass true to indicate successful email sending
        }
      } else {
        // Use original messaging system for regular listings
        console.log('Sending message with user:', currentUser.id);
        
        // Start a new conversation with the initial message
        const res = await fetch('/api/messages/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            receiverId: listing.userRef,
            receiverModel: listing.agent ? 'Agent' : 'User',
            listingId: listing._id,
            initialMessage: message.trim()
          }),
        });

        const data = await res.json();
        if (data.success === false) {
          console.error('Server error:', data.message);
          setError(data.message || 'Failed to send message');
          return;
        }

        console.log('Message sent successfully:', data);

        // Clear the message
        setMessage('');
        
        // Close contact form if onClose is provided
        if (onClose) {
          onClose(false); // Pass false since we're not sending an email
        }
        
        // Navigate to messages page
        navigate('/messages');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center mt-4">
        <p className="mb-2">Please sign in to contact the landlord</p>
        <Link to="/sign-in" className="text-blue-700 hover:underline">
          Sign in here
        </Link>
      </div>
    );
  }

  return (
    <div>
      {contactPerson && (
        <div className="flex flex-col gap-2">
          <p>
            Contact <span className="font-semibold">{contactPerson.username}</span>{" "}
            for{" "}
            <span className="font-semibold">{listing.name.toLowerCase()}</span>
          </p>
          {error && (
            <div className="text-red-500 text-sm mb-2">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <textarea
              name="message"
              id="message"
              rows="4"
              value={message}
              onChange={onChange}
              placeholder="Enter your message here..."
              className="w-full border p-3 rounded-lg"
            ></textarea>
            <button
              type="submit"
              className="bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 p-3 w-full mt-2"
              disabled={loading || !message.trim()}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Contact;