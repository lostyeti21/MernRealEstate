import { useDispatch, useSelector } from 'react-redux';
import { signInStart, signInSuccess, signInFailure } from '../redux/user/userSlice';
import React, { useState } from 'react'; 
import { useNavigate } from "react-router-dom";
import OAuth from '../components/OAuth';

const SignIn = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [showPopup, setShowPopup] = useState(false); // State for the popup

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    console.log(formData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      dispatch(signInStart());
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      console.log(data);

      if (data.success === false) {
        dispatch(signInFailure(data.message));
        return;
      }

      dispatch(signInSuccess(data));
      navigate("/");

    } catch (error) {
      dispatch(signInFailure(error.message));
    }
  };

  const handleSignUpClick = () => {
    setShowPopup(true); // Show the popup when "Sign Up" is clicked
  };

  const handlePopupSelection = (selection) => {
    if (selection === "individual") {
      navigate("/sign-up"); // Redirect to SignUp page
    } else if (selection === "company") {
      navigate("/real-estate-sign-up"); // Redirect to the page for Real Estate Company
    }
    setShowPopup(false); // Close the popup
  };

  return (
    <div className='p-3 max-w-lg mx-auto'>
      <h1 className="text-3xl text-center font-semibold my-7">Sign In</h1>

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <input
          type='email'
          placeholder='Email'
          className='border p-3 rounded-lg'
          id="email"
          onChange={handleChange}
        />

        <input
          type='password'
          placeholder='Password'
          className='border p-3 rounded-lg'
          id="password"
          onChange={handleChange}
        />

        <button
          className='bg-slate-700 text-white p-3 rounded-lg uppercase hover:opacity-95 disabled:opacity-80'
          disabled={loading} 
        >
          {loading ? "Loading..." : "Sign In"}
        </button>
        <OAuth />
      </form>

      <div className='flex gap-2 mt-5'>
        <p>Don't have an account?</p>
        <button 
          onClick={handleSignUpClick} 
          className='text-blue-700 underline focus:outline-none'
        >
          Sign Up
        </button>
      </div>
      {error && <p className='text-red-500 m-0'>{error}</p>}

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-4">Are you an Individual Landlord or a Real Estate Company?</h2>
            <div className="flex justify-around">
              <button
                onClick={() => handlePopupSelection("individual")}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Individual Landlord
              </button>
              <button
                onClick={() => handlePopupSelection("company")}
                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
              >
                Real Estate Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
