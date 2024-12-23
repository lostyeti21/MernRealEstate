import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Contact = ({ listing }) => {
  const [contactPerson, setContactPerson] = useState(null);
  const [message, setMessage] = useState("");

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
            return;
          }
          setContactPerson(data);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchContactPerson();
  }, [listing.userRef, listing.agent]);

  const onChange = (e) => {
    setMessage(e.target.value);
  };

  return (
    <div>
      {contactPerson && (
        <div className="flex flex-col gap-2">
          <p>
            Contact <span className="font-semibold">{contactPerson.username}</span>{" "}
            for{" "}
            <span className="font-semibold">{listing.name.toLowerCase()}</span>
          </p>
          <textarea
            name="message"
            id="message"
            rows="2"
            value={message}
            onChange={onChange}
            placeholder="Enter your message here..."
            className="w-full border p-3 rounded-lg"
          ></textarea>

          <Link
            to={`mailto:${contactPerson.email}?subject=Regarding ${listing.name}&body=${message}`}
            className="bg-slate-700 text-white text-center p-3 uppercase rounded-lg hover:opacity-95"
          >
            {listing.agent ? 'Send Email to Real Estate Agent' : 'Send Message'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default Contact;